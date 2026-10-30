"""Native window with a bundled Python server; no separate Python installation needed."""
import logging
import os
from pathlib import Path
import socket
import sys
import threading
import time
import webbrowser
from urllib.request import urlopen

import uvicorn
import webview
from backend.main import app


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
    window = webview.create_window("Trader", "http://127.0.0.1:8765", width=1500, height=980, min_size=(900, 650), background_color="#101318")
    def new_window(url):
        if str(url).startswith(("http://127.0.0.1:8765", "https://accounts.google.com/")):
            webbrowser.open(url)
    # External links are opened by pywebview's default browser handling.
    storage = Path(os.getenv("LOCALAPPDATA", Path.home() / ".local/share")) / "Trader" / "WebView"
    storage.mkdir(parents=True, exist_ok=True)
    try:
        webview.start(private_mode=False, storage_path=str(storage), icon=str(root / "public/icons/icon-256.png"))
    finally:
        server.should_exit = True
        thread.join(timeout=5)
        sock.close()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        logging.exception("No se pudo iniciar Trader")
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, "No se pudo iniciar Trader. Comprueba que no esté ya abierto y que WebView2 esté instalado.", "Trader", 16)
        raise
