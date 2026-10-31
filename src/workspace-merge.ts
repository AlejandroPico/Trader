import type { Workspace } from "./state";
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
/** Apply edits made during reconnection without replacing untouched remote tabs or watchlists. */
export function reconcileWorkspace(
  remote: Workspace,
  base: Workspace,
  local: Workspace,
): Workspace {
  const result = structuredClone(remote);
  for (const key of ["theme", "active", "preferences"] as const) {
    if (!same(base[key], local[key]))
      (result as any)[key] = structuredClone(local[key]);
  }
  const removed = new Set(
    base.watchlist.filter((s) => !local.watchlist.includes(s)),
  );
  result.watchlist = [
    ...new Set([
      ...remote.watchlist.filter((s) => !removed.has(s)),
      ...local.watchlist.filter((s) => !base.watchlist.includes(s)),
    ]),
  ];
  for (const key of [
    "tabs",
    "alerts",
    "positions",
    "events",
    "customAssets",
  ] as const) {
    const identifier = (item: any) =>
      key === "customAssets" ? item.symbol : item.id;
    const before = new Map(
      (base[key] || []).map((item) => [identifier(item), item]),
    );
    const after = new Map(
      (local[key] || []).map((item) => [identifier(item), item]),
    );
    const values = new Map(
      (remote[key] || [])
        .filter(
          (item) =>
            !before.has(identifier(item)) || after.has(identifier(item)),
        )
        .map((item) => [identifier(item), item]),
    );
    after.forEach((item, id) => {
      if (!same(before.get(id), item)) values.set(id, structuredClone(item));
    });
    (result as any)[key] = [...values.values()];
  }
  return result;
}
