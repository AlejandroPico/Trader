# Seguimiento de Trader

Actualizado: 31 de octubre de 2026 · revisión 0.2.0.

## Regla de trabajo

Trabajar, confirmar y subir directamente a **main**. No crear ramas salvo petición expresa del usuario. El usuario autoriza las subidas. Mantener este archivo al continuar.

## Corrección de la presentación y los datos

- [x] Retirados el generador de precios, los valores de partida, los pesos inventados y la selección de modos de datos.
- [x] Migración del espacio antiguo: se conservan preferencias y registros manuales; se eliminan opciones retiradas y trazados/zoom derivados de las series anteriores.
- [x] Solo respuestas de proveedores; fuente, fecha, retraso y errores visibles. El volumen ausente no se convierte en cero.
- [x] Cotizaciones ligeras, caché de 30 segundos y flujo de velas Binance con reconexión.
- [x] Un fallo de actualización conserva el gráfico anterior y avisa, sin sustituirlo por datos generados.
- [x] Una barra superior compacta de pestañas, favicon que despliega el menú y círculo de cuenta al final.
- [x] Marca **Trader**, sin punto decorativo. Eliminadas la barra de estado y las señales de conexión permanentes.
- [x] El menú cambia la vista actual. Los activos y el botón más abren pestañas explícitamente.
- [x] Gráfico principal ampliado, índices resumidos y seguimiento conservado.
- [x] Ajustes y cuenta separados; tema dentro de ajustes.
- [x] Acerca de con versión, autor, portfolio y repositorio.
- [x] Buscador centrado y limitado por el tamaño real de la ventana.
- [x] Mercados con tabla/mapa internos; cartografía SVG con proyección Natural Earth, zoom y selección de países.
- [x] Mapa de calor por sectores e industrias del proveedor; tres vistas y navegación jerárquica. Área uniforme o volumen disponible.
- [x] Persistencia de filtros, tipo de vista, preferencias, pestañas, seguimiento y trazados.

## Cuenta y despliegue: dependencias pendientes del propietario

- [x] SDK oficial Firebase: acceso Google, cierre de sesión, perfiles y sincronización automática con Firestore.
- [x] Reglas de acceso por usuario; cambios pendientes y recuperación al reconectar.
- [x] Acceso nativo mediante navegador y retorno automático. Pruebas de aislamiento, caducidad, origen y uso único.
- [x] Variables del propietario fuera de la interfaz; configuración compartida por Pages y los paquetes de escritorio.
- [x] Guías actualizadas: `docs/google.md` y `docs/servidor.md`; Dockerfile y asistente Render preparados.
- [ ] Crear o proporcionar el proyecto Firebase, activar Google/Firestore y publicar las reglas. No se dispone de su configuración.
- [ ] Probar el acceso Google real y la recuperación del mismo perfil en dos navegadores y en escritorio después de activar el servicio.
- [ ] Alojar el servicio Python en HTTPS para Pages y configurar `TRADER_API_URL`. El escritorio utiliza su servidor incluido.
- [ ] Ampliar catálogos y proveedores si se requiere una cobertura mayor o tiempo real autorizado de todas las bolsas. No prometerlo con el proveedor actual.

## Funcionalidad que se conserva

- [x] Velas/líneas, volumen, SMA 20, EMA 50, Bollinger y RSI 14.
- [x] Comparación desde la primera fecha común, zoom, mediciones y trazados por pestaña.
- [x] Cartera manual con divisa del coste, alertas durante la sesión, CSV y exportaciones.
- [x] Noticias enlazadas, rendimientos de cuatro vencimientos, mapas macro anuales y agenda personal con ICS.
- [x] Icono vectorial multicolor propio y versiones PNG/ICO/ICNS; fuentes locales y base PWA.
- [x] Actions de pruebas, Pages y paquetes Windows/macOS/Linux.

## Verificación de esta revisión

- [x] Compilación de producción local: 1,15 MB iniciales aproximadamente en la revisión final.
- [x] Doce pruebas de análisis, CSV, validación de proveedores y recuperación de cambios.
- [x] Once pruebas Python: cotizaciones, clasificación, ausencia de volumen, caché, fallos, configuración pública, investigación y acceso nativo.
- [x] Cotizaciones auténticas comprobadas para AAPL, IBEX, Toyota y Shanghái, con fuente y fecha del proveedor.
- [x] Cerrada la comprobación visual final de menú, buscador en ventana estrecha, acerca de, cuenta, mapa, mapa de calor y refresco fallido.
- [x] Revisión publicada en **main**, commit `0e79de1`: CI, Pages y paquetes Windows/macOS/Linux terminados correctamente.
- [x] Paquete Windows local reconstruido y comprobado: arranque del servicio incluido, interfaz e iconos.
- [x] Web publicada comprobada tras actualizar la versión guardada: barra compacta, ausencia de precios inventados y cotizaciones cripto auténticas. Las acciones permanecen sin datos hasta activar el servidor HTTPS del propietario.

Flujos de la revisión: [CI](https://github.com/AlejandroPico/Trader/actions/runs/41186656340), [web](https://github.com/AlejandroPico/Trader/actions/runs/41186656287) y [escritorio](https://github.com/AlejandroPico/Trader/actions/runs/41186656328).

## Entorno para continuar

- Carpeta `Trader` del espacio de trabajo; rama **main**.
- Interfaz: `npm start`, puerto 4200. API: `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765`.
- Entorno Python comprobado: `.venv315`, Python 3.15.2. Runtime y entornos virtuales no se publican.
- Pruebas: `npm test` y `python -m unittest discover -s tests -p test_*.py`.
- Compilación web: `npm run build`; Pages: `npm run build:pages`; escritorio: `python scripts/package_desktop.py`.
- No tratar un servicio configurado pero sin activar como una función probada. Mantener visibles los datos ausentes y las limitaciones del proveedor.

- [x] Identificadores cripto vinculados a su mercado real (BTCUSDT, ETHUSDT, SOLUSDT), con migración del espacio anterior sin convertir importes ni divisas.
- [x] Corte real de la API probado: gráfico retenido, aviso con fecha y recuperación al restablecer el servicio.
- [x] Buscador verificado en 1280 × 720 y 390 × 844; acerca de y cuenta comprobados sin campos de configuración.
