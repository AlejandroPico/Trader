import type { Candle } from "./analysis";
import { validatedSeries } from "./market-values";
export interface Asset {
  symbol: string;
  name: string;
  country: string;
  flag: string;
  exchange: string;
  type: string;
  currency: string;
  sector: string;
  industry?: string;
  crypto?: string;
}
export const ASSETS: Asset[] = [
  {
    symbol: "^GSPC",
    name: "S&P 500",
    country: "Estados Unidos",
    flag: "US",
    exchange: "SPX",
    type: "Índices",
    currency: "USD",
    sector: "Índices",
  },
  {
    symbol: "^IXIC",
    name: "Nasdaq Composite",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Índices",
    currency: "USD",
    sector: "Índices",
  },
  {
    symbol: "^DJI",
    name: "Dow Jones",
    country: "Estados Unidos",
    flag: "US",
    exchange: "DJI",
    type: "Índices",
    currency: "USD",
    sector: "Índices",
  },
  {
    symbol: "^IBEX",
    name: "IBEX 35",
    country: "España",
    flag: "ES",
    exchange: "BME",
    type: "Índices",
    currency: "EUR",
    sector: "Índices",
  },
  {
    symbol: "^FCHI",
    name: "CAC 40",
    country: "Francia",
    flag: "FR",
    exchange: "EURONEXT",
    type: "Índices",
    currency: "EUR",
    sector: "Índices",
  },
  {
    symbol: "^GDAXI",
    name: "DAX",
    country: "Alemania",
    flag: "DE",
    exchange: "XETRA",
    type: "Índices",
    currency: "EUR",
    sector: "Índices",
  },
  {
    symbol: "^N225",
    name: "Nikkei 225",
    country: "Japón",
    flag: "JP",
    exchange: "TSE",
    type: "Índices",
    currency: "JPY",
    sector: "Índices",
  },
  {
    symbol: "000001.SS",
    name: "Shanghai Composite",
    country: "China",
    flag: "CN",
    exchange: "SSE",
    type: "Índices",
    currency: "CNY",
    sector: "Índices",
  },
  {
    symbol: "^FTSE",
    name: "FTSE 100",
    country: "Reino Unido",
    flag: "GB",
    exchange: "LSE",
    type: "Índices",
    currency: "GBP",
    sector: "Índices",
  },
  {
    symbol: "^HSI",
    name: "Hang Seng",
    country: "Hong Kong",
    flag: "HK",
    exchange: "HKEX",
    type: "Índices",
    currency: "HKD",
    sector: "Índices",
  },
  {
    symbol: "^BSESN",
    name: "BSE Sensex",
    country: "India",
    flag: "IN",
    exchange: "BSE",
    type: "Índices",
    currency: "INR",
    sector: "Índices",
  },
  {
    symbol: "^BVSP",
    name: "Bovespa",
    country: "Brasil",
    flag: "BR",
    exchange: "B3",
    type: "Índices",
    currency: "BRL",
    sector: "Índices",
  },
  {
    symbol: "^AXJO",
    name: "S&P / ASX 200",
    country: "Australia",
    flag: "AU",
    exchange: "ASX",
    type: "Índices",
    currency: "AUD",
    sector: "Índices",
  },
  {
    symbol: "^GSPTSE",
    name: "S&P / TSX",
    country: "Canadá",
    flag: "CA",
    exchange: "TSX",
    type: "Índices",
    currency: "CAD",
    sector: "Índices",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Acciones",
    currency: "USD",
    sector: "Tecnología",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Acciones",
    currency: "USD",
    sector: "Tecnología",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Acciones",
    currency: "USD",
    sector: "Tecnología",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Acciones",
    currency: "USD",
    sector: "Comunicación",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Acciones",
    currency: "USD",
    sector: "Consumo",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Acciones",
    currency: "USD",
    sector: "Comunicación",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NASDAQ",
    type: "Acciones",
    currency: "USD",
    sector: "Consumo",
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NYSE",
    type: "Acciones",
    currency: "USD",
    sector: "Finanzas",
  },
  {
    symbol: "V",
    name: "Visa",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NYSE",
    type: "Acciones",
    currency: "USD",
    sector: "Finanzas",
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NYSE",
    type: "Acciones",
    currency: "USD",
    sector: "Energía",
  },
  {
    symbol: "JNJ",
    name: "Johnson & Johnson",
    country: "Estados Unidos",
    flag: "US",
    exchange: "NYSE",
    type: "Acciones",
    currency: "USD",
    sector: "Salud",
  },
  {
    symbol: "SAN.MC",
    name: "Banco Santander",
    country: "España",
    flag: "ES",
    exchange: "BME",
    type: "Acciones",
    currency: "EUR",
    sector: "Finanzas",
  },
  {
    symbol: "BBVA.MC",
    name: "BBVA",
    country: "España",
    flag: "ES",
    exchange: "BME",
    type: "Acciones",
    currency: "EUR",
    sector: "Finanzas",
  },
  {
    symbol: "ITX.MC",
    name: "Inditex",
    country: "España",
    flag: "ES",
    exchange: "BME",
    type: "Acciones",
    currency: "EUR",
    sector: "Consumo",
  },
  {
    symbol: "IBE.MC",
    name: "Iberdrola",
    country: "España",
    flag: "ES",
    exchange: "BME",
    type: "Acciones",
    currency: "EUR",
    sector: "Energía",
  },
  {
    symbol: "REP.MC",
    name: "Repsol",
    country: "España",
    flag: "ES",
    exchange: "BME",
    type: "Acciones",
    currency: "EUR",
    sector: "Energía",
  },
  {
    symbol: "TEF.MC",
    name: "Telefónica",
    country: "España",
    flag: "ES",
    exchange: "BME",
    type: "Acciones",
    currency: "EUR",
    sector: "Comunicación",
  },
  {
    symbol: "MC.PA",
    name: "LVMH",
    country: "Francia",
    flag: "FR",
    exchange: "EURONEXT",
    type: "Acciones",
    currency: "EUR",
    sector: "Consumo",
  },
  {
    symbol: "AIR.PA",
    name: "Airbus",
    country: "Francia",
    flag: "FR",
    exchange: "EURONEXT",
    type: "Acciones",
    currency: "EUR",
    sector: "Industria",
  },
  {
    symbol: "SAP.DE",
    name: "SAP",
    country: "Alemania",
    flag: "DE",
    exchange: "XETRA",
    type: "Acciones",
    currency: "EUR",
    sector: "Tecnología",
  },
  {
    symbol: "7203.T",
    name: "Toyota Motor",
    country: "Japón",
    flag: "JP",
    exchange: "TSE",
    type: "Acciones",
    currency: "JPY",
    sector: "Industria",
  },
  {
    symbol: "6758.T",
    name: "Sony Group",
    country: "Japón",
    flag: "JP",
    exchange: "TSE",
    type: "Acciones",
    currency: "JPY",
    sector: "Tecnología",
  },
  {
    symbol: "0700.HK",
    name: "Tencent",
    country: "Hong Kong",
    flag: "HK",
    exchange: "HKEX",
    type: "Acciones",
    currency: "HKD",
    sector: "Comunicación",
  },
  {
    symbol: "600519.SS",
    name: "Kweichow Moutai",
    country: "China",
    flag: "CN",
    exchange: "SSE",
    type: "Acciones",
    currency: "CNY",
    sector: "Consumo",
  },
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries",
    country: "India",
    flag: "IN",
    exchange: "NSE",
    type: "Acciones",
    currency: "INR",
    sector: "Energía",
  },
  {
    symbol: "PETR4.SA",
    name: "Petrobras",
    country: "Brasil",
    flag: "BR",
    exchange: "B3",
    type: "Acciones",
    currency: "BRL",
    sector: "Energía",
  },
  {
    symbol: "SHEL.L",
    name: "Shell",
    country: "Reino Unido",
    flag: "GB",
    exchange: "LSE",
    type: "Acciones",
    currency: "GBp",
    sector: "Energía",
  },
  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    country: "Global",
    flag: "WW",
    exchange: "BINANCE",
    type: "Cripto",
    currency: "USDT",
    sector: "Cripto",
    crypto: "BTCUSDT",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    country: "Global",
    flag: "WW",
    exchange: "BINANCE",
    type: "Cripto",
    currency: "USDT",
    sector: "Cripto",
    crypto: "ETHUSDT",
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    country: "Global",
    flag: "WW",
    exchange: "BINANCE",
    type: "Cripto",
    currency: "USDT",
    sector: "Cripto",
    crypto: "SOLUSDT",
  },
  {
    symbol: "EURUSD=X",
    name: "Euro / Dólar",
    country: "Global",
    flag: "WW",
    exchange: "FOREX",
    type: "Divisas",
    currency: "USD",
    sector: "Divisas",
  },
  {
    symbol: "GBPUSD=X",
    name: "Libra / Dólar",
    country: "Global",
    flag: "WW",
    exchange: "FOREX",
    type: "Divisas",
    currency: "USD",
    sector: "Divisas",
  },
  {
    symbol: "JPY=X",
    name: "Dólar / Yen",
    country: "Global",
    flag: "WW",
    exchange: "FOREX",
    type: "Divisas",
    currency: "JPY",
    sector: "Divisas",
  },
  {
    symbol: "GC=F",
    name: "Oro",
    country: "Global",
    flag: "WW",
    exchange: "COMEX",
    type: "Futuros",
    currency: "USD",
    sector: "Metales",
  },
  {
    symbol: "CL=F",
    name: "Petróleo WTI",
    country: "Global",
    flag: "WW",
    exchange: "NYMEX",
    type: "Futuros",
    currency: "USD",
    sector: "Energía",
  },
  {
    symbol: "SI=F",
    name: "Plata",
    country: "Global",
    flag: "WW",
    exchange: "COMEX",
    type: "Futuros",
    currency: "USD",
    sector: "Metales",
  },
];
export const COUNTRIES = Array.from(new Set(ASSETS.map((a) => a.country)));
export interface Quote {
  timeKind?: "market" | "snapshot";
  price: number;
  change: number;
  volume: number | null;
  asOf: number;
  source: string;

