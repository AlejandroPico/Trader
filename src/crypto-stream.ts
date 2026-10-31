import type { Asset } from "./market";
import type { Candle } from "./analysis";

/** Public exchange messages only. Reconnects never create or interpolate candles. */
export class CryptoStream {
  private socket?: WebSocket;
  private timer?: ReturnType<typeof setTimeout>;
  private key = "";
  private generation = 0;
  constructor(
    private receive: (
      symbol: string,
      interval: string,
      candle: Candle,
      timestamp: number,
    ) => void,
  ) {}
  subscribe(assets: Asset[], selected: Asset, interval: string) {
    const symbols = new Map(
      assets.filter((a) => a.crypto).map((a) => [a.crypto!, a.symbol]),
    );
    const streams = [...symbols.keys()].map(
      (symbol) => `${symbol.toLowerCase()}@kline_1d`,
    );
    if (selected.crypto && interval !== "1d")
      streams.push(`${selected.crypto.toLowerCase()}@kline_${interval}`);
    const key = streams.sort().join("/");
    if (key === this.key) return;
    this.close();
    this.key = key;
    if (!key) return;
    const generation = this.generation;
    const connect = () => {
      if (generation !== this.generation) return;
      const socket = new WebSocket(
        "wss://data-stream.binance.vision/stream?streams=" + key,
      );
      this.socket = socket;
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data).data,
            k = data?.k;
          if (generation !== this.generation || !k || data.e !== "kline")
            return;
          const symbol = symbols.get(k.s);
          const candle = {
            time: +k.t,
            open: +k.o,
            high: +k.h,
            low: +k.l,
            close: +k.c,
            volume: +k.v,
          };
          if (
            !symbol ||
            !Object.values(candle).every(Number.isFinite) ||
            !Number.isFinite(data.E) ||
            candle.volume < 0 ||
            candle.low > Math.min(candle.open, candle.close) ||
            candle.high < Math.max(candle.open, candle.close)
          )
            return;
          this.receive(symbol, k.i, candle, data.E);
        } catch {
          /* A malformed message is discarded; last verified data stays visible. */
        }
      };
      socket.onclose = () => {
        if (generation === this.generation)
          this.timer = setTimeout(connect, 5000);
      };
      socket.onerror = () => socket.close();
    };
    connect();
  }
  close() {
    ++this.generation;
    clearTimeout(this.timer);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onmessage = null;
      this.socket.close();
    }
    this.socket = undefined;
    this.key = "";
  }
}
