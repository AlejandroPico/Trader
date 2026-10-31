"""Short-lived, local-only workspace handoff to the system browser."""
import copy
import json
import secrets
import threading
import time

from fastapi import APIRouter, Header, HTTPException, Request


class SyncBroker:
    def __init__(self, origin="http://127.0.0.1:8765"):
        self.origin = origin
        self.sessions = {}
        self.lock = threading.Lock()

    def begin(self, workspace):
        validate_workspace(workspace)
        with self.lock:
            self.sessions = {k:v for k,v in self.sessions.items() if v["expires"] > time.monotonic()}
            if len(self.sessions) >= 8:
                raise ValueError("Ya hay una sincronización en curso. Espera o cierra la anterior.")
            token = secrets.token_urlsafe(32)
            self.sessions[token] = {"expires":time.monotonic()+600,"workspace":copy.deepcopy(workspace),"result":None}
            return token

    def read(self, token):
        with self.lock:
            return copy.deepcopy(self._session(token)["workspace"])

    def finish(self, token, workspace):
        validate_workspace(workspace)
        with self.lock:
            session = self._session(token)
            if session["result"] is not None:
                raise ValueError("La sincronización ya se ha enviado.")
            session["result"] = copy.deepcopy(workspace)

    def poll(self, token):
        with self.lock:
            session = self._session(token)
            if session["result"] is None:
                return None
            self.sessions.pop(token)
            return session["result"]

    def _session(self, token):
        session = self.sessions.get(token)
        if not session or session["expires"] <= time.monotonic():
            self.sessions.pop(token, None)
            raise ValueError("La conexión con el escritorio ha caducado. Vuelve a abrirla desde la aplicación.")
        return session


def validate_workspace(workspace):
    if not isinstance(workspace,dict) or workspace.get("version")!=1 or not isinstance(workspace.get("tabs"),list) or len(json.dumps(workspace)) > 10_000_000:
        raise ValueError("Espacio de trabajo no válido.")


router = APIRouter()


def broker_for(request, authorization):
    broker = getattr(request.app.state,"desktop_sync",None)
    if not broker or request.client.host not in ("127.0.0.1","::1","testclient"):
        raise HTTPException(404,"Conexión de escritorio no disponible.")
    origin = request.headers.get("origin")
    if origin and origin != broker.origin:
        raise HTTPException(403,"Origen no autorizado.")
    if not authorization.startswith("Bearer "):
        raise HTTPException(401,"Conexión de escritorio no válida.")
    return broker,authorization[7:]


@router.get("/api/desktop/sync")
async def get_sync(request:Request, authorization:str=Header(default="")):
    broker,token=broker_for(request,authorization)
    try:
        return broker.read(token)
    except ValueError as exc:
        raise HTTPException(410,str(exc)) from exc


@router.post("/api/desktop/sync")
async def finish_sync(request:Request, authorization:str=Header(default="")):
    broker,token=broker_for(request,authorization)
    size=0;chunks=[]
    async for chunk in request.stream():
        size+=len(chunk)
        if size>10_000_000:
            raise HTTPException(413,"El espacio supera 10 MB.")
        chunks.append(chunk)
    try:
        broker.finish(token,json.loads(b"".join(chunks)))
    except (ValueError,UnicodeDecodeError) as exc:
        raise HTTPException(400,str(exc)) from exc
    return {"status":"ok"}
