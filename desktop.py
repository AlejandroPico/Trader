"""Native window with a bundled Python server; no separate Python installation needed."""
import logging
import os
from pathlib import Path
import socket
import sys
import threading
import time
import webbrowser
from urllib.parse import urlparse
from uuid import UUID

import uvicorn
import webview
import httpx
from backend.main import app
from backend.desktop_sync import SyncBroker


class DesktopBridge:
    def __init__(self, broker):
        self.broker = broker

    def open_sync(self, workspace):
        token = self.broker.begin(workspace)
        webbrowser.open(self.broker.origin + "/?desktop-sync=" + token)
        return token

    def sync_result(self, token):
        return self.broker.poll(token)

    def new_window(self, workspace_id):
        workspace_id = str(UUID(workspace_id))
        webview.create_window("Trader", self.broker.origin+"/?workspace="+workspace_id, width=1440, height=920, min_size=(900,650), js_api=self, background_color="#101318")

    def open_external(self, url):
        parsed=urlparse(url)
        if parsed.scheme not in ("https","http") or parsed.username or parsed.password:
            raise ValueError("Enlace no válido.")
        webbrowser.open(url)


def self_test():
    """Exercise the packaged server and static assets without a display server."""
    sock=socket.socket();sock.bind(('127.0.0.1',0))
    port=sock.getsockname()[1]
    server=uvicorn.Server(uvicorn.Config(app,host='127.0.0.1',port=port,log_config=None,access_log=False))
    thread=threading.Thread(target=lambda:server.run(sockets=[sock]),daemon=True);thread.start()
    try:
        for _ in range(150):
            if server.started:break
            time.sleep(.02)
        with httpx.Client(base_url=f'http://127.0.0.1:{port}',timeout=3) as client:
            assert client.get('/api/health').json()['status']=='ok'
            assert 'trader-app' in client.get('/').text
            assert '<svg' in client.get('/favicon.svg').text
            assert client.get('/icons/trader.ico').content[:4]==b'\x00\x00\x01\x00'
    finally:
        server.should_exit=True;thread.join(timeout=5);sock.close()


def main():
    root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    if not (root / "dist/trader/browser/index.html").is_file():
        raise RuntimeError("Compila la interfaz con npm run build antes de iniciar el escritorio.")
    # A fixed origin preserves browser storage across launches. Fail rather than attach
    # the desktop window to an unrelated service already occupying this port.
    sock = socket.socket()
    try:
        sock.bind(("127.0.0.1", 8765))
    except OSError as exc:
        raise RuntimeError("El puerto 8765 está ocupado. Cierra la otra instancia de Trader.") from exc
    config = uvicorn.Config(app, host="127.0.0.1", port=8765, log_config=None, access_log=False)
    server = uvicorn.Server(config)
    thread = threading.Thread(target=lambda: server.run(sockets=[sock]), daemon=True)
    thread.start()
    for _ in range(100):
        if server.started:
            break
        if not thread.is_alive():
            raise RuntimeError("No se pudo iniciar el servicio de datos.")
        time.sleep(.1)
    else:
        raise RuntimeError("El servicio de datos no ha respondido.")
    broker = SyncBroker()
    app.state.desktop_sync = broker
    bridge = DesktopBridge(broker)
    window = webview.create_window("Trader", broker.origin, width=1500, height=980, min_size=(900, 650), background_color="#101318", js_api=bridge)
    storage = Path(os.getenv("LOCALAPPDATA", Path.home() / ".local/share")) / "Trader" / "WebView"
    storage.mkdir(parents=True, exist_ok=True)
    try:
        icon = "trader.ico" if sys.platform=="win32" else "trader.icns" if sys.platform=="darwin" else "icon-256.png"
        webview.start(private_mode=False, storage_path=str(storage), icon=str(root / "public/icons" / icon))
    finally:
        server.should_exit = True
        thread.join(timeout=5)
        sock.close()


if __name__ == "__main__":
    try:
        if '--self-test' in sys.argv:self_test()
        else:main()
    except Exception:
        logging.exception("No se pudo iniciar Trader")
        if sys.platform == "win32" and '--self-test' not in sys.argv:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, "No se pudo iniciar Trader. Comprueba que no esté ya abierto y que WebView2 esté instalado.", "Trader", 16)
        raise
