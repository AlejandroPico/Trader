import type { Series } from "./market";
import type { Candle } from "./analysis";
export function validatedSeries(raw: unknown): Series {
  const data = raw as Series;
  if (
    !data ||
    typeof data.source !== "string" ||
    !data.source.trim() ||
    !Number.isFinite(data.asOf) ||
    data.asOf <= 0 ||
    !Array.isArray(data.candles) ||
    data.candles.length < 2 ||
    data.candles.length > 100000 ||
    (raw as { demo?: boolean }).demo === true
  )
    throw new Error("El proveedor no ha devuelto una serie de mercado válida.");
  const candles: Candle[] = data.candles.map((c, i) => {
    if (
      !c ||
      ![c.time, c.open, c.high, c.low, c.close].every(Number.isFinite) ||
      c.time <= 0 ||
      c.low > Math.min(c.open, c.close) ||
      c.high < Math.max(c.open, c.close) ||
      (c.volume != null && (!Number.isFinite(c.volume) || c.volume < 0)) ||
      (i > 0 && c.time <= data.candles[i - 1].time)
    )
      throw new Error(
        "La serie recibida contiene fechas, precios o volúmenes no válidos.",
      );
    return {
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? null,
    };
  });
  return {
    candles,
    source: data.source,
    timeKind: data.timeKind === "snapshot" ? "snapshot" : "market",
    asOf: data.asOf,
    fetchedAt: Number.isFinite(data.fetchedAt) ? data.fetchedAt : Date.now(),
    currency: data.currency,
    delay:
      data.delay != null && Number.isFinite(data.delay) && data.delay >= 0
        ? data.delay
        : null,
  };
}
