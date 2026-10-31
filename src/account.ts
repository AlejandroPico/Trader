import { appConfig } from "./config";
import { fresh, validateState, Workspace } from "./state";
import { reconcileWorkspace } from "./workspace-merge";
import type { User, Auth, OAuthCredential } from "firebase/auth";
import type { Firestore, Unsubscribe } from "firebase/firestore";

/** Official Google authentication and automatic, per-account workspace storage. */
export class Cloud {
  user: User | null = null;
  status = "";
  error = "";
  busy = false;
  profile = "principal";
  profiles: { id: string; name: string }[] = [];
  readonly configured = !!appConfig.firebase?.projectId;
  private auth?: Auth;
  private db?: Firestore;
  private authSdk?: typeof import("firebase/auth");
  private storeSdk?: typeof import("firebase/firestore");
  private start?: Promise<void>;
  private unsubscribe?: Unsubscribe;
  private profilesUnsubscribe?: Unsubscribe;
  private authUnsubscribe?: Unsubscribe;
  private timer?: ReturnType<typeof setTimeout>;
  private pending = "";
  private ready = false;
  private writing = false;
  private generation = 0;
  private writer = crypto.randomUUID();
  private readLocal = () => fresh();
  private applyRemote = (_workspace: Workspace) => {};
  private changed = () => {};
  private loginOnly = false;
  private baseline?: Workspace;
  get available() {
    return !!this.auth;
  }
  get syncReady() {
    return this.ready;
  }
  private dirtyKey() {
    return `trader.pending.${this.user!.uid}.${this.profile}`;
  }
  private preservePending() {
    localStorage.setItem(
      this.dirtyKey(),
      JSON.stringify({ baseline: this.baseline, workspace: this.pending }),
    );
  }

