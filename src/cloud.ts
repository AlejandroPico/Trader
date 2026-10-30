import {requestJson} from './market';
import {validateState,Workspace} from './state';
declare const google:any;
export class Cloud {
 private token='';private expires=0;private file='';email='';
 async connect(clientId:string):Promise<void>{
  if(!clientId.endsWith('.apps.googleusercontent.com'))throw new Error('Introduce el ID de cliente OAuth de Google en Ajustes.');
  if(typeof google==='undefined')await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=()=>resolve();script.onerror=()=>reject(new Error('No se pudo cargar el acceso a Google.'));document.head.append(script);});
  await new Promise<void>((resolve,reject)=>google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'openid email https://www.googleapis.com/auth/drive.appdata',callback:(r:any)=>{if(r.error){reject(new Error(r.error));return;}this.token=r.access_token;this.expires=Date.now()+r.expires_in*1000;resolve();},error_callback:()=>reject(new Error('Acceso cancelado o ventana bloqueada.'))}).requestAccessToken());
  const profile=await this.get('https://www.googleapis.com/oauth2/v3/userinfo');this.email=profile.email;
 }
 disconnect(){if(this.token&&typeof google!=='undefined')google.accounts.oauth2.revoke(this.token,()=>{});this.token='';this.email='';this.file='';this.expires=0;}
 private headers(){if(!this.token||Date.now()>=this.expires)throw new Error('La sesión de Google ha caducado. Conecta de nuevo.');return {Authorization:`Bearer ${this.token}`};}
 private get(url:string){return requestJson(url,{headers:this.headers()});}
 private async find(){const data=await this.get("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'trader-workspace.json'%20and%20trashed%3Dfalse&fields=files(id,modifiedTime)&orderBy=modifiedTime%20desc");this.file=data.files?.[0]?.id??'';return this.file;}
 async load():Promise<Workspace>{if(!await this.find())throw new Error('Esta cuenta todavía no tiene un espacio guardado.');return validateState(await this.get(`https://www.googleapis.com/drive/v3/files/${this.file}?alt=media`));}
 async save(workspace:Workspace){if(!await this.find()){const file=await requestJson('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{...this.headers(),'Content-Type':'application/json'},body:JSON.stringify({name:'trader-workspace.json',parents:['appDataFolder']})});this.file=file.id;}
  const copy={...workspace,googleClient:'',api:'http://127.0.0.1:8765'};await requestJson(`https://www.googleapis.com/upload/drive/v3/files/${this.file}?uploadType=media`,{method:'PATCH',headers:{...this.headers(),'Content-Type':'application/json'},body:JSON.stringify(copy)});
 }
}
