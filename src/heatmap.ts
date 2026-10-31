import type { Asset, Quote } from "./market";
export interface HeatNode {
  id: string;
  name: string;
  count?: number;
  children?: HeatNode[];
  symbol?: string;
  fullName?: string;
  value?: number;
  change?: number;
  price?: number;
  currency?: string;
  asOf?: number;
  source?: string;
  itemStyle?: { color: string };
}
export function heatmapTree(
  assets: Asset[],
  quotes: Record<string, Quote>,
  size: "uniform" | "volume",
): HeatNode[] {
  const available = assets.filter(
    (asset) =>
      quotes[asset.symbol] &&
      (size !== "volume" || (quotes[asset.symbol].volume ?? 0) > 0),
  );
  const color = (change: number) =>
    Math.abs(change) < 0.025
      ? "#333b48"
      : `hsl(${change > 0 ? 158 : 348} ${Math.min(55, 30 + Math.abs(change) * 8)}% ${Math.min(44, 25 + Math.abs(change) * 5)}%)`;
  const leaf = (asset: Asset): HeatNode => {
    const q = quotes[asset.symbol];
    return {
      id: asset.symbol,
      name: (asset.crypto || asset.symbol).replace("^", ""),
      symbol: asset.symbol,
      fullName: asset.name,
      value: size === "volume" ? q.volume! : 1,
      change: q.change,
      price: q.price,
      currency: q.currency || asset.currency,
      asOf: q.asOf,
      source: q.source,
      itemStyle: { color: color(q.change) },
    };
  };
  const group = (asset: Asset) =>
    asset.type === "Acciones"
      ? asset.sector
      : asset.type === "Índices"
        ? asset.country
        : asset.exchange +
          " · " +
          (quotes[asset.symbol].currency || asset.currency);
  return [...new Set(available.map(group))].map((name) => {
    const items = available.filter((asset) => group(asset) === name);
    return {
      id: "group:" + name,
      name,
      count: items.length,
      children:
        items[0].type === "Acciones"
          ? [
              ...new Set(
                items.map(
                  (asset) => asset.industry || "Sin industria detallada",
                ),
              ),
            ].map((industry) => ({
              id: "industry:" + name + ":" + industry,
              name: industry,
              count: items.filter(
                (a) => (a.industry || "Sin industria detallada") === industry,
              ).length,
              children: items
                .filter(
                  (a) => (a.industry || "Sin industria detallada") === industry,
                )
                .map(leaf),
            }))
          : items.map(leaf),
    };
  });
}
