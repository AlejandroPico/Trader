# Seguimiento de Trader

Actualizado: 31 de octubre de 2026.

## Regla de trabajo

Trabajar y subir directamente a **main**. El usuario ha autorizado las subidas y ha pedido no crear ramas secundarias salvo petición expresa. La rama inicial se eliminó; main contiene aquella entrega.

## Continuación del 31 de octubre

- [x] Confirmados los tres flujos de la primera entrega: pruebas, Pages y paquetes Windows/macOS/Linux, todos correctos.
- [x] Verificado Node 26 en GitHub Actions.
- [x] Python 3.15.2 instalado de forma aislada en el proyecto; dependencias, pruebas y compilación Windows comprobadas con esa versión.
- [x] Actualizados CI, Docker y .python-version a 3.15.2.
- [x] Instalado y comprobado httpx2; eliminada la advertencia del cliente de pruebas.
- [x] Código reorganizado con formato legible.
- [x] Comparaciones de ambos activos desde la primera sesión común, con una sola escala porcentual y alineación diaria entre bolsas.
- [x] Zoom guardado por pestaña; mediciones y trazados comprobados mediante interacción real.
- [x] Corregida la caché para usar la hora de consulta; las alertas comprueban por separado hora de cotización y retraso comunicado.
- [x] Evitadas respuestas antiguas al cambiar de proveedor/modo y consultas duplicadas simultáneas.
- [x] Cartera con divisa del coste conservada; cotizaciones externas usan su divisa efectiva. Las monedas incompatibles no se valoran como equivalentes.
- [x] CSV: rechazo de celdas vacías y fechas imposibles; conservación durante la sesión al alternar pestañas. No se generan datos sintéticos si falta el archivo de una pestaña CSV.
- [x] Corregidos los indicadores de retraso y controles de intervalo para archivos locales.
- [x] Noticias reales con editor, fecha y enlace, sin copiar el artículo completo.
- [x] Curva de rendimientos estadounidense de cuatro vencimientos, con sesión anterior y fechas por cotización.
- [x] Mapas macro de PIB real, inflación y desempleo de once países, con series anuales del Banco Mundial.
- [x] Agenda manual con búsqueda, eventos pasados, exportación ICS y calendarios oficiales enlazados.
- [x] Consultas de extremo a extremo correctas para noticias, rendimientos, tres indicadores macro y búsqueda de Toyota.
- [x] Siete pruebas de cálculo/CSV y siete pruebas Python correctas.
- [x] Formularios de cartera, alertas y agenda comprobados en un espacio de prueba independiente. Agenda y pestañas recuperadas después de recargar.
- [x] Exportación del espacio comprobada: pestañas, posición con USD, alerta, evento y trazado presentes y válidos.
- [x] Exportación y reimportación CSV comprobadas en navegador.
- [x] Revisados tamaños de escritorio, tableta y móvil. Buscador con Ctrl+K, foco inicial y fondo inerte en diálogos.
- [x] Fuentes locales añadidas al almacenamiento de la PWA; tema accesible también desde Ajustes.
- [x] Ejecutable Windows generado con Python 3.15.2 y abierto en una ventana real; interfaz, gráficos y servicio local correctos.
- [x] Segunda ventana nativa creada con identificador de espacio independiente.
- [x] Intercambio temporal de espacios entre escritorio y navegador implementado, con tokens de un solo uso, caducidad y comprobación de origen. Pruebas automáticas correctas.
- [x] Añadida prueba del ejecutable empaquetado en CI: servidor, interfaz e iconos, sin depender de pantalla ni Python del sistema.
- [x] Instalador Windows obligatorio en CI: una ausencia del compilador ya no se omite silenciosamente.
- [x] README actualizado y política de privacidad publicada en los archivos web.
- [x] Guía de Google creada en docs/google.md, con los pasos y el dato exacto que falta.
- [x] Entrega 456894a: pruebas, Pages y paquetes de los tres sistemas completados correctamente en GitHub. El ejecutable empaquetado pasó la nueva prueba de servicio, interfaz e iconos en Windows, macOS y Linux; el instalador Windows también se generó.
- [x] Verificadas en la web publicada las rutas /Trader/, privacidad y fuentes precargadas en el manifiesto de la PWA.
- [x] Corregida la limpieza de filtros numéricos del analizador. Comprobación en navegador: 10 resultados con mínimo 1 %, y los 50 activos de nuevo al borrar el límite.

### Pendiente de configuración del propietario

- [ ] Crear el cliente web OAuth y habilitar Drive API siguiendo docs/google.md. El usuario todavía no dispone de ese identificador y ha pedido recibir la guía al terminar.
- [ ] Probar personalmente el consentimiento de Google, guardar/recuperar entre cuentas y escritorio, expiración y revocación con el identificador real. No se ha probado una autenticación real ni hay credenciales incluidas.

### Alcance y comprobaciones que deben conservarse explícitos

