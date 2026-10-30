# Seguimiento de Trader

Actualizado: 30 de octubre de 2026.

## Objetivo y criterios del proyecto

Aplicación propia de análisis de mercados, web y escritorio, sin red social. Interfaz elegante, densa y centrada en datos: evitar frases decorativas. Cobertura internacional y selección por país. Usar las últimas versiones estables compatibles. No incluir referencias al producto de inspiración en código, comentarios, documentación ni interfaz.

Icono vectorial original y colorido: verde, azul, rojo, naranja y amarillo. Mantener coherencia entre favicon, identidad e instalables.

## Implementado

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

## Comprobado en esta sesión

- [x] Compilación de producción completada antes de los últimos ajustes menores. Repetir sobre el último commit.
- [x] Cuatro pruebas de cálculo/CSV correctas.
- [x] Dos pruebas Python correctas: normalización, validación, caché, fallos de proveedor y comprobación de host.
- [x] Consultas reales correctas: AAPL, IBEX 35, Toyota (Japón), Shanghái y Bitcoin.
- [x] Revisión visual de la vista general en navegador.
- [x] Apertura de gráfico, activación de RSI/Bollinger y selección de comparación; sin errores de consola durante esa comprobación.

## Próximas tareas, por orden

- [ ] Confirmar subida y estado de los flujos de GitHub Actions; corregir fallos antes de integrar en main.
- [ ] Repetir compilación y pruebas tras los últimos cambios de guardado por ventana y detección de cambios de Angular.
- [ ] Actualizar Python objetivo a 3.15.2, última estable verificada en python.org. El entorno disponible y las pruebas actuales usan 3.14.8; los flujos y Dockerfile todavía indican 3.14. No afirmar que se ha probado 3.15.
- [ ] Verificar Node 26 en CI (entorno local: Node 24.21). Las dependencias Angular son compatibles con ambos.
- [ ] Instalar requirements-dev.txt y comprobar httpx2 2.16.0 para eliminar el aviso de obsolescencia del cliente de pruebas de Starlette. El aviso no impidió que pasaran las pruebas actuales.
- [ ] Revisar formularios de cartera/alertas, búsqueda externa, importación/exportación, persistencia tras recarga y espacios de varias ventanas.
- [ ] Probar visualmente escritorio, tableta y móvil; revisar contraste, foco, navegación por teclado y diálogos.
- [ ] Verificar zoom, mediciones y trazados con interacción real; revisar que se preservan al cambiar pestañas y período.
- [ ] Revisar las comparaciones: el activo adicional usa porcentaje desde su primera vela, mientras el principal conserva precios. Añadir comparación normalizada de ambos si procede.
- [ ] Revisar actualización de cotizaciones y alertas con mercados cerrados y proveedores limitados. No confundir hora de consulta con hora de cotización.
- [ ] Usar la divisa devuelta por el proveedor para activos descubiertos mediante búsqueda. El catálogo remoto puede traer divisa desconocida: evitar valoraciones engañosas.
- [ ] Configurar OAuth Google con un ID propio, orígenes autorizados y Drive API; probar guardar/recuperar, expiración y desconexión. No hay credenciales reales incluidas. No automatizar la autenticación del usuario.
- [ ] Resolver la experiencia de sincronización desde escritorio: Google no admite autenticación en navegadores integrados; usar navegador del sistema y un flujo compatible, o exportación/importación. No presentarlo como resuelto.
- [ ] Compilar y ejecutar el paquete real de Windows; probar puerto ocupado, almacenamiento persistente, iconos y cierre del servidor. Revisar dependencias WebView2.
- [ ] Verificar empaquetado de macOS y Linux. No se han construido ni probado estos binarios. Revisar Qt en Linux, firma/notarización y arquitectura.
- [ ] Comprobar el instalador Inno Setup en Actions. Actualmente solo se genera si el compilador está disponible.
- [ ] Configurar/verificar Pages con origen GitHub Actions y comprobar publicación, rutas /Trader/, PWA, instalación y funcionamiento sin conexión. Pages sirve la web estática; el backend Python requiere ejecución local o alojamiento independiente.
- [ ] Revisar requisitos de CORS/host si se aloja Python en otro dominio. El Dockerfile necesita TRADER_HOSTS adecuado para el dominio de despliegue.
- [ ] Actualizar README con instrucciones de desarrollo, escritorio, datos, Google y despliegue, y limitaciones comprobadas.
- [ ] Ampliar herramientas solicitadas: noticias verificables, calendarios, curvas de rendimiento, análisis macro, más indicadores, ajustes y distribuciones de gráficos. Aún no están implementadas.

## Notas para continuar

- Carpeta: Trader dentro del espacio de trabajo. Rama de trabajo: codex/plataforma-mercados.
- Frontend local: npm start, http://127.0.0.1:4200.
- Backend local: python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765.
- Instalar frontend: npm ci. Pruebas: npm test. Compilar: npm run build. Pages: npm run build:pages.
- Python: crear entorno virtual e instalar requirements-dev.txt o requirements-desktop.txt según la tarea.
- Los CSV importados permanecen solo durante la sesión; las pestañas se guardan, los archivos no. La interfaz lo advierte.
- El mapa de calor usa pesos ilustrativos explícitos, no capitalización real.
- Yahoo Finance utiliza una interfaz no oficial y puede limitar consultas; no garantizar cobertura universal ni tiempo real de todas las bolsas.
- Los tokens de Google se mantienen en memoria, no en almacenamiento local ni repositorio.
- El usuario pidió subir ya el trabajo y continuar después por límite de uso. Esta es una entrega intermedia, no una plataforma terminada.
