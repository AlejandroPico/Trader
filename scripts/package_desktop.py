"""Build portable desktop bundles on their target operating system."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
icon = "trader.ico" if sys.platform == "win32" else "trader.icns" if sys.platform == "darwin" else "icon-256.png"
subprocess.run([sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--windowed", "--name", "Trader", "--distpath", "release", "--icon", str(root / "public/icons" / icon), "--add-data", f"{root / 'dist/trader/browser'}:dist/trader/browser", "--add-data", f"{root / 'public/icons'}:public/icons", "--collect-all", "webview", "--hidden-import", "uvicorn.logging", "--hidden-import", "uvicorn.loops.auto", "--hidden-import", "uvicorn.protocols.http.auto", "--hidden-import", "uvicorn.lifespan.on", "desktop.py"], cwd=root, check=True)
