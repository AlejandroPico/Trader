"""Read-only market gateway. No brokerage credentials or order execution."""
import asyncio
from collections import OrderedDict
from contextlib import asynccontextmanager
import math
import json
import os
from pathlib import Path
import re
import sys
import time
from datetime import datetime,timezone
from urllib.parse import quote

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from backend.desktop_auth import router as auth_router

SYMBOL = re.compile(r"^[A-Za-z0-9^=._\-]{1,40}$")
INTERVALS = {"1d": "2y", "1h": "1mo", "15m": "5d"}
cache: OrderedDict[str, tuple[float, object]] = OrderedDict()
semaphore = asyncio.Semaphore(6)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(timeout=12, headers={"User-Agent": "Mozilla/5.0 Trader/0.1 (market research)"}, follow_redirects=False) as client:
        app.state.client = client
        yield


app = FastAPI(title="Trader · Datos de mercado", version="0.2.0", lifespan=lifespan)
app.include_router(auth_router)
origins = os.getenv("TRADER_ORIGINS", "http://127.0.0.1:4200,http://localhost:4200,http://127.0.0.1:8765,https://alejandropico.github.io").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=[], allow_credentials=False)
allowed_hosts = os.getenv('TRADER_HOSTS', '127.0.0.1,localhost,testserver').split(',')
if os.getenv('RENDER_EXTERNAL_HOSTNAME'): allowed_hosts.append(os.environ['RENDER_EXTERNAL_HOSTNAME'])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)


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
            volumes = bars.get('volume') or []
            volume = float(volumes[i]) if i < len(volumes) and volumes[i] is not None else None
            if volume is not None and (not math.isfinite(volume) or volume < 0): volume = None
            if not all(math.isfinite(n) for n in (o, h, low, close)) or low > min(o, close) or h < max(o, close):
                continue
            candles.append({"time": int(timestamp) * 1000, "open": o, "high": h, "low": low, "close": close, "volume": volume})
        except (TypeError, ValueError, KeyError, IndexError):
            continue
    candles = sorted({c["time"]: c for c in candles}.values(), key=lambda c: c["time"])
    if len(candles) < 2:
        raise HTTPException(404, "No hay suficientes velas válidas para representar la serie.")
    meta = item.get("meta", {})
    return {"candles": candles, "source": "Yahoo Finance · " + str(meta.get("exchangeName", "mercado")), "asOf": int(meta.get("regularMarketTime") or candles[-1]["time"] / 1000) * 1000, "fetchedAt": int(time.time() * 1000), "currency": meta.get("currency", ""), "delay": meta.get("exchangeDataDelayedBy")}


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.2.0", "providers": ["Yahoo Finance (interfaz no oficial)", "Binance (consulta directa desde el cliente)"]}


@app.get('/app-config.json')
async def runtime_config():
    raw = os.getenv('TRADER_FIREBASE_CONFIG', '').strip()
    base = {'sameOriginMarketApi':True}
    if not raw:
        try: raw=json.dumps(json.loads((web/'app-config.json').read_text(encoding='utf-8')).get('firebase',{}))
        except (OSError,ValueError): return base
    try:
        value = json.loads(raw)
        required = ('apiKey','authDomain','projectId','appId')
        if not all(isinstance(value.get(key),str) and value[key] for key in required): return base
        return {**base,'firebase':{key:value[key] for key in (*required,'storageBucket','messagingSenderId') if isinstance(value.get(key),str)}}
    except (ValueError,TypeError,AttributeError): return base


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
        remember(key, data, 30)
        return data


@app.get('/api/quote')
async def market_quote(symbol: str = Query(min_length=1, max_length=40)):
    if not SYMBOL.fullmatch(symbol): raise HTTPException(422, 'Símbolo no válido.')
    key = 'quote:' + symbol
    if (data := recalled(key)) is not None: return data
    async with semaphore:
        if (data := recalled(key)) is not None: return data
        raw = await upstream('/v8/finance/chart/' + quote(symbol, safe=''), {'interval': '1d', 'range': '5d', 'includePrePost': 'false'})
        data = normalize_chart(raw)
        remember(key, data, 30)
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
            country, flag = EXCHANGES.get(item.get("exchange"), ("Sin país identificado", "—"))
            data.append({"symbol": symbol, "name": item.get("shortname") or item.get("longname") or symbol, "country": country, "flag": flag, "exchange": item.get("exchDisp") or item.get("exchange") or "", "type": kinds[item["quoteType"]], "currency": item.get("currency") or "—", "sector": item.get("sector") or "Otros"})
        remember(key, data, 300)
        return data


