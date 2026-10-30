import type {Asset} from './market';
export type View='overview'|'chart'|'markets'|'heatmap'|'screener'|'portfolio'|'alerts';
export interface Drawing {start:number;end:number;y1:number;y2:number}
export interface Tab {id:string;view:View;symbol:string;interval:string;kind:string;indicators:string[];drawings:Drawing[];compare:string}
export interface Alert {id:string;symbol:string;price:number;direction:string;triggered:boolean}
export interface Position {id:string;symbol:string;quantity:number;cost:number}
export interface Workspace {version:1;tabs:Tab[];active:string;watchlist:string[];alerts:Alert[];positions:Position[];customAssets:Asset[];mode:'demo'|'live';theme:'dark'|'light';api:string;googleClient:string}
export function newTab(view:View,symbol='^GSPC'):Tab{return {id:crypto.randomUUID(),view,symbol,interval:'1d',kind:'candlestick',indicators:['SMA 20'],drawings:[],compare:''};}
export function fresh():Workspace{const tab=newTab('overview');return {version:1,tabs:[tab],active:tab.id,watchlist:['^GSPC','^IBEX','^GDAXI','^N225','AAPL','NVDA','BTC-USD','EURUSD=X','GC=F'],alerts:[],positions:[],customAssets:[],mode:'demo',theme:'dark',api:location.port==='8765'?location.origin:'http://127.0.0.1:8765',googleClient:''};}
export function validateState(raw:unknown):Workspace {
 const w=raw as Workspace;const views=['overview','chart','markets','heatmap','screener','portfolio','alerts'];
 if(!w||w.version!==1||!Array.isArray(w.tabs)||!w.tabs.length||w.tabs.length>100||!Array.isArray(w.watchlist)||w.watchlist.length>20000||!w.watchlist.every(s=>typeof s==='string'&&s.length<100)||!Array.isArray(w.alerts)||!Array.isArray(w.positions))throw new Error('Archivo de espacio de trabajo no válido.');
 for(const t of w.tabs){if(!t||typeof t.id!=='string'||!views.includes(t.view)||typeof t.symbol!=='string'||!['1d','1h','15m'].includes(t.interval)||!['candlestick','line','bar'].includes(t.kind)||!Array.isArray(t.indicators)||!t.indicators.every(i=>['SMA 20','EMA 50','Bollinger','RSI 14'].includes(i))||!Array.isArray(t.drawings)||!t.drawings.every(d=>[d.start,d.end,d.y1,d.y2].every(Number.isFinite)))throw new Error('Pestaña no válida.');t.compare=typeof t.compare==='string'?t.compare:'';}
 if(new Set(w.tabs.map(t=>t.id)).size!==w.tabs.length||!w.tabs.some(t=>t.id===w.active))throw new Error('Pestaña activa no válida.');
 if(!w.alerts.every(a=>a&&typeof a.id==='string'&&typeof a.symbol==='string'&&Number.isFinite(a.price)&&a.price>0&&['above','below'].includes(a.direction)&&typeof a.triggered==='boolean'))throw new Error('Alerta no válida.');
 if(!w.positions.every(p=>p&&typeof p.id==='string'&&typeof p.symbol==='string'&&Number.isFinite(p.quantity)&&p.quantity>0&&Number.isFinite(p.cost)&&p.cost>0))throw new Error('Posición no válida.');
 if(!['demo','live'].includes(w.mode)||!['dark','light'].includes(w.theme)||typeof w.api!=='string'||typeof w.googleClient!=='string')throw new Error('Configuración no válida.');
 w.customAssets??=[];if(!Array.isArray(w.customAssets)||w.customAssets.length>20000||!w.customAssets.every(a=>a&&['symbol','name','country','flag','exchange','type','currency','sector'].every(k=>typeof (a as any)[k]==='string')&&Number.isFinite(a.seed)&&Number.isFinite(a.weight)))throw new Error('Catálogo personalizado no válido.');
 const api=new URL(w.api);if(!['https:','http:'].includes(api.protocol)||api.username||api.password)throw new Error('URL de datos no válida.');return structuredClone(w);
}
