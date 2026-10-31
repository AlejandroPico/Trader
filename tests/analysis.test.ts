import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sma,
  ema,
  rsi,
  bollinger,
  parseCsv,
  csv,
  compareReturns,
  quoteIsFresh,
} from "../src/analysis.ts";
import type { Candle } from "../src/analysis.ts";
test("SMA and EMA use the correct warm-up period", () => {
  assert.deepEqual(sma([1, 2, 3, 4], 3), [null, null, 2, 3]);
  assert.deepEqual(ema([1, 2, 3, 4], 3), [null, null, 2, 3]);
});

test("Comparisons align daily sessions across exchange time zones and share a base", () => {
  const bar = (date: string, close: number): Candle => ({
    time: Date.parse(date),
    open: close,
    close,
    high: close,
    low: close,
    volume: 0,
  });
  const p = [
    bar("2026-10-01T14:00Z", 100),
    bar("2026-10-02T14:00Z", 110),
    bar("2026-10-05T14:00Z", 121),
  ];
  const q = [bar("2026-10-02T07:00Z", 200), bar("2026-10-05T07:00Z", 220)];
  const compared = compareReturns(p, q, "1d")!;
  assert.equal(compared.time, p[1].time);
  assert.deepEqual(compared.primary.slice(0, 2), [null, 0]);
  assert.ok(Math.abs(compared.primary[2]! - 10) < 1e-10);
  assert.ok(Math.abs(compared.secondary[2]! - 10) < 1e-10);
  assert.equal(compareReturns(p, q, "1h"), undefined);
});
test("Freshness accepts disclosed delays but rejects closed-market quotes", () => {
  const now = Date.now();
  const q = { asOf: now - 15 * 60000, fetchedAt: now, delay: 15 };
  assert.equal(quoteIsFresh(q, now), true);
  assert.equal(quoteIsFresh({ ...q, delay: null }, now), false);
  assert.equal(quoteIsFresh({ ...q, asOf: now - 86400000 }, now), false);
  assert.equal(quoteIsFresh({ ...q, fetchedAt: undefined }, now), false);
  assert.equal(quoteIsFresh({ ...q, timeKind:'snapshot' }, now), false);
});
test("CSV rejects empty fields, impossible dates and duplicate header names", () => {
  const h = "time,open,high,low,close,volume\n";
  const rows = "2026-10-01,10,12,9,11,100\n2026-10-02,11,13,10,12,100";
  assert.throws(() => parseCsv(h + rows.replace(",10,12,", ",,12,")));
  assert.throws(() => parseCsv(h + rows.replace("2026-10-01", "2026-02-30")));
  assert.throws(() => parseCsv(h.replace("volume", "close") + rows));
});
test('CSV keeps missing volumes empty, including on export and reimport',()=>{
  const text='time,open,high,low,close,volume\n2026-10-01,10,12,9,11,\n2026-10-02,11,13,10,12,150';
  const candles=parseCsv(text);assert.equal(candles[0].volume,null);assert.deepEqual(parseCsv(csv(candles)),candles);
});
test("Wilder RSI handles increasing, decreasing and flat prices", () => {
  assert.equal(rsi(Array.from({ length: 30 }, (_, i) => i)).at(-1), 100);
  assert.equal(rsi(Array.from({ length: 30 }, (_, i) => 30 - i)).at(-1), 0);
  assert.equal(rsi(Array(30).fill(10)).at(-1), 50);
});
test("Bollinger bands use population standard deviation", () => {
  const b = bollinger([1, 2, 3], 3);
  assert.equal(b.middle[2], 2);
  assert.ok(Math.abs(b.upper[2]! - (2 + 2 * Math.sqrt(2 / 3))) < 1e-10);
});
test("CSV sorts dates, validates OHLC and round trips UTC timestamps", () => {
  const text =
    "time,open,high,low,close,volume\n2026-10-02,10,12,9,11,100\n2026-10-01,9,11,8,10,120";
  const c = parseCsv(text);
  assert.equal(c[0].close, 10);
  assert.deepEqual(parseCsv(csv(c)), c);
  assert.throws(() => parseCsv(text.replace(",12,9,", ",8,9,")));
  assert.throws(() => parseCsv(text.replace("2026-10-02", "2026-10-01")));
});