  currency?: string;
  fetchedAt?: number;
  delay?: number | null;
  referenceClose?: number;
  periodStart?: number;
}
export interface Series {
  timeKind?: "market" | "snapshot";
  candles: Candle[];
  source: string;
  asOf: number;

  currency?: string;
  delay?: number | null;
  fetchedAt?: number;
}
export function quoteFrom(series: Series): Quote {
  const c = series.candles;
  const last = c.at(-1)!;
  const prev = c.at(-2)!;
  if (!prev || prev.close === 0)
    throw new Error(
      "No hay un cierre anterior válido para calcular la variación.",
    );
  return {
    price: last.close,
    change: ((last.close - prev.close) / Math.abs(prev.close)) * 100,
    volume: last.volume,
    asOf: series.asOf,
    source: series.source,

    currency: series.currency,
    fetchedAt: series.fetchedAt,
    delay: series.delay,
    referenceClose: prev.close,
    periodStart: last.time,
    timeKind: series.timeKind,
  };
}
export async function requestJson(url: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("No se ha podido contactar con el proveedor de datos.");
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      message = (await response.json()).detail ?? message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
export async function fetchSeries(
  asset: Asset,
  interval: string,
  api: string,
  limit = 500,
): Promise<Series> {
  if (asset.crypto) {
    const values = await requestJson(
      `https://data-api.binance.vision/api/v3/klines?symbol=${asset.crypto}&interval=${interval}&limit=${limit}`,
    );
    if (!Array.isArray(values))
      throw new Error("El proveedor no ha devuelto velas válidas.");
    return validatedSeries({
      candles: values.map((v: (number | string)[]) => {
        if (
          !Array.isArray(v) ||
          v.slice(0, 5).length !== 5 ||
          v
            .slice(0, 5)
            .some(
              (value) =>
                value == null ||
                !["string", "number"].includes(typeof value) ||
                String(value).trim() === "" ||
                !Number.isFinite(Number(value)),
            )
        )
          throw new Error("El proveedor ha devuelto precios incompletos.");
        return {
          time: +v[0],
          open: +v[1],
          high: +v[2],
          low: +v[3],
          close: +v[4],
          volume: v[5] == null ? null : +v[5],
        };
      }),
      source: "Binance · mercado spot · USDT",
      asOf: Date.now(),
      timeKind: "snapshot",
      fetchedAt: Date.now(),

      currency: "USDT",
      delay: 0,
    });
  }
  if (!api)
    throw new Error(
      "El servicio de mercados todavía no está disponible en esta publicación.",
    );
  const raw = await requestJson(
    `${api}/api/history?symbol=${encodeURIComponent(asset.symbol)}&interval=${interval}`,
  );
  if (!raw.candles?.length)
    throw new Error("El proveedor no ha devuelto datos.");
  return validatedSeries(raw);
}
export async function fetchQuote(asset: Asset, api: string): Promise<Quote> {
  if (asset.crypto) return quoteFrom(await fetchSeries(asset, "1d", api, 2));
  if (!api)
    throw new Error(
      "El servicio de mercados todavía no está disponible en esta publicación.",
    );
  return quoteFrom(
    validatedSeries(
      await requestJson(
        `${api}/api/quote?symbol=${encodeURIComponent(asset.symbol)}`,
      ),
    ),
  );
}
