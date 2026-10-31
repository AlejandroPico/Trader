# Trader

Terminal personal de consulta y análisis de mercados para web y escritorio.

[Abrir web](https://alejandropico.github.io/Trader/) · [Paquetes de escritorio](https://github.com/AlejandroPico/Trader/actions/workflows/desktop.yml) · [Tareas](tareas.md) · [Activar Google](docs/google.md) · [Publicar cotizaciones](docs/servidor.md)

## Interfaz

- Una barra de pestañas, menú desplegable desde el icono y cuenta independiente.
- Gráficos con velas, líneas, volumen, SMA, EMA, Bollinger, RSI, comparación, mediciones y trazados.
- Vistas de mercado en tabla y mapa vectorial con proyección Natural Earth, zoom y selección de países.
- Mapas de calor para acciones, cripto e índices; sectores e industrias con navegación jerárquica. Superficie uniforme o por volumen publicado, sin asignar capitalizaciones desconocidas.
- Seguimiento, búsqueda internacional, filtros, ordenación, cartera manual por divisa y alertas durante la sesión.
- Noticias enlazadas, rendimientos de cuatro vencimientos estadounidenses, estadísticas anuales del Banco Mundial y agenda personal exportable.
- Copias locales, CSV, imágenes, temas claro/oscuro, PWA y paquetes nativos.
- Acceso oficial de Google mediante Firebase Authentication y sincronización automática de perfiles con Firestore, pendiente de activar en el proyecto del propietario.

## Datos

Las cotizaciones se reciben de proveedores. Una respuesta ausente o inválida produce un dato vacío o un error; al fallar una actualización se conserva el último gráfico válido con aviso y fecha.

| Contenido                            | Fuente y alcance                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Acciones, índices, divisas y futuros | Yahoo Finance, interfaz no oficial; cobertura y retrasos variables.                                                             |
| Cripto                               | Binance spot contra USDT; flujo de velas y consultas REST. Sus símbolos son BTCUSDT, ETHUSDT y SOLUSDT. USDT no equivale a USD. |
| Clasificación de acciones            | Sectores e industrias recibidos de Yahoo Finance; campos ausentes sin clasificación detallada.                                  |
| Noticias                             | Titulares, editor y enlaces agregados por Yahoo Finance.                                                                        |
| Rendimientos                         | Índices de Cboe; 13 semanas, 5, 10 y 30 años.                                                                                   |
| Macroeconomía                        | World Development Indicators del Banco Mundial; año disponible por país.                                                        |
| Cartografía                          | Natural Earth mediante world-atlas y D3 Geo; nombres ISO localizados.                                                           |

Las variaciones de mercado se calculan frente al cierre de la sesión anterior. Las velas cripto diarias siguen UTC. El gráfico puede usar otro intervalo, sin cambiar la referencia diaria del encabezado. Las alertas comprueban la antigüedad del dato y el retraso comunicado. No funcionan con la aplicación cerrada.

El catálogo inicial contiene 50 instrumentos internacionales y se amplía mediante búsqueda. El mapa permite seleccionar otros países; un país sin instrumentos del catálogo no recibe cotizaciones inventadas. La disponibilidad de cualquier símbolo depende del proveedor. No se garantiza tiempo real ni cobertura universal con esta interfaz de datos.

## Desarrollo

Node 26 y Python 3.15.2. También se admite Node 24.15 o posterior de la serie 24.

```powershell
npm ci
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765
```

En otra terminal: `npm start`, y abrir `http://127.0.0.1:4200`. En macOS/Linux utilizar `.venv/bin/python`.

```powershell
npm test
python -m unittest discover -s tests -p test_*.py
npm run build
```

La configuración del propietario se incorpora desde las variables `TRADER_API_URL` y `TRADER_FIREBASE_CONFIG`. Para desarrollo puede usarse `.env.local` a partir de `.env.example`. No se introducen esos ajustes en la interfaz de cuenta.

## Web y escritorio

Pages aloja la interfaz. Para las cotizaciones que requieren Python, seguir la [guía del servidor](docs/servidor.md). Cripto consulta directamente a Binance. El `Dockerfile` permite alojar interfaz y servicio en el mismo servidor.

En **Actions → Crear escritorio**, descargar el artefacto del sistema y descomprimirlo completo. Windows incluye portable e instalador; no requiere Python ni Node, pero necesita WebView2. macOS usa WebKit y Linux Qt. Los paquetes no están firmados ni notarizados.

Para compilar: instalar `requirements-desktop.txt`, ejecutar `npm run icons`, `npm run build` y `python scripts/package_desktop.py`. Los paquetes aparecen en `release/`. El escritorio utiliza el puerto local 8765 y no se conecta a una instancia ajena si está ocupado.

## Perfiles y archivos

La [configuración de Google](docs/google.md) se realiza una vez. Al iniciar sesión se recupera el perfil de la cuenta; los cambios se guardan automáticamente. El acceso nativo se abre en el navegador del sistema y vuelve automáticamente, con una respuesta local de un solo uso que caduca en cinco minutos. Los permisos no incluyen documentos de Google.

La cartera es un registro manual, sin conexión con intermediarios ni órdenes. No suma monedas diferentes ni convierte divisas. Los CSV se mantienen durante la sesión y no se suben al perfil. Columnas: `time,open,high,low,close,volume`; el volumen puede quedar vacío si no se conoce. Las fechas deben ser ISO o Unix, con entre 2 y 100.000 filas sin duplicados. Exportar un espacio no incluye archivos importados.

La política de privacidad se encuentra en [`public/privacy.html`](public/privacy.html).
