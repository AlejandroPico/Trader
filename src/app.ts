import {
  Component,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IconComponent } from "./icon";
import { PriceChart, MarketVisual } from "./chart";
import {
  Candle,
  rsi,
  parseCsv,
  csv,
  compareReturns,
  quoteIsFresh,
} from "./analysis";
import {
  Asset,
  ASSETS,
  COUNTRIES,
  Quote,
  Series,
  quoteFrom,
  fetchSeries,
  fetchQuote,
  requestJson,
} from "./market";
import {
  Workspace,
  Tab,
  View,
  newTab,
  fresh,
  validateState,
  Drawing,
  VIEW_DEFAULTS,
} from "./state";
import { Cloud } from "./account";
import { DialogFocus } from "./dialog";
import { desktopApi } from "./desktop-client";
import { ResearchPanel } from "./research";
import { WORLD_COUNTRIES } from "./geography";
import { CryptoStream } from "./crypto-stream";
@Component({
  selector: "trader-app",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    PriceChart,
    MarketVisual,
    DialogFocus,
    ResearchPanel,
  ],
  templateUrl: "./app.html",
})
export class AppComponent implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private loginToken =
    new URLSearchParams(location.search).get("desktop-login") ?? "";
  loginWindow = !!this.loginToken;
  loginDone = false;
  private windowId =
    new URLSearchParams(location.search).get("workspace") ?? "principal";
  private storageKey =
    "trader.workspace.v1" +
    (this.windowId === "principal" ? "" : ":" + this.windowId);
  @ViewChild(PriceChart) chart?: PriceChart;
  @ViewChild(ResearchPanel) research?: ResearchPanel;
  ws: Workspace = fresh();
  quotes: Record<string, Quote> = {};
  series?: Series;
  comparison: Candle[] = [];
  loading = false;
  refreshing = false;
  error = "";
  toast = "";
  searchOpen = false;
  search = "";
  remoteResults: Asset[] = [];
  settings = false;
  about = false;
  accountOpen = false;
  profileName = "";
  marketView: "table" | "map" = "table";
  heatUniverse = "Acciones";
  heatSize: "uniform" | "volume" = "uniform";
  quoteErrors: Record<string, string> = {};
  private seriesKey = "";
  private previousUser = "";
  private classifications: Record<
    string,
    { sector?: string; industry?: string }
  > = {};
  private classificationBusy = false;
  indicatorPanel = false;
  mobileMenu = false;
  tool = "cursor";
  measurement = "";
  country = "Todos";
  category = "Todos";
  sector = "Todos";
  minChange = "";
  maxChange = "";
  minPrice = "";
  tableQuery = "";
  sortKey = "symbol";
  sortDir = 1;
  searchBusy = false;
  DateNow = Date.now();
  countries = [...new Set([...WORLD_COUNTRIES, ...COUNTRIES])].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  types = ["Todos", "Acciones", "Índices", "Cripto", "Divisas", "Futuros"];
  indicators = ["SMA 20", "EMA 50", "Bollinger", "RSI 14"];
  cloud = new Cloud();
  storageWarning = "";
  positionSymbol = "AAPL";
  quantity = 1;
  cost: number | null = null;
  alertSymbol = "AAPL";
  alertPrice: number | null = null;
  alertDirection = "above";
  portfolioCurrency = "USD";
  importData?: Series;
  private cache = new Map<string, Series>();
  private pending = new Map<string, Promise<Series>>();
  private quotePending = new Map<string, Promise<Quote>>();
  private cryptoStream = new CryptoStream(
    (symbol, interval, candle, timestamp) =>
      this.receiveCrypto(symbol, interval, candle, timestamp),
  );
  private csvSessions = new Map<string, Series>();
  private dataVersion = 0;
  private syncTimer?: ReturnType<typeof setInterval>;
  nativeSyncBusy = false;
  get nativeDesktop() {
    return !!desktopApi();
  }
  private request = 0;
  private poll?: ReturnType<typeof setInterval>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private refreshBusy = false;
  private refreshAgain = false;
  private onKey = (e: KeyboardEvent) => this.key(e);
  private installPrompt: any;
  nav: { view: View; label: string; icon: string }[] = [
    { view: "overview", label: "Vista general", icon: "home" },
    { view: "chart", label: "Gráfico", icon: "chart" },
    { view: "markets", label: "Mercados", icon: "globe" },
    { view: "heatmap", label: "Mapa de calor", icon: "heat" },
    { view: "screener", label: "Analizador", icon: "filter" },
    { view: "portfolio", label: "Cartera", icon: "wallet" },
    { view: "alerts", label: "Alertas", icon: "bell" },
    { view: "news", label: "Noticias", icon: "news" },
    { view: "rates", label: "Rendimientos", icon: "trend" },
    { view: "macro", label: "Mapa macro", icon: "globe" },
    { view: "calendar", label: "Agenda", icon: "calendar" },
  ];
  constructor() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) this.ws = validateState(JSON.parse(raw));
    } catch {
      this.storageWarning =
        "No se pudo recuperar el espacio guardado. Puedes importar una copia.";
    }
    this.restorePreferences();
    this.save(false);
    this.applyTheme();
    if (this.loginWindow) history.replaceState(null, "", location.pathname);
    else {
      void this.load();
      void this.refreshQuotes();
      if (this.active.view === "heatmap") void this.loadClassifications();
    }
    this.cloud.initialize(
      () => this.ws,
      (workspace) => this.receiveWorkspace(workspace),
      () => this.accountChanged(),
      this.loginWindow,
    );
    document.addEventListener("keydown", this.onKey);
    window.addEventListener("beforeinstallprompt", this.installListener);
    this.poll = setInterval(() => {
      if (!this.loginWindow && !document.hidden) {
        void this.refreshQuotes();
        void this.load(true);
      }
    }, 30000);
  }
  private installListener = (e: Event) => {
    e.preventDefault();
    this.installPrompt = e;
  };
  ngOnDestroy() {
    clearInterval(this.syncTimer);
    this.cloud.destroy();
    this.cryptoStream.close();
    clearInterval(this.poll);
    clearTimeout(this.searchTimer);
    clearTimeout(this.toastTimer);
    document.removeEventListener("keydown", this.onKey);
    window.removeEventListener("beforeinstallprompt", this.installListener);
  }
  get assets() {
    return [
      ...ASSETS,
      ...this.ws.customAssets.filter(
        (a) => !ASSETS.some((b) => b.symbol === a.symbol),
      ),
    ].map((asset) => ({ ...asset, ...this.classifications[asset.symbol] }));
  }
  get active(): Tab {
    return this.ws.tabs.find((t) => t.id === this.ws.active) ?? this.ws.tabs[0];
  }
  get asset() {
    return this.assetFor(this.active.symbol);
  }
  get watchAssets() {
    return this.ws.watchlist.map((s) => this.assetFor(s));
  }
  get indices() {
    return this.assets.filter((a) => a.type === "Índices");
  }
  get featured() {
    return ["^GSPC", "^IBEX", "^GDAXI", "^N225"].map((s) => this.assetFor(s));
  }
  get heatAssets() {
    return this.assets.filter(
      (a) =>
        a.type === this.heatUniverse &&
        (this.country === "Todos" || this.country === a.country),
    );
  }
  get heatQuoteCount() {
    return this.heatAssets.filter(
      (a) =>
        this.quotes[a.symbol] &&
        (this.heatSize !== "volume" || (this.quotes[a.symbol].volume ?? 0) > 0),
    ).length;
  }
  get filteredAssets() {
    return this.assets
      .filter(
        (a) =>
          (this.country === "Todos" || a.country === this.country) &&
          (this.category === "Todos" || a.type === this.category) &&
          (this.sector === "Todos" || a.sector === this.sector) &&
          (!this.tableQuery ||
            (a.symbol + " " + a.name)
              .toLowerCase()
              .includes(this.tableQuery.toLowerCase())) &&
          (this.minChange == null ||
            this.minChange === "" ||
            (this.quotes[a.symbol]?.change ?? -Infinity) >=
              Number(this.minChange)) &&
          (this.maxChange == null ||
            this.maxChange === "" ||
            (this.quotes[a.symbol]?.change ?? Infinity) <=
              Number(this.maxChange)) &&
          (this.minPrice == null ||
            this.minPrice === "" ||
            (this.quotes[a.symbol]?.price ?? -Infinity) >=
              Number(this.minPrice)),
      )
      .sort((a, b) => {
        const aq = this.quotes[a.symbol],
          bq = this.quotes[b.symbol];
        const av =
          this.sortKey === "symbol"
            ? a.symbol
            : this.sortKey === "name"
              ? a.name
              : ((aq as any)?.[this.sortKey] ?? -Infinity);
        const bv =
          this.sortKey === "symbol"
            ? b.symbol
            : this.sortKey === "name"
              ? b.name
              : ((bq as any)?.[this.sortKey] ?? -Infinity);
        return (
          (typeof av === "string" ? av.localeCompare(bv) : av - bv) *
          this.sortDir
        );
      });
  }
  get searchResults() {
    const local = this.assets.filter((a) =>
      (a.symbol + " " + a.name + " " + a.country)
        .toLowerCase()
        .includes(this.search.toLowerCase()),
    );
    return [
      ...local,
      ...this.remoteResults.filter(
        (a) => !local.some((b) => b.symbol === a.symbol),
      ),
    ].slice(0, 60);
  }
  get sectors() {
    return [
      ...new Set(
        this.assets.filter((a) => a.type === "Acciones").map((a) => a.sector),
      ),
    ];
  }
  get currentQuote() {
    if (this.active.symbol === "CSV") {
      try {
        return this.series ? quoteFrom(this.series) : undefined;
      } catch {
        return undefined;
      }
    }
    return this.quotes[this.active.symbol];
  }
  get lastCandle() {
    return this.series?.candles.at(-1);
  }
  get indicatorRsi() {
    const c = this.series?.candles ?? [];
    return rsi(c.map((x) => x.close)).at(-1);
  }
  get rangeHigh() {
    return this.series
      ? Math.max(...this.series.candles.map((c) => c.high))
      : undefined;
  }
  get rangeLow() {
    return this.series
      ? Math.min(...this.series.candles.map((c) => c.low))
      : undefined;
  }
  get breadth() {
    const q = this.filteredAssets
      .map((a) => this.quotes[a.symbol])
      .filter(Boolean);
    return {
      up: q.filter((x) => x.change >= 0).length,
      down: q.filter((x) => x.change < 0).length,
      total: q.length,
    };
  }
  get portfolioAssets() {
    return this.ws.positions.filter(
      (p) =>
        (p.currency ?? this.currencyFor(p.symbol)) === this.portfolioCurrency,
    );
  }
  get portfolioCurrencies() {
    return [
      ...new Set(
        this.ws.positions.map((p) => p.currency ?? this.currencyFor(p.symbol)),
      ),
    ];
  }
  get portfolioTotal() {
    return this.portfolioAssets.reduce(
      (n, p) => n + p.quantity * (this.quotes[p.symbol]?.price ?? 0),
      0,
    );
  }
  get portfolioCost() {
    return this.portfolioAssets.reduce((n, p) => n + p.quantity * p.cost, 0);
  }
  get portfolioComplete() {
    return this.portfolioAssets.every(
      (p) =>
        this.quotes[p.symbol] &&
        this.currencyFor(p.symbol) === this.portfolioCurrency &&
        this.portfolioCurrency !== "—",
    );
  }
  currencyFor(symbol: string) {
    return this.quotes[symbol]?.currency || this.assetFor(symbol).currency;
  }
  positionValue(p: { symbol: string; quantity: number; currency?: string }) {
    return this.quotes[p.symbol] &&
      this.currencyFor(p.symbol) === (p.currency ?? this.currencyFor(p.symbol))
      ? p.quantity * this.quotes[p.symbol].price
      : undefined;
  }
  saveZoom(zoom: [number, number]) {
    this.active.zoom = zoom;
    this.save();
  }
  async refreshCurrent() {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      if (this.research) await this.research.load();
      else await Promise.all([this.load(true), this.refreshQuotes(true)]);
    } finally {
      this.refreshing = false;
      this.cdr.markForCheck();
    }
  }
  assetFor(symbol: string): Asset {
    return (
      this.assets.find((a) => a.symbol === symbol) ?? {
        symbol,
        name: symbol,
        country: "Global",
        flag: "WW",
        exchange: "CSV",
        type: "Importado",
        currency: "—",
        sector: "Importado",
      }
    );
  }
  title(tab: Tab) {
    return tab.view === "chart"
      ? this.assetFor(tab.symbol).symbol
      : (this.nav.find((n) => n.view === tab.view)?.label ?? "");
  }
  n(value: number | undefined, digits?: number) {
    return value === undefined || !Number.isFinite(value)
      ? "—"
      : value.toLocaleString("es-ES", {
          minimumFractionDigits: digits ?? (Math.abs(value) < 10 ? 4 : 2),
          maximumFractionDigits: digits ?? (Math.abs(value) < 10 ? 4 : 2),
        });
  }
  pct(value: number | undefined) {
    return value === undefined
      ? "—"
      : (value >= 0 ? "+" : "") + this.n(value, 2) + " %";
  }
  compact(value: number | null | undefined) {
    return value == null
      ? "—"
      : new Intl.NumberFormat("es", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(value);
  }
  time(value: number | undefined) {
    return value
      ? new Date(value).toLocaleString("es-ES", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "Sin datos";
  }
  save(sync = true) {
    try {
      this.ws.preferences = Object.fromEntries(
        Object.keys(VIEW_DEFAULTS).map((key) => [key, (this as any)[key]]),
      );
      localStorage.setItem(this.localKey, JSON.stringify(this.ws));
      if (sync) this.cloud.schedule(this.ws);
    } catch {
      this.storageWarning =
        "El navegador no permite guardar cambios. Exporta una copia del espacio.";
    }
  }
  applyTheme() {
    document.documentElement.dataset["theme"] = this.ws.theme;
  }
  private restorePreferences() {
    Object.assign(this, VIEW_DEFAULTS, this.ws.preferences || {});
  }
  saveView() {
    this.save();
    void this.refreshQuotes();
  }
  quoteInfo(symbol: string) {
    const quote = this.quotes[symbol];
    if (!quote) return this.quoteErrors[symbol] || "Cotización no recibida";
    return `${this.quoteErrors[symbol] ? "No se ha podido actualizar. " : ""}${quote.source} · ${new Date(quote.asOf).toLocaleString("es-ES")} · ${quote.delay == null ? "Retraso no comunicado" : "Retraso: " + quote.delay + " min"}`;
  }
  toggleTheme() {
    this.ws.theme = this.ws.theme === "dark" ? "light" : "dark";
    this.applyTheme();
    this.save();
  }
  notify(text: string) {
    this.toast = text;
    this.cdr.markForCheck();
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = "";
      this.cdr.markForCheck();
    }, 6000);
  }
  open(view: View, symbol?: string) {
    this.mobileMenu = false;
    const found = this.ws.tabs.find(
      (t) =>
        t.view === view &&
        (view !== "chart" || t.symbol === (symbol ?? this.active.symbol)),
    );
    if (found) this.ws.active = found.id;
    else {
      const tab = newTab(view, symbol ?? this.active.symbol);
      this.ws.tabs.push(tab);
      this.ws.active = tab.id;
    }
    this.importData = undefined;
    this.measurement = "";
    this.save();
    void this.load();
  }
  selectTab(tab: Tab) {
    this.ws.active = tab.id;
    this.importData = undefined;
    this.save();
    void this.load();
    if (tab.view === "heatmap") void this.loadClassifications();
  }
  closeTab(tab: Tab, event: Event) {
    event.stopPropagation();
    const index = this.ws.tabs.indexOf(tab);
    this.ws.tabs.splice(index, 1);
    this.csvSessions.delete(tab.id);
    if (!this.ws.tabs.length) this.ws.tabs.push(newTab("overview"));
    if (tab.id === this.ws.active)
      this.ws.active =
        this.ws.tabs[Math.min(index, this.ws.tabs.length - 1)].id;
    this.save();
    void this.load();
  }
  choose(asset: Asset) {
    if (!this.assets.some((a) => a.symbol === asset.symbol)) {
      this.ws.customAssets.push(asset);
      this.countries = [
        ...new Set([...WORLD_COUNTRIES, ...this.assets.map((a) => a.country)]),
      ].sort((a, b) => a.localeCompare(b, "es"));
    }
    this.searchOpen = false;
    this.search = "";
    this.remoteResults = [];
    this.open("chart", asset.symbol);
  }
  toggleWatch(symbol: string, event?: Event) {
    event?.stopPropagation();
    this.ws.watchlist = this.ws.watchlist.includes(symbol)
      ? this.ws.watchlist.filter((s) => s !== symbol)
      : [...this.ws.watchlist, symbol];
    this.save();
  }
  isWatched(symbol: string) {
    return this.ws.watchlist.includes(symbol);
  }
  registerAndWatch(asset: Asset, event: Event) {
    if (!this.assets.some((a) => a.symbol === asset.symbol))
      this.ws.customAssets.push(asset);
    this.toggleWatch(asset.symbol, event);
    void this.refreshQuotes();
  }
  async load(quiet = false) {
    const id = ++this.request;
    this.cryptoStream.subscribe(this.assets, this.asset, this.active.interval);
    if (!["chart", "overview"].includes(this.active.view)) return;
    const tab = { ...this.active };
    if (tab.symbol !== "CSV")
      void this.getQuote(this.assetFor(tab.symbol))
        .then((quote) => {
          this.quotes = { ...this.quotes, [tab.symbol]: quote };
          this.cdr.markForCheck();
        })
        .catch(() => {});
    const key =
      (tab.symbol === "CSV" ? tab.id : tab.symbol) +
      ":" +
      tab.interval +
      ":" +
      tab.compare;
    const retain = this.seriesKey === key;
    if (!retain) {
      this.series = undefined;
      this.comparison = [];
      this.measurement = "";
    }
    if (!quiet) this.loading = true;
    this.error = "";
    try {
      const local = this.csvSessions.get(tab.id);
      if (tab.symbol === "CSV" && !local)
        throw new Error(
          "Vuelve a importar el archivo CSV para esta pestaña. No se guardan archivos dentro del espacio.",
        );
      const series =
        local ??
        (await this.getSeries(this.assetFor(tab.symbol), tab.interval, quiet));
      let comparison: Candle[] = [];
      if (tab.compare) {
        try {
          comparison = (
            await this.getSeries(
              this.assetFor(tab.compare),
              tab.interval,
              quiet,
            )
          ).candles;
          if (!compareReturns(series.candles, comparison, tab.interval)) {
            comparison = [];
            if (id === this.request)
              this.notify(
                "Los activos no tienen fechas en común para este intervalo.",
              );
          }
        } catch (e) {
          if (id === this.request)
            this.notify("Comparación no disponible: " + this.message(e));
        }
      }
      if (id !== this.request) return;
      this.series = series;
      this.seriesKey = key;
      this.comparison = comparison;
      if (tab.symbol !== "CSV" && tab.interval === "1d")
        this.quotes = { ...this.quotes, [tab.symbol]: quoteFrom(series) };
      this.error = "";
      this.checkAlerts();
    } catch (e) {
      if (id === this.request) this.error = this.message(e);
    } finally {
      if (id === this.request) this.loading = false;
      this.cdr.markForCheck();
    }
  }
  private async getSeries(
    asset: Asset,
    interval: string,
    refresh = false,
  ): Promise<Series> {
    const key = this.ws.api + asset.symbol + interval;
    const cached = this.cache.get(key);
    if (cached && !refresh && Date.now() - (cached.fetchedAt ?? 0) < 60000)
      return cached;
    const pending = this.pending.get(key);
    if (pending) return pending;
    const version = this.dataVersion;
    const task = fetchSeries(asset, interval, this.ws.api.replace(/\/$/, ""))
      .then((data) => {
        if (version === this.dataVersion) this.cache.set(key, data);
        return data;
      })
      .finally(() => {
        if (this.pending.get(key) === task) this.pending.delete(key);
      });
    this.pending.set(key, task);
    return task;
  }
  async refreshQuotes(force = false) {
    if (this.refreshBusy) {
      this.refreshAgain = true;
      return;
    }
    this.refreshBusy = true;
    const version = this.dataVersion;
    const symbols = [
      ...new Set([
        ...(this.active.symbol === "CSV" ? [] : [this.active.symbol]),
        ...this.ws.watchlist,
        ...this.ws.positions.map((p) => p.symbol),
        ...this.ws.alerts.map((a) => a.symbol),
        ...(["markets", "screener"].includes(this.active.view)
          ? this.filteredAssets.slice(0, 60)
          : this.active.view === "heatmap"
            ? this.heatAssets
            : this.active.view === "overview"
              ? this.featured
              : []
        ).map((a) => a.symbol),
      ]),
    ];
    let i = 0;
    const errors: string[] = [];
    try {
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (i < symbols.length && version === this.dataVersion) {
            const s = symbols[i++];
            try {
              const quote = await this.getQuote(this.assetFor(s), force);
              if (version !== this.dataVersion) return;
              this.quotes = { ...this.quotes, [s]: quote };
              delete this.quoteErrors[s];
              this.cdr.markForCheck();
            } catch (e) {
              errors.push(this.message(e));
              this.quoteErrors[s] = this.message(e);
            }
          }
        }),
      );
      this.checkAlerts();
      this.cdr.markForCheck();
    } finally {
      this.refreshBusy = false;
      if (this.refreshAgain || version !== this.dataVersion) {
        this.refreshAgain = false;
        void this.refreshQuotes();
      }
    }
  }
  configure() {
    this.mobileMenu = false;
    this.settings = true;
    this.accountOpen = false;
  }
  private getQuote(asset: Asset, force = false): Promise<Quote> {
    const cached = this.quotes[asset.symbol];
    if (!force && cached && Date.now() - (cached.fetchedAt ?? 0) < 30000)
      return Promise.resolve(cached);
    const pending = this.quotePending.get(asset.symbol);
    if (pending) return pending;
    const task = fetchQuote(asset, this.ws.api).finally(() =>
      this.quotePending.delete(asset.symbol),
    );
    this.quotePending.set(asset.symbol, task);
    return task;
  }
  private receiveCrypto(
    symbol: string,
    interval: string,
    candle: Candle,
    timestamp: number,
  ) {
    const quote = this.quotes[symbol];
    if (interval === "1d" && quote) {
      if (quote.periodStart !== candle.time) {
        void this.getQuote(this.assetFor(symbol), true)
          .then((value) => {
            this.quotes = { ...this.quotes, [symbol]: value };
            this.cdr.markForCheck();
          })
          .catch(() => {});
      } else if (quote.referenceClose && timestamp >= quote.asOf) {
        this.quotes = {
          ...this.quotes,
          [symbol]: {
            ...quote,
            price: candle.close,
            change: (candle.close / quote.referenceClose - 1) * 100,
            volume: candle.volume,
            asOf: timestamp,
            timeKind: "market",
            fetchedAt: Date.now(),
          },
        };
      }
    }
    if (
      this.series &&
      this.active.symbol === symbol &&
      this.active.interval === interval
    ) {
      const candles = [...this.series.candles],
        last = candles.at(-1)!;
      if (candle.time < last.time || timestamp < this.series.asOf) return;
      if (candle.time === last.time) candles[candles.length - 1] = candle;
      else candles.push(candle);
      this.series = {
        ...this.series,
        candles: candles.slice(-500),
        asOf: timestamp,
        timeKind: "market",
        fetchedAt: Date.now(),
      };
      this.cache.set(this.ws.api + symbol + interval, this.series);
    }
    delete this.quoteErrors[symbol];
    this.checkAlerts();
    this.cdr.markForCheck();
  }
  navigate(view: View) {
    this.active.view = view;
    this.mobileMenu = false;
    this.save();
    void this.load();
    void this.refreshQuotes();
    if (view === "heatmap") void this.loadClassifications();
  }
  private async loadClassifications() {
    if (!this.ws.api || this.classificationBusy) return;
    this.classificationBusy = true;
    const labels: Record<string, string> = {
      Technology: "Tecnología",
      "Communication Services": "Comunicaciones",
      "Consumer Cyclical": "Consumo cíclico",
      "Consumer Defensive": "Consumo básico",
      "Financial Services": "Finanzas",
      Healthcare: "Salud",
      Industrials: "Industria",
      "Basic Materials": "Materiales",
      "Real Estate": "Inmobiliario",
      Utilities: "Servicios públicos",
      Energy: "Energía",
    };
    const industries: Record<string, string> = {
      "Consumer Electronics": "Electrónica de consumo",
      "Software - Infrastructure": "Software de infraestructura",
      "Software - Application": "Aplicaciones de software",
      Semiconductors: "Semiconductores",
      "Internet Content & Information": "Contenidos y servicios de Internet",
      "Internet Retail": "Comercio por Internet",
      "Banks - Diversified": "Banca diversificada",
      "Credit Services": "Servicios de crédito",
      "Oil & Gas Integrated": "Petróleo y gas",
      "Drug Manufacturers - General": "Farmacéuticas",
      "Auto Manufacturers": "Automóviles",
      "Telecom Services": "Telecomunicaciones",
      "Apparel Retail": "Comercio textil",
      "Luxury Goods": "Artículos de lujo",
      "Beverages - Wineries & Distilleries": "Vinos y destilados",
      "Utilities - Diversified": "Servicios públicos diversificados",
      "Aerospace & Defense": "Aeronáutica y defensa",
      "Oil & Gas Refining & Marketing": "Refino y comercialización",
    };
    const assets = this.assets.filter(
      (a) => a.type === "Acciones" && !this.classifications[a.symbol],
    );
    const result = { ...this.classifications };
    let i = 0;
    try {
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (i < assets.length) {
            const asset = assets[i++];
            try {
              const value = await requestJson(
                `${this.ws.api}/api/classification?symbol=${encodeURIComponent(asset.symbol)}`,
              );
              result[asset.symbol] = {
                ...(value.sector
                  ? { sector: labels[value.sector] || value.sector }
                  : {}),
                ...(value.industry
                  ? {
                      industry:
                        industries[
                          String(value.industry).replace(/\s*[—–-]\s*/g, " - ")
                        ] || value.industry,
                    }
                  : {}),
              };
            } catch {
              /* Missing provider classifications remain explicitly unnamed. */
            }
          }
        }),
      );
      this.classifications = result;
    } finally {
      this.classificationBusy = false;
      this.cdr.markForCheck();
    }
  }
  changeChart() {
    this.importData = undefined;
    this.ws.tabs = this.ws.tabs.map((tab) =>
      tab.id === this.ws.active ? { ...tab } : tab,
    );
    this.save();
    void this.load();
  }
  toggleIndicator(i: string) {
    const t = this.active;
    t.indicators = t.indicators.includes(i)
      ? t.indicators.filter((v) => v !== i)
      : [...t.indicators, i];
    this.ws = {
      ...this.ws,
      tabs: this.ws.tabs.map((x) => (x.id === t.id ? { ...t } : x)),
    };
    this.save();
  }
  addDrawing(d: Drawing) {
    this.active.drawings = [...this.active.drawings, d];
    this.ws = {
      ...this.ws,
      tabs: this.ws.tabs.map((t) => (t.id === this.active.id ? { ...t } : t)),
    };
    this.save();
  }
  clearDrawings() {
    this.active.drawings = [];
    this.ws = { ...this.ws, tabs: this.ws.tabs.map((t) => ({ ...t })) };
    this.save();
  }
  sort(key: string) {
    this.sortDir = this.sortKey === key ? -this.sortDir : 1;
    this.sortKey = key;
    this.saveView();
  }
  selectCountry(country: string) {
    if (!country) return;
    this.country = country;
    this.navigate("markets");
  }
  resetFilters() {
    this.country = this.category = this.sector = "Todos";
    this.minChange = this.maxChange = this.minPrice = this.tableQuery = "";
    this.saveView();
  }
  onSearch() {
    clearTimeout(this.searchTimer);
    this.remoteResults = [];
    if (this.search.length < 2 || !this.ws.api) return;
    const query = this.search;
    this.searchTimer = setTimeout(async () => {
      this.searchBusy = true;
      try {
        const data = await requestJson(
          `${this.ws.api}/api/search?q=${encodeURIComponent(query)}`,
        );
        if (query === this.search) this.remoteResults = data;
      } catch {
      } finally {
        this.searchBusy = false;
        this.cdr.markForCheck();
      }
    }, 400);
  }
  private key(e: KeyboardEvent) {
    if (this.loginWindow) return;
    if (e.key === "Escape") {
      this.searchOpen =
        this.settings =
        this.indicatorPanel =
        this.about =
        this.accountOpen =
        this.mobileMenu =
          false;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      this.settings = this.about = this.accountOpen = this.mobileMenu = false;
      this.searchOpen = true;
    }
    this.cdr.markForCheck();
  }
  private message(e: unknown) {
    return e instanceof Error
      ? e.message
      : "No se ha podido completar la operación.";
  }
  download(text: string, name: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  exportWorkspace() {
    this.download(JSON.stringify(this.ws, null, 2), "trader-espacio.json");
  }
  async importWorkspace(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10000000) throw new Error("El archivo supera 10 MB.");
      this.ws = validateState(JSON.parse(await file.text()));
      this.restorePreferences();
      this.dataVersion++;
      this.pending.clear();
      this.save();
      this.applyTheme();
      this.quotes = {};
      this.cache.clear();
      this.importData = undefined;
      this.settings = false;
      await this.load();
      void this.refreshQuotes();
      this.notify("Espacio restaurado");
    } catch (e) {
      this.notify(this.message(e));
    }
    input.value = "";
  }
  exportCsv() {
    if (this.series)
      this.download(
        csv(this.series.candles),
        `${this.asset.symbol}-${this.active.interval}.csv`,
        "text/csv",
      );
  }
  async importCsv(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 20000000) throw new Error("El archivo supera 20 MB.");
      const candles = parseCsv(await file.text());
      const tab = newTab("chart", "CSV");
      this.ws.tabs.push(tab);
      this.ws.active = tab.id;
      this.importData = {
        candles,
        source: "Archivo local · " + file.name,
        asOf: candles.at(-1)!.time,
      };
      this.series = this.importData;
      this.measurement = "";
      this.csvSessions.set(tab.id, this.importData);
      this.comparison = [];
      this.error = "";
      this.save();
      this.notify(
        "CSV cargado para esta sesión. Vuelve a importarlo después de cerrar la aplicación.",
      );
    } catch (e) {
      this.notify(this.message(e));
    }
    input.value = "";
  }
  exportImage() {
    const data = this.chart?.image();
    if (data) {
      const a = document.createElement("a");
      a.href = data;
      a.download = `${this.asset.symbol}.png`;
      a.click();
    }
  }
  newWindow() {
    const id = crypto.randomUUID();
    try {
      localStorage.setItem(
        "trader.workspace.v1:" + id,
        JSON.stringify(this.ws),
      );
      const url = new URL(location.href);
      url.searchParams.set("workspace", id);
      if (desktopApi())
        void desktopApi()!
          .new_window(id)
          .catch((e) => this.notify(this.message(e)));
      else window.open(url.href, "_blank", "noopener,width=1440,height=920");
    } catch {
      this.notify(
        "No se pudo crear el espacio de la nueva ventana. Exporta una copia para abrirla en otro navegador.",
      );
    }
  }
  async fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      this.notify("Pantalla completa no disponible.");
    }
  }
  async install() {
    if (this.installPrompt) {
      await this.installPrompt.prompt();
      this.installPrompt = undefined;
    } else
      this.notify(
        "En un navegador compatible: menú → Instalar aplicación. Los paquetes de escritorio se generan en GitHub Actions.",
      );
  }
  addPosition() {
    const currency = this.currencyFor(this.positionSymbol);
    if (!currency || currency === "—") {
      this.notify(
        "Carga primero una cotización para conocer la divisa del activo.",
      );
      return;
    }
    if (
      !Number.isFinite(this.quantity) ||
      this.quantity <= 0 ||
      this.cost == null ||
      !Number.isFinite(this.cost) ||
      this.cost <= 0
    ) {
      this.notify("Introduce unidades y coste mayores que cero.");
      return;
    }
    this.ws.positions.push({
      id: crypto.randomUUID(),
      symbol: this.positionSymbol,
      quantity: this.quantity,
      cost: this.cost,
      currency,
    });
    this.portfolioCurrency = currency;
    this.save();
    void this.refreshQuotes();
  }
  removePosition(id: string) {
    this.ws.positions = this.ws.positions.filter((p) => p.id !== id);
    this.save();
  }
  addAlert() {
    if (
      this.alertPrice == null ||
      !Number.isFinite(this.alertPrice) ||
      this.alertPrice <= 0
    ) {
      this.notify("Introduce un precio mayor que cero.");
      return;
    }
    this.ws.alerts.push({
      id: crypto.randomUUID(),
      symbol: this.alertSymbol,
      price: this.alertPrice,
      direction: this.alertDirection,
      triggered: false,
    });
    this.save();
    void this.refreshQuotes();
  }
  removeAlert(id: string) {
    this.ws.alerts = this.ws.alerts.filter((a) => a.id !== id);
    this.save();
  }
  resetAlert(id: string) {
    const a = this.ws.alerts.find((a) => a.id === id);
    if (a) a.triggered = false;
    this.save();
  }
  checkAlerts() {
    let changed = false;
    for (const a of this.ws.alerts) {
      const q = this.quotes[a.symbol];
      if (!q || !quoteIsFresh(q) || a.triggered) continue;
      if (a.direction === "above" ? q.price >= a.price : q.price <= a.price) {
        a.triggered = true;
        changed = true;
        const text = `${a.symbol}: ${this.n(q.price)} · nivel ${this.n(a.price)}`;
        this.notify(text);
        if ("Notification" in window && Notification.permission === "granted")
          new Notification("Trader · Alerta", {
            body: text,
            icon: new URL("favicon.svg", document.baseURI).href,
          });
      }
    }
    if (changed) this.save();
  }
  async enableNotifications() {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      this.notify(
        result === "granted"
          ? "Avisos activados mientras la aplicación esté abierta."
          : "No se han autorizado avisos.",
      );
    }
  }
  get localKey() {
    return this.cloud.user
      ? `trader.account.${this.cloud.user.uid}.${this.cloud.profile}.${this.windowId}`
      : this.storageKey;
  }
  private receiveWorkspace(workspace: Workspace) {
    const before = this.active.symbol + this.active.interval + this.active.view;
    this.ws = validateState(workspace);
    this.restorePreferences();
    this.applyTheme();
    this.save(false);
    if (before !== this.active.symbol + this.active.interval + this.active.view)
      void this.load();
    void this.refreshQuotes();
    this.cdr.markForCheck();
    if (this.active.view === "heatmap") void this.loadClassifications();
  }
  private accountChanged() {
    if (!this.cloud.user && this.previousUser) {
      try {
        this.ws = validateState(
          JSON.parse(localStorage.getItem(this.storageKey) || "null"),
        );
      } catch {
        this.ws = fresh();
      }
      this.restorePreferences();
      this.applyTheme();
      void this.load();
      void this.refreshQuotes();
    }
    if (this.cloud.user && this.cloud.user.uid !== this.previousUser) {
      try {
        const cached = localStorage.getItem(this.localKey);
        if (cached) {
          this.ws = validateState(JSON.parse(cached));
          this.restorePreferences();
          this.applyTheme();
          void this.load();
        }
      } catch {
        /* The server copy can still restore a damaged local account cache. */
      }
    }
    this.previousUser = this.cloud.user?.uid ?? "";
    this.cdr.markForCheck();
  }
  async connect() {
    if (!this.cloud.configured) return;
    try {
      if (this.nativeDesktop && !this.loginWindow) {
        await this.loginWithBrowser();
        return;
      }
      const credential = await this.cloud.signInGoogle();
      if (this.loginWindow && credential?.idToken) {
        await requestJson(location.origin + "/api/desktop/auth", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + this.loginToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken: credential.idToken,
            accessToken: credential.accessToken || "",
          }),
        });
        this.loginToken = "";
        this.loginDone = true;
      }
    } catch (error) {
      this.notify(this.message(error));
    } finally {
      this.cdr.markForCheck();
    }
  }
  async signOut() {
    try {
      await this.cloud.signOut();
    } catch (error) {
      this.notify(this.message(error));
    }
  }
  async createProfile() {
    await this.cloud.createProfile(this.profileName);
    this.profileName = "";
  }
  exportTable() {
    const rows = this.filteredAssets.map((a) => [
      a.symbol,
      a.name,
      a.country,
      this.currencyFor(a.symbol),
      this.quotes[a.symbol]?.price ?? "",
      this.quotes[a.symbol]?.change ?? "",
      this.quotes[a.symbol]?.source ?? "Sin datos",
    ]);
    this.download(
      "symbol,name,country,currency,price,change,source\n" +
        rows
          .map((row) =>
            row
              .map((c) => '"' + String(c).replaceAll('"', '""') + '"')
              .join(","),
          )
          .join("\n"),
      "trader-mercados.csv",
      "text/csv",
    );
  }
  private async loginWithBrowser() {
    if (this.nativeSyncBusy) return;
    this.nativeSyncBusy = true;
    const api = desktopApi()!;
    try {
      const token = await api.open_login();
      this.notify("Continúa el acceso con Google en tu navegador.");
      let checking = false;
      clearInterval(this.syncTimer);
      this.syncTimer = setInterval(async () => {
        if (checking) return;
        checking = true;
        try {
          const result = await api.login_result(token);
          if (result) {
            clearInterval(this.syncTimer);
            await this.cloud.acceptGoogleCredential(result);
            this.nativeSyncBusy = false;
          }
        } catch (error) {
          clearInterval(this.syncTimer);
          this.nativeSyncBusy = false;
          this.notify(this.message(error));
        } finally {
          checking = false;
          this.cdr.markForCheck();
        }
      }, 1000);
    } catch (error) {
      this.nativeSyncBusy = false;
      throw error;
    }
  }
}
