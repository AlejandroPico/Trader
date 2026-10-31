"""Run the built application, not the development Python environment."""
from pathlib import Path
import subprocess
import sys
root=Path(__file__).resolve().parents[1]
exe=root/('release/Trader/Trader.exe' if sys.platform=='win32' else 'release/Trader.app/Contents/MacOS/Trader' if sys.platform=='darwin' else 'release/Trader/Trader')
subprocess.run([str(exe),'--self-test'],cwd=root,check=True,timeout=40)
print('Paquete verificado: servicio, interfaz e iconos.')