La agenda es manual y enlaza calendarios oficiales; todavía no importa automáticamente anuncios ni previsiones. Los rendimientos cubren cuatro vencimientos estadounidenses y el mapa macro once países. No están implementadas cadenas de opciones ni una biblioteca exhaustiva de indicadores o composiciones de múltiples gráficos simultáneos.

Los paquetes de macOS y Linux se compilan en sus respectivos entornos de GitHub Actions. La prueba automática del paquete verifica recursos y servidor; la interacción gráfica nativa solo se ha comprobado en Windows. Firma de instaladores y notarización requieren las credenciales correspondientes del propietario.

La instalación PWA y la desconexión completa del navegador no se han probado físicamente. El almacenamiento generado contiene interfaz, iconos y fuentes; el modo sintético permite trabajar sin proveedores, mientras que las consultas reales requieren conexión.

Las comprobaciones remotas de cada nueva subida deben verificarse antes de marcar esa entrega como desplegada. Los enlaces de Actions y el commit final se comunican al cerrar la sesión.

## Objetivo y criterios del proyecto

Aplicación propia de análisis de mercados, web y escritorio, sin red social. Interfaz elegante, densa y centrada en datos: evitar frases decorativas. Cobertura internacional y selección por país. Usar las últimas versiones estables compatibles. No incluir referencias al producto de inspiración en código, comentarios, documentación ni interfaz.

Icono vectorial original y colorido: verde, azul, rojo, naranja y amarillo. Mantener coherencia entre favicon, identidad e instalables.

## Historial: primera entrega

- [x] Angular 22.2.4, CLI/build 22.2.5, TypeScript 6.0.3 y ECharts 6.1.0, con versiones fijadas y package-lock.
- [x] Interfaz grafito con tema claro, navegación adaptable y tipografía empaquetada localmente.
- [x] favicon.svg original y derivados PNG, ICO, ICNS y máscara para PWA.
- [x] Vista general, pestañas de activos, lista de seguimiento y ventanas con espacios locales separados.
- [x] Gráficos de velas y líneas, volumen, zoom y desplazamiento.
- [x] SMA 20, EMA 50, Bollinger, RSI 14 y comparación con eje porcentual independiente.
- [x] Herramientas de tendencia, medición, borrado, exportación CSV y PNG.
- [x] Importación CSV con validación OHLC, orden temporal y rechazo de fechas duplicadas.
- [x] Catálogo inicial internacional, mapa por países, mapa de calor y analizador con filtros y ordenación.
- [x] Cartera manual agrupada por divisa; alertas mientras la aplicación está abierta.
- [x] Persistencia local, exportación/importación de espacios con validación.
- [x] Integración de acceso Google y guardado/recuperación en Drive appDataFolder, pendiente de configuración y prueba real.
- [x] Servicio Python/FastAPI con caché, límites de concurrencia y validación de símbolos.
- [x] Modo sintético identificado de forma explícita, separado de proveedores reales. Los errores del proveedor no generan datos falsos.
- [x] Cliente público Binance para cripto y pasarela Yahoo Finance para acciones, índices, divisas y futuros.
- [x] Base PWA, lanzador pywebview, empaquetador PyInstaller, definición Inno Setup y Dockerfile.
- [x] Flujos GitHub Actions de pruebas, web Pages y paquetes Windows/macOS/Linux. Todavía pendientes de ejecución remota.

## Comprobaciones de la primera entrega

- [x] Compilación de producción completada antes de los últimos ajustes menores. Repetir sobre el último commit.
- [x] Cuatro pruebas de cálculo/CSV correctas.
- [x] Dos pruebas Python correctas: normalización, validación, caché, fallos de proveedor y comprobación de host.
- [x] Consultas reales correctas: AAPL, IBEX 35, Toyota (Japón), Shanghái y Bitcoin.
- [x] Revisión visual de la vista general en navegador.
- [x] Apertura de gráfico, activación de RSI/Bollinger y selección de comparación; sin errores de consola durante esa comprobación.

## Notas para continuar

- Carpeta: Trader dentro del espacio de trabajo. Rama de trabajo: **main**, sin ramas secundarias salvo petición expresa.
- Frontend local: npm start, http://127.0.0.1:4200.
- Backend local: python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765.
- Instalar frontend: npm ci. Pruebas: npm test. Compilar: npm run build. Pages: npm run build:pages.
- Python: crear entorno virtual e instalar requirements-dev.txt o requirements-desktop.txt según la tarea.
- El entorno local comprobado con Python 3.15.2 es .venv315; .venv conserva el entorno inicial. El runtime aislado está en .runtimes y no se sube al repositorio.
- Los CSV importados permanecen solo durante la sesión; las pestañas se guardan, los archivos no. La interfaz lo advierte.
- El mapa de calor usa pesos ilustrativos explícitos, no capitalización real.
- Yahoo Finance utiliza una interfaz no oficial y puede limitar consultas; no garantizar cobertura universal ni tiempo real de todas las bolsas.
- Los tokens de Google se mantienen en memoria, no en almacenamiento local ni repositorio.
- La primera sesión terminó con una subida de estado por límite de uso. La continuación se documenta al principio de este archivo.
