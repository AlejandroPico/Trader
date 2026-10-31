# Trader

Terminal personal de análisis de mercados para web y escritorio, sin red social.

[Abrir web](https://alejandropico.github.io/Trader/) · [Paquetes de escritorio](https://github.com/AlejandroPico/Trader/actions/workflows/desktop.yml) · [Tareas](tareas.md) · [Configurar Google](docs/google.md)

## Funciones

- Pestañas, ventanas independientes, temas claro/oscuro y guardado local.
- Velas y líneas, volumen, SMA 20, EMA 50, Bollinger y RSI 14.
- Comparaciones con escala común desde la primera fecha compartida, zoom persistente, mediciones y trazados.
- Seguimiento, búsqueda internacional, filtros, ordenación y mapas por país.
- Importación CSV y exportación de datos, gráficos y espacios.
- Cartera manual por divisa y alertas mientras la aplicación permanece abierta.
- Noticias con editor, fecha y enlace al artículo original.
- Rendimientos estadounidenses a 13 semanas, 5, 10 y 30 años.
- Mapas de PIB, inflación y desempleo de once países, con año y fuente.
- Agenda personal, exportación ICS y enlaces a calendarios oficiales.
- Sincronización manual con Drive, después de configurar Google.
- PWA y paquetes de escritorio para Windows, macOS y Linux.

## Desarrollo

Requisitos: Node.js 26, npm y Python 3.15.2. Angular también admite Node 24.15 o posterior de la serie 24. Las dependencias están fijadas en el proyecto.

```powershell
npm ci
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt
```

Iniciar el servicio de datos en una terminal:

```powershell
.venv/Scripts/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765
```

En otra terminal, ejecutar `npm start` y abrir `http://127.0.0.1:4200`. En macOS/Linux, usar `.venv/bin/python`. En Ajustes se selecciona demostración o proveedores reales.

## Escritorio

En **Actions → Crear escritorio**, abrir una ejecución correcta y descargar el artefacto de tu sistema. GitHub puede solicitar iniciar sesión para descargar artefactos. Descomprimir la carpeta completa. Windows incluye una versión portable y un instalador; no requiere Python ni Node instalados, aunque necesita WebView2. macOS usa WebKit y Linux usa Qt con sus bibliotecas del sistema. Los paquetes no están firmados ni notarizados.

```powershell
python -m pip install -r requirements-desktop.txt
npm run icons
npm run build
python scripts/package_desktop.py
```

Los resultados se guardan en `release/`. El instalador Windows se define en `scripts/trader.iss` y se compila con Inno Setup. `requirements-desktop.lock` recoge el entorno Windows de referencia; para otras plataformas se utilizan los archivos `requirements*.txt`.

El escritorio inicia su servidor en `127.0.0.1:8765`. Si está ocupado, cerrar la otra instancia o el servidor de desarrollo. Google se abre en el navegador habitual; al terminar, pulsar **Devolver al escritorio**. El intercambio local caduca tras diez minutos y no guarda tokens de Google en disco.

## Fuentes y alcance

| Datos | Fuente | Alcance |
| --- | --- | --- |
| Acciones, índices, divisas y futuros | Yahoo Finance, interfaz no oficial | Puede limitar consultas; cobertura y retraso variables. |
| Criptomonedas del catálogo | Binance spot público | Pares contra USDT, que no equivalen a USD. |
| Noticias | Agregación de Yahoo Finance | Titulares y enlaces, sin copiar artículos completos. |
| Rendimientos | Índices de Cboe publicados por Yahoo Finance | Cuatro vencimientos; no representan una curva íntegra. |
| Estadísticas macro | Banco Mundial, World Development Indicators | Datos anuales; cada país muestra su año disponible. |
| Demostración | Series sintéticas reproducibles | No son cotizaciones actuales ni históricos reales. |

Las tablas usan la variación de la última vela diaria frente a la anterior; el gráfico usa el intervalo seleccionado. No se ajustan dividendos ni se calculan impuestos. Las alertas requieren una consulta y cotización recientes, teniendo en cuenta el retraso comunicado. No se ejecutan al cerrar la aplicación ni se activan con datos sintéticos o de mercados cerrados.

Las áreas del mapa de calor tienen pesos ilustrativos, no capitalización real. La cartera conserva la moneda del coste; no suma divisas distintas ni convierte entre ellas. Si la moneda de cotización no coincide, no muestra una valoración equivalente.

CSV: columnas `time,open,high,low,close,volume`, con coma o punto y coma. Fechas ISO o Unix en segundos/milisegundos; entre 2 y 100.000 filas, sin duplicados ni celdas obligatorias vacías. Los CSV permanecen en memoria durante la sesión y deben importarse de nuevo al abrir. Los espacios exportados no incluyen sus archivos.

## Google y privacidad

La aplicación funciona sin cuenta. Para sincronizar, seguir [la guía de Google](docs/google.md). Se usa únicamente la carpeta privada de datos de Trader en Drive. Los tokens permanecen en memoria. Guardar sustituye la copia de Google; recuperar sustituye el espacio local.

[Privacidad](https://alejandropico.github.io/Trader/privacy.html). Las preferencias permanecen en el navegador o perfil de escritorio, salvo exportación o sincronización solicitadas por el usuario.

## Pruebas y despliegue

```powershell
npm test
python -m unittest discover -s tests -p 'test_*.py' -v
npm run build
```

GitHub Actions comprueba código y datos, publica Pages desde `main` y genera los paquetes. Pages debe usar **GitHub Actions** como origen. `npm run build:pages` utiliza `/Trader/`; el escritorio utiliza `/`.

Pages aloja archivos estáticos. Las acciones y herramientas de investigación necesitan ejecutar Python localmente o alojarlo aparte. Cripto consulta directamente su proveedor. La demostración funciona sin conexión después de instalar o almacenar la PWA.

El `Dockerfile` sirve la web y API juntas. En un dominio propio, definir `TRADER_HOSTS` (nombres sin protocolo ni puerto) y `TRADER_ORIGINS` (orígenes completos), separados por comas. Evitar comodines y no guardar credenciales en el repositorio.
