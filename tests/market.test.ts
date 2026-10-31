import test from "node:test";
import assert from "node:assert/strict";
import { validatedSeries } from "../src/market-values.ts";
import { reconcileWorkspace } from "../src/workspace-merge.ts";
import { upgradeLegacyMarkets } from "../src/workspace-symbols.ts";
import { heatmapTree } from "../src/heatmap.ts";
const series = () => ({
  source: "Test fixture",
  asOf: 2000,
  candles: [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: null },
    { time: 2000, open: 11, high: 13, low: 10, close: 12, volume: 150 },
  ],
});
test("Legacy crypto market keys migrate without changing amounts or cost currencies", () => {
  const old: any = {
    tabs: [{ symbol: "BTC-USD", compare: "ETH-USD" }],
    watchlist: ["BTC-USD", "BTCUSDT"],
    positions: [{ symbol: "BTC-USD", currency: "USD", quantity: 2, cost: 100 }],
    alerts: [{ symbol: "BTC-USD", price: 150 }],
    customAssets: [],
  };
  const next = upgradeLegacyMarkets(old);
  assert.deepEqual(next.watchlist, ["BTCUSDT"]);
  assert.equal(next.tabs[0].compare, "ETHUSDT");
  assert.equal(next.positions[0].currency, "USD");
  assert.equal(next.positions[0].cost, 100);
  assert.equal(next.alerts[0].price, 150);
  assert.equal(old.tabs[0].symbol, "BTC-USD");
});
test("Heat maps use published volume and group crypto by its actual exchange and currency", () => {
  const asset: any = {
    symbol: "BTCUSDT",
    crypto: "BTCUSDT",
    name: "Bitcoin",
    exchange: "BINANCE",
    currency: "USDT",
    type: "Cripto",
    sector: "Cripto",
  };
  const quotes: any = {
    BTCUSDT: {
      price: 10,
      change: 1,
      volume: null,
      asOf: 2000,
      currency: "USDT",
      source: "Test fixture",
    },
  };
  const tree = heatmapTree([asset], quotes, "uniform");
  assert.equal(tree[0].name, "BINANCE · USDT");
  assert.equal(tree[0].children![0].symbol, "BTCUSDT");
  assert.equal(tree[0].children![0].children, undefined);
  assert.deepEqual(heatmapTree([asset], quotes, "volume"), []);
});
test("Provider validation keeps absent volume empty and rejects corrupt or generated feeds", () => {
  assert.equal(validatedSeries(series()).candles[0].volume, null);
  assert.throws(() => validatedSeries({ ...series(), demo: true }));
  assert.throws(() => validatedSeries({ ...series(), asOf: undefined }));
  const bad = series();
  bad.candles[1].high = 10;
  assert.throws(() => validatedSeries(bad));
  const duplicate = series();
  duplicate.candles[1].time = 1000;
  assert.throws(() => validatedSeries(duplicate));
});
test("Reconnection retains remote instruments while applying local additions and removals", () => {
  const base: any = {
    tabs: [{ id: "a", symbol: "AAPL" }],
    watchlist: ["AAPL", "NVDA"],
    theme: "dark",
    active: "a",
    alerts: [],
    positions: [],
    customAssets: [],
    events: [],
  };
  const remote: any = {
    ...base,
    tabs: [...base.tabs, { id: "r", symbol: "SAN.MC" }],
    watchlist: ["AAPL", "NVDA", "SAN.MC"],
  };
  const local: any = {
    ...base,
    tabs: [...base.tabs, { id: "l", symbol: "7203.T" }],
    watchlist: ["NVDA", "7203.T"],
    active: "l",
  };
  const merged = reconcileWorkspace(remote, base, local);
  assert.deepEqual(merged.watchlist, ["NVDA", "SAN.MC", "7203.T"]);
  assert.deepEqual(
    merged.tabs.map((t) => t.id),
    ["a", "r", "l"],
  );
  assert.equal(merged.active, "l");
  assert.deepEqual(remote.watchlist, ["AAPL", "NVDA", "SAN.MC"]);
});