@app.get('/api/classification')
async def classification(symbol: str = Query(min_length=1, max_length=40)):
    if not SYMBOL.fullmatch(symbol): raise HTTPException(422, 'Símbolo no válido.')
    key = 'classification:' + symbol
    if (data := recalled(key)) is not None: return data
    async with semaphore:
        raw = await upstream('/v1/finance/search', {'q':symbol,'quotesCount':10,'newsCount':0})
        exact = next((q for q in raw.get('quotes',[]) if q.get('symbol') == symbol), None)
        if exact is None: raise HTTPException(404, 'No se ha recibido la clasificación de ese activo.')
        data = {'symbol':symbol,'sector':exact.get('sector') or None,'industry':exact.get('industry') or None,'source':'Yahoo Finance'}
        remember(key,data,86400)
        return data


@app.get('/api/news')
async def news(symbol:str=Query(default='^GSPC',max_length=40)):
    if not SYMBOL.fullmatch(symbol):
        raise HTTPException(422,'Símbolo no válido.')
    key='news:'+symbol
    if (data:=recalled(key)) is not None:return data
    async with semaphore:
        raw=await upstream('/v1/finance/search',{'q':symbol,'quotesCount':0,'newsCount':12})
        items=[]
        for item in raw.get('news',[]):
            link=item.get('link','')
            if not link.startswith('https://') or not item.get('title'):continue
            items.append({'id':item.get('uuid',link),'title':item['title'],'publisher':item.get('publisher',''),'url':link,'time':int(item.get('providerPublishTime',0))*1000})
        data={'source':'Yahoo Finance · agregación de titulares','items':items,'fetchedAt':int(time.time()*1000)}
        remember(key,data,300);return data


@app.get('/api/yields')
async def yields():
    key='yields'
    if (data:=recalled(key)) is not None:return data
    async def point(symbol,label,years):
        try:
            async with semaphore:
                raw=await upstream('/v8/finance/chart/'+quote(symbol,safe=''),{'interval':'1d','range':'1mo'})
                series=normalize_chart(raw)
            return {'symbol':symbol,'label':label,'years':years,'value':series['candles'][-1]['close'],'previous':series['candles'][-2]['close'],'asOf':series['asOf'],'previousTime':series['candles'][-2]['time']}
        except HTTPException:return {'symbol':symbol,'label':label,'years':years,'value':None,'previous':None,'asOf':None,'previousTime':None}
    points=await asyncio.gather(point('^IRX','13 semanas',.25),point('^FVX','5 años',5),point('^TNX','10 años',10),point('^TYX','30 años',30))
    if not any(p['value'] is not None for p in points):raise HTTPException(502,'No se han podido consultar los rendimientos.')
    data={'points':points,'source':'Índices de rendimiento de Cboe · Yahoo Finance','fetchedAt':int(time.time()*1000),'unit':'%','country':'Estados Unidos'}
    remember(key,data,300);return data


MACRO_COUNTRIES={'USA':'Estados Unidos','ESP':'España','FRA':'Francia','DEU':'Alemania','JPN':'Japón','CHN':'China','GBR':'Reino Unido','IND':'India','BRA':'Brasil','AUS':'Australia','CAN':'Canadá'}
MACRO_INDICATORS={'gdp':('NY.GDP.MKTP.KD.ZG','PIB real · crecimiento anual'),'inflation':('FP.CPI.TOTL.ZG','Inflación · IPC anual'),'unemployment':('SL.UEM.TOTL.ZS','Desempleo · estimación OIT')}


@app.get('/api/macro')
async def macro(indicator:str='gdp'):
    if indicator not in MACRO_INDICATORS:raise HTTPException(422,'Indicador no válido.')
    key='macro:'+indicator
    if (data:=recalled(key)) is not None:return data
    code,label=MACRO_INDICATORS[indicator]
    year=datetime.now(timezone.utc).year
    async with semaphore:
        try:
            response=await app.state.client.get('https://api.worldbank.org/v2/country/'+';'.join(MACRO_COUNTRIES)+'/indicator/'+code,params={'format':'json','per_page':1000,'date':f'{year-6}:{year}'})
            response.raise_for_status();raw=response.json()
            if not isinstance(raw,list) or len(raw)<2 or not isinstance(raw[1],list):raise ValueError('Respuesta vacía')
        except (httpx.HTTPError,ValueError):raise HTTPException(502,'Las estadísticas del Banco Mundial no están disponibles.')
    countries=[]
    for country,name in MACRO_COUNTRIES.items():
        values=sorted([{'year':int(r['date']),'value':float(r['value'])} for r in raw[1] if r.get('countryiso3code')==country and r.get('value') is not None and math.isfinite(float(r['value']))],key=lambda r:r['year'])
        countries.append({'code':country,'country':name,'values':values,'value':values[-1]['value'] if values else None,'year':values[-1]['year'] if values else None})
    data={'countries':countries,'indicator':indicator,'label':label,'source':'Banco Mundial · World Development Indicators','updated':raw[0].get('lastupdated'),'url':'https://data.worldbank.org/indicator/'+code,'unit':'%'}
    remember(key,data,3600);return data


# Keep API routing ahead of the static application mount.
root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[1]))
web = root / "dist" / "trader" / "browser"
if web.is_dir():
    app.mount("/", StaticFiles(directory=web, html=True), name="application")
