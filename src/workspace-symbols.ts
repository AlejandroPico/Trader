import type { Workspace } from "./state";
const legacyPairs: Record<string, string> = {
  "BTC-USD": "BTCUSDT",
  "ETH-USD": "ETHUSDT",
  "SOL-USD": "SOLUSDT",
};
/** Earlier catalog keys denoted Binance USDT markets; retain that market without converting amounts. */
export function upgradeLegacyMarkets<
  T extends Pick<
    Workspace,
    "tabs" | "watchlist" | "positions" | "alerts" | "customAssets"
  >,
>(input: T): T {
  const workspace = structuredClone(input);
  const symbol = (value: string) => legacyPairs[value] || value;
  workspace.tabs.forEach((tab) => {
    tab.symbol = symbol(tab.symbol);
    tab.compare = symbol(tab.compare);
  });
  workspace.watchlist = [...new Set(workspace.watchlist.map(symbol))];
  workspace.positions.forEach((position) => {
    position.symbol = symbol(position.symbol);
  });
  workspace.alerts.forEach((alert) => {
    alert.symbol = symbol(alert.symbol);
  });
  workspace.customAssets.forEach((asset) => {
    asset.symbol = symbol(asset.symbol);
  });
  return workspace;
}