  initialize(
    read: () => Workspace,
    apply: (workspace: Workspace) => void,
    changed: () => void,
    loginOnly = false,
  ) {
    this.readLocal = read;
    this.applyRemote = apply;
    this.changed = changed;
    this.loginOnly = loginOnly;
    if (this.configured) void this.sdk().catch((error) => this.fail(error));
  }
  private sdk() {
    return (this.start ??= (async () => {
      if (!this.configured)
        throw new Error(
          "El propietario todavía no ha activado el acceso con Google.",
        );
      const [app, auth, store] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);
      const instance =
        app.getApps()[0] ?? app.initializeApp(appConfig.firebase!);
      this.authSdk = auth;
      this.storeSdk = store;
      this.auth = auth.getAuth(instance);
      try {
        this.db = store.initializeFirestore(instance, {
          localCache: store.persistentLocalCache({
            tabManager: store.persistentMultipleTabManager(),
          }),
        });
      } catch {
        this.db = store.getFirestore(instance);
      }
      this.authUnsubscribe = auth.onAuthStateChanged(this.auth, (user) => {
        void this.session(user);
      });
      await this.auth.authStateReady();
    })());
  }
  private async session(user: User | null, preserve = false) {
    const generation = ++this.generation;
    this.unsubscribe?.();
    this.profilesUnsubscribe?.();
    clearTimeout(this.timer);
    this.ready = false;
    this.writing = false;
    if (!preserve) this.pending = "";
    this.error = "";
    this.user = user;
    this.status = user ? "Recuperando espacio…" : "";
    this.changed();
    if (!preserve) this.baseline = structuredClone(this.readLocal());
    if (!user || this.loginOnly) return;
    try {
      const sdk = this.storeSdk!;
      const settings = await sdk.getDocFromServer(
        sdk.doc(this.db!, "users", user.uid, "settings", "workspace"),
      );
      if (generation !== this.generation) return;
      const profile = settings.data()?.["activeProfile"];
      this.profilesUnsubscribe = sdk.onSnapshot(
        sdk.collection(this.db!, "users", user.uid, "profiles"),
        (snapshot) => {
          this.profiles = snapshot.docs
            .map((d) => ({
              id: d.id,
              name: String(d.data()["name"] || "Principal"),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          this.changed();
        },
        (error) => this.fail(error),
      );
      await this.openProfile(
        typeof profile === "string" && /^[\w-]{1,80}$/.test(profile)
          ? profile
          : "principal",
      );
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    }
  }
  private profileRef(id = this.profile) {
    return this.storeSdk!.doc(
      this.db!,
      "users",
      this.user!.uid,
      "profiles",
      id,
    );
  }
  private serialize(workspace: Workspace) {
    const value = JSON.stringify({ ...workspace, api: "" });
    if (new TextEncoder().encode(value).length > 900000)
      throw new Error(
        "El perfil supera el tamaño permitido. Exporta una copia y reduce los trazados o utiliza otro perfil.",
      );
    return value;
  }
  private deserialize(value: string) {
    return validateState({ ...JSON.parse(value), api: fresh().api });
  }
  private async openProfile(id: string) {
    const generation = this.generation;
    this.ready = false;
    this.unsubscribe?.();
    if (!this.pending) this.baseline = structuredClone(this.readLocal());
    this.profile = id;
    if (!this.pending) {
      try {
        const saved = JSON.parse(
          localStorage.getItem(this.dirtyKey()) || "null",
        );
        if (saved?.workspace) {
          this.deserialize(saved.workspace);
          this.pending = saved.workspace;
          this.baseline = validateState(saved.baseline);
        }
      } catch {
        /* A malformed pending snapshot never replaces a valid server workspace. */
      }
    }
    const sdk = this.storeSdk!,
      ref = this.profileRef();
    const snapshot = await sdk.getDocFromServer(ref);
    if (generation !== this.generation) return;
    if (snapshot.exists()) {
      const remote = this.deserialize(snapshot.data()["workspace"]);
      const value =
        this.pending && this.baseline
          ? reconcileWorkspace(
              remote,
              this.baseline,
              this.deserialize(this.pending),
            )
          : remote;
      this.applyRemote(value);
      this.baseline = structuredClone(remote);
      if (this.pending) this.pending = this.serialize(value);
    } else
      await sdk.setDoc(ref, {
        name: id === "principal" ? "Principal" : "Perfil",
        workspace: this.serialize(this.readLocal()),
        writer: this.writer,
        updatedAt: sdk.serverTimestamp(),
      });
    if (generation !== this.generation) return;
    this.ready = true;
    if (this.pending) void this.flush().catch((error) => this.fail(error));
    this.unsubscribe = sdk.onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (
          !snapshot.exists() ||
          snapshot.metadata.hasPendingWrites ||
          this.pending ||
          this.writing
        )
          return;
        try {
          if (snapshot.data()["writer"] !== this.writer) {
            const value = this.deserialize(snapshot.data()["workspace"]);
            this.baseline = structuredClone(value);
            this.applyRemote(value);
          }
          this.status = snapshot.metadata.fromCache
            ? "Guardado en este equipo"
            : "Sincronizado";
          this.error = "";
          this.changed();
        } catch (error) {
          this.fail(error);
        }
      },
      (error) => this.fail(error),
    );
    this.status =
      this.pending || this.writing ? "Sincronizando…" : "Sincronizado";
    this.changed();
  }
  schedule(workspace: Workspace) {
    if (!this.user || this.loginOnly) return;
    try {
      this.pending = this.serialize(workspace);
      this.status = "Sincronizando…";
      this.changed();
      this.preservePending();
      if (!this.ready) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        void this.flush().catch((error) => this.fail(error));
      }, 800);
    } catch (error) {
      this.fail(error);
    }
  }
  private async flush() {
    if (!this.pending || this.writing || !this.ready) return;
    const data = this.pending,
      generation = this.generation;
    this.pending = "";
    this.writing = true;
    try {
      await this.storeSdk!.updateDoc(this.profileRef(), {
        workspace: data,
        writer: this.writer,
        updatedAt: this.storeSdk!.serverTimestamp(),
      });
      if (generation === this.generation) {
        this.baseline = this.deserialize(data);
        if (this.pending) this.preservePending();
        else localStorage.removeItem(this.dirtyKey());
        this.status = this.pending ? "Sincronizando…" : "Sincronizado";
        this.error = "";
      }
    } catch (error) {
      if (generation === this.generation && !this.pending) this.pending = data;
      throw error;
    } finally {
      if (generation === this.generation) this.writing = false;
      this.changed();
    }
    if (this.pending && generation === this.generation) await this.flush();
  }
  async signInGoogle(): Promise<OAuthCredential | null> {
    await this.sdk();
    this.busy = true;
    this.error = "";
    this.changed();
    try {
      const provider = new this.authSdk!.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await this.authSdk!.signInWithPopup(this.auth!, provider);
      return this.authSdk!.GoogleAuthProvider.credentialFromResult(result);
    } catch (error) {
      this.fail(error);
      throw error;
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  async acceptGoogleCredential(value: {
    idToken: string;
    accessToken?: string;
  }) {
    await this.sdk();
    await this.authSdk!.signInWithCredential(
      this.auth!,
      this.authSdk!.GoogleAuthProvider.credential(
        value.idToken,
        value.accessToken,
      ),
    );
  }
  async switchProfile(id: string) {
    if (this.busy || !this.user || !this.profiles.some((p) => p.id === id))
      return;
    this.busy = true;
    this.changed();
    try {
      await this.flush();
      if (this.writing || this.pending)
        throw new Error("Espera a que terminen de sincronizarse los cambios.");
      await this.openProfile(id);
      await this.storeSdk!.setDoc(
        this.storeSdk!.doc(
          this.db!,
          "users",
          this.user!.uid,
          "settings",
          "workspace",
        ),
        { activeProfile: id },
      );
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  async createProfile(name: string) {
    name = name.trim();
    if (!name || name.length > 80 || !this.user || this.busy || !this.ready)
      return;
    this.busy = true;
    this.changed();
    try {
      const id = crypto.randomUUID();
      await this.storeSdk!.setDoc(this.profileRef(id), {
        name,
        workspace: this.serialize(this.readLocal()),
        writer: this.writer,
        updatedAt: this.storeSdk!.serverTimestamp(),
      });
      this.profiles = [...this.profiles, { id, name }];
      this.busy = false;
      await this.switchProfile(id);
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  async signOut() {
    try {
      await Promise.race([
        this.flush(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch (error) {
      this.fail(error);
    }
    await this.authSdk!.signOut(this.auth!);
  }
  retry() {
    if (this.ready && this.pending)
      void this.flush().catch((error) => this.fail(error));
    else if (this.user) void this.session(this.user, true);
  }
  private fail(error: unknown) {
    const code = (error as { code?: string })?.code ?? "";
    this.error = code.includes("popup-closed")
      ? "Se ha cerrado el acceso con Google."
      : code.includes("unauthorized-domain")
        ? "El propietario debe activar el acceso en esta dirección."
        : code.includes("permission-denied")
          ? "La cuenta no tiene acceso a su espacio. El propietario debe revisar la configuración del servicio."
          : "No se ha podido conectar con la cuenta. La sincronización está pendiente.";
    this.status = "Sin sincronizar";
    this.changed();
  }
  destroy() {
    clearTimeout(this.timer);
    this.unsubscribe?.();
    this.profilesUnsubscribe?.();
    this.authUnsubscribe?.();
  }
}
