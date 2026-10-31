export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}
export function sma(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period];
    return i < period - 1 ? null : sum / period;
  });
}
export function ema(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = values.map(() => null);
  if (values.length < period) return result;
  let previous = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = previous;
  for (let i = period; i < values.length; i++) {
    previous =
      (values[i] * 2) / (period + 1) + previous * (1 - 2 / (period + 1));
    result[i] = previous;
  }
  return result;
}
export function rsi(values: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = values.map(() => null);
  if (values.length <= period) return result;
  let gain = 0,
    loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    gain += Math.max(d, 0) / period;
    loss += Math.max(-d, 0) / period;
  }
  const value = () =>
    loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss);
  result[period] = value();
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    result[i] = value();
  }
  return result;
}
export function bollinger(values: number[], period = 20) {
  const middle = sma(values, period);
  const sd = middle.map((m, i) =>
    m === null
      ? null
      : Math.sqrt(
          values
            .slice(i - period + 1, i + 1)
            .reduce((s, v) => s + (v - m) ** 2, 0) / period,
        ) * 2,
  );
  return {
    middle,
    upper: middle.map((m, i) => (m === null ? null : m + sd[i]!)),
    lower: middle.map((m, i) => (m === null ? null : m - sd[i]!)),
  };
}
export function parseCsv(text: string): Candle[] {
  const rows = text.trim().split(/\r?\n/);
  const sep = rows[0]?.includes(";") ? ";" : ",";
  const headers =
    rows
      .shift()
      ?.toLowerCase()
      .replace(/^\uFEFF/, "")
      .split(sep)
      .map((s) => s.trim()) ?? [];
  const required = ["time", "open", "high", "low", "close", "volume"];
  if (
    !required.every((k) => headers.includes(k)) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("Columnas requeridas: time,open,high,low,close,volume");
  const result = rows
    .filter((s) => s.trim())
    .map((row) => {
      const fields = row.split(sep);
      const get = (k: string) => fields[headers.indexOf(k)]?.trim();
      if (required.filter((k) => k !== "volume").some((k) => !get(k)))
        throw new Error("Hay celdas vacías en columnas obligatorias.");
      const raw = get("time");
      if (
        !/^\d+(\.\d+)?$/.test(raw) &&
        !/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(raw)
      )
        throw new Error("Las fechas deben estar en formato ISO o Unix.");
      const time = /^\d+(\.\d+)?$/.test(raw)
        ? Number(raw) * (Number(raw) < 1e12 ? 1000 : 1)
        : Date.parse(raw);
      const c = {
        time,
        open: Number(get("open")),
        high: Number(get("high")),
        low: Number(get("low")),
        close: Number(get("close")),
        volume: get("volume") ? Number(get("volume")) : null,
      };
      if (
        !Object.values(c)
          .filter((value) => value !== null)
          .every(Number.isFinite) ||
        !Number.isFinite(new Date(c.time).getTime()) ||
        (/^\d{4}-\d{2}-\d{2}$/.test(raw) &&
          new Date(time).toISOString().slice(0, 10) !== raw) ||
        c.low > Math.min(c.open, c.close) ||
        c.high < Math.max(c.open, c.close) ||
        (c.volume !== null && c.volume < 0)
      )
        throw new Error("Hay fechas, precios o volúmenes no válidos.");
      return c;
    });
  if (result.length < 2 || result.length > 100000)
    throw new Error("El archivo debe contener entre 2 y 100.000 filas.");
  result.sort((a, b) => a.time - b.time);
  if (result.some((c, i) => i > 0 && c.time === result[i - 1].time))
    throw new Error("Hay fechas duplicadas.");
  return result;
}

export function quoteIsFresh(
  quote: {
    asOf: number;
    fetchedAt?: number;
    delay?: number | null;
    timeKind?: string;
  },
  now = Date.now(),
) {
  return (
    quote.timeKind !== "snapshot" &&
    Number.isFinite(quote.asOf) &&
    Number.isFinite(quote.fetchedAt) &&
    now - quote.asOf >= -60000 &&
    now - quote.asOf <= 300000 + Math.max(0, quote.delay ?? 0) * 60000 &&
    now - quote.fetchedAt! <= 120000
  );
}
export function csv(candles: Candle[]) {
  return (
    "time,open,high,low,close,volume\n" +
    candles
      .map((c) =>
        [
          new Date(c.time).toISOString(),
          c.open,
          c.high,
          c.low,
          c.close,
          c.volume,
        ].join(","),
      )
      .join("\n")
  );
}

export function compareReturns(
  primary: Candle[],
  secondary: Candle[],
  interval: string,
) {
  const key = (t: number) =>
    interval === "1d" ? new Date(t).toISOString().slice(0, 10) : String(t);
  const other = new Map(secondary.map((c) => [key(c.time), c.close]));
  const first = primary.findIndex(
    (c) => c.close > 0 && (other.get(key(c.time)) ?? 0) > 0,
  );
  if (first < 0) return undefined;
  const base = primary[first].close,
    otherBase = other.get(key(primary[first].time))!;
  return {
    base,
    otherBase,
    time: primary[first].time,
    primary: primary.map((c, i) =>
      i < first ? null : (c.close / base - 1) * 100,
    ),
    secondary: primary.map((c, i) =>
      i < first || !other.has(key(c.time))
        ? null
        : (other.get(key(c.time))! / otherBase - 1) * 100,
    ),
  };
}
