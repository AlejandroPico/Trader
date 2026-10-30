"""Read-only market gateway. No brokerage credentials or order execution."""
import asyncio
from collections import OrderedDict
from contextlib import asynccontextmanager
import math
import os
from pathlib import Path
import re
import sys
import time
from urllib.parse import quote

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

SYMBOL = re.compile(r"^[A-Za-z0-9^=._\-]{1,40}$")
INTERVALS = {"1d": "2y", "1h": "1mo", "15m": "5d"}
cache: OrderedDict[str, tuple[float, object]] = OrderedDict()
semaphore = asyncio.Semaphore(6)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(timeout=12, headers={"User-Agent": "Mozilla/5.0 Trader/0.1 (market research)"}, follow_redirects=False) as client:
        app.state.client = client
        yield


app = FastAPI(title="Trader · Datos de mercado", version="0.1.0", lifespan=lifespan)
origins = os.getenv("TRADER_ORIGINS", "http://127.0.0.1:4200,http://localhost:4200,http://127.0.0.1:8765,https://alejandropico.github.io").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=[], allow_credentials=False)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=os.getenv("TRADER_HOSTS", "127.0.0.1,localhost,testserver").split(","))


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


async def upstream(path: str, params: dict):
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        try:
            response = await app.state.client.get(f"https://{host}{path}", params=params)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError):
            continue
    raise HTTPException(502, "El proveedor de mercado no está disponible o ha limitado las consultas. Reintenta más tarde.")


def remember(key: str, data: object, seconds: int):
    cache[key] = (time.monotonic() + seconds, data)
    cache.move_to_end(key)
    while len(cache) > 512:
        cache.popitem(last=False)


def recalled(key: str):
    entry = cache.get(key)
    if entry and entry[0] > time.monotonic():
        cache.move_to_end(key)
        return entry[1]
    return None


def normalize_chart(raw: dict):
    result = raw.get("chart", {}).get("result")
    if not result:
        raise HTTPException(404, "El proveedor no dispone de esa serie.")
    item = result[0]
    bars = item.get("indicators", {}).get("quote", [{}])[0]
    candles = []
    for i, timestamp in enumerate(item.get("timestamp", [])):
        try:
            o, h, low, close = [float(bars[k][i]) for k in ("open", "high", "low", "close")]
            volume = float((bars.get("volume") or [0] * (i + 1))[i] or 0)
            if not all(math.isfinite(n) for n in (o, h, low, close, volume)) or low > min(o, close) or h < max(o, close):
                continue
            candles.append({"time": int(timestamp) * 1000, "open": o, "high": h, "low": low, "close": close, "volume": max(0, volume)})
        except (TypeError, ValueError, KeyError, IndexError):
            continue
    candles = sorted({c["time"]: c for c in candles}.values(), key=lambda c: c["time"])
    if len(candles) < 2:
        raise HTTPException(404, "No hay suficientes velas válidas para representar la serie.")
    meta = item.get("meta", {})
    return {"candles": candles, "source": "Yahoo Finance · " + str(meta.get("exchangeName", "mercado")), "asOf": int(meta.get("regularMarketTime") or candles[-1]["time"] / 1000) * 1000, "fetchedAt": int(time.time() * 1000), "demo": False, "currency": meta.get("currency", ""), "delay": meta.get("exchangeDataDelayedBy")}


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0", "providers": ["Yahoo Finance (interfaz no oficial)", "Binance (consulta directa desde el cliente)"]}


@app.get("/api/history")
async def history(symbol: str = Query(min_length=1, max_length=40), interval: str = "1d"):
    if not SYMBOL.fullmatch(symbol) or interval not in INTERVALS:
        raise HTTPException(422, "Símbolo o intervalo no válido. Intervalos: 15m, 1h, 1d.")
    key = f"history:{symbol}:{interval}"
    if (data := recalled(key)) is not None:
        return data
    async with semaphore:
        if (data := recalled(key)) is not None:
            return data
        raw = await upstream("/v8/finance/chart/" + quote(symbol, safe=""), {"interval": interval, "range": INTERVALS[interval], "includePrePost": "false"})
        data = normalize_chart(raw)
        remember(key, data, 60)
        return data


EXCHANGES = {"NMS": ("Estados Unidos", "US"), "NYQ": ("Estados Unidos", "US"), "NGM": ("Estados Unidos", "US"), "MCE": ("España", "ES"), "PAR": ("Francia", "FR"), "GER": ("Alemania", "DE"), "JPX": ("Japón", "JP"), "SHH": ("China", "CN"), "SHZ": ("China", "CN"), "HKG": ("Hong Kong", "HK"), "LSE": ("Reino Unido", "GB"), "NSI": ("India", "IN"), "BSE": ("India", "IN"), "SAO": ("Brasil", "BR"), "ASX": ("Australia", "AU"), "TOR": ("Canadá", "CA")}


@app.get("/api/search")
async def search(q: str = Query(min_length=2, max_length=80)):
    key = "search:" + q.lower()
    if (data := recalled(key)) is not None:
        return data
    async with semaphore:
        raw = await upstream("/v1/finance/search", {"q": q, "quotesCount": 20, "newsCount": 0})
        data = []
        kinds = {"EQUITY": "Acciones", "ETF": "ETF", "INDEX": "Índices", "CURRENCY": "Divisas", "CRYPTOCURRENCY": "Cripto", "FUTURE": "Futuros"}
        for item in raw.get("quotes", []):
            symbol = item.get("symbol", "")
            if not SYMBOL.fullmatch(symbol) or item.get("quoteType") not in kinds:
                continue
            country, flag = EXCHANGES.get(item.get("exchange"), ("Global", "WW"))
            data.append({"symbol": symbol, "name": item.get("shortname") or item.get("longname") or symbol, "country": country, "flag": flag, "exchange": item.get("exchDisp") or item.get("exchange") or "", "type": kinds[item["quoteType"]], "currency": item.get("currency") or "—", "sector": item.get("sector") or "Otros", "seed": 100, "weight": 10})
        remember(key, data, 300)
        return data


# Keep API routing ahead of the static application mount.
root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[1]))
web = root / "dist" / "trader" / "browser"
if web.is_dir():
    app.mount("/", StaticFiles(directory=web, html=True), name="application")
