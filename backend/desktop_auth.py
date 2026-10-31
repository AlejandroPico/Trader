"""Single-use, loopback-only return from official Google login in the system browser."""
import copy
import json
import secrets
import threading
import time
from fastapi import APIRouter, Header, HTTPException, Request

class LoginBroker:
    def __init__(self, origin='http://127.0.0.1:8765'):
        self.origin, self.sessions, self.lock = origin, {}, threading.Lock()

    def begin(self):
        with self.lock:
            self.sessions = {k:v for k,v in self.sessions.items() if v['expires'] > time.monotonic()}
            if len(self.sessions) >= 8: raise ValueError('Ya hay un acceso en curso.')
            token = secrets.token_urlsafe(32)
            self.sessions[token] = {'expires': time.monotonic() + 300, 'result': None}
            return token

    def finish(self, token, credential):
        if not isinstance(credential, dict) or set(credential) - {'idToken','accessToken'} or not isinstance(credential.get('idToken'), str) or not credential['idToken'] or len(credential['idToken']) > 16000 or not isinstance(credential.get('accessToken', ''), str) or len(credential.get('accessToken', '')) > 16000:
            raise ValueError('Respuesta de acceso no válida.')
        with self.lock:
            session = self._session(token)
            if session['result'] is not None: raise ValueError('El acceso ya se ha completado.')
            session['result'] = copy.deepcopy(credential)

    def poll(self, token):
        with self.lock:
            session = self._session(token)
            if session['result'] is None: return None
            return self.sessions.pop(token)['result']

    def _session(self, token):
        session = self.sessions.get(token)
        if not session or session['expires'] <= time.monotonic():
            self.sessions.pop(token, None)
            raise ValueError('El acceso ha caducado. Vuelve a iniciarlo desde Trader.')
        return session

router = APIRouter()

@router.post('/api/desktop/auth')
async def finish_login(request: Request, authorization: str = Header(default='')):
    broker = getattr(request.app.state, 'desktop_auth', None)
    if not broker or request.client.host not in ('127.0.0.1', '::1', 'testclient'):
        raise HTTPException(404, 'Acceso de escritorio no disponible.')
    if request.headers.get('origin') != broker.origin: raise HTTPException(403, 'Origen no autorizado.')
    if not authorization.startswith('Bearer '): raise HTTPException(401, 'Acceso no válido.')
    size, chunks = 0, []
    async for chunk in request.stream():
        size += len(chunk)
        if size > 64000: raise HTTPException(413, 'Respuesta de acceso demasiado grande.')
        chunks.append(chunk)
    try: broker.finish(authorization[7:], json.loads(b''.join(chunks)))
    except (ValueError, UnicodeDecodeError) as exc: raise HTTPException(400, str(exc)) from exc
    return {'status': 'ok'}
