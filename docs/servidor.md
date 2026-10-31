# Publicar el servicio de cotizaciones

La aplicación de escritorio ya incluye el servicio Python y consulta los proveedores desde el equipo. GitHub Pages sirve archivos estáticos y necesita una dirección HTTPS donde ejecutar ese servicio. Esta dirección se configura una vez para todo el producto; los usuarios no rellenan servidores ni claves.

## Opción con asistente de despliegue

El repositorio incluye `render.yaml` y `Dockerfile`.

1. Abre [Render](https://dashboard.render.com/), entra con tu cuenta y elige **New → Blueprint**.
2. Conecta el repositorio **AlejandroPico/Trader**, rama **main**. El asistente leerá `render.yaml`.
3. Revisa el servicio `trader` y el plan antes de crearlo. El archivo solicita el plan gratuito; su disponibilidad y sus límites los determina Render. Las instancias gratuitas pueden suspenderse y tardar en responder al reanudarse.
4. Si ya has activado Google, introduce `TRADER_FIREBASE_CONFIG` con el mismo JSON de la [guía de Google](google.md). Completa el despliegue desde tu cuenta.
5. Cuando el servicio esté disponible, copia su dirección HTTPS. Al abrirla, debe aparecer Trader. También debe responder `/api/health` con `status: ok`.
6. Añade el nombre del dominio del servicio a los dominios autorizados de Firebase Authentication si vas a iniciar sesión en esa dirección.
7. En [Variables del repositorio](https://github.com/AlejandroPico/Trader/settings/variables/actions), crea `TRADER_API_URL` con la dirección HTTPS del servicio, sin barra final.
8. Ejecuta **Actions → Publicar web → Run workflow**. La web de Pages utilizará ese servidor automáticamente.

Puedes pasarme la dirección del servicio y prepararé la conexión y las comprobaciones. El alojamiento no se ha creado desde este proyecto: necesita una cuenta del propietario y su aceptación del servicio.

## En otro servidor propio

Puedes construir el `Dockerfile` y publicar el puerto 8765 detrás de HTTPS. Configura `TRADER_HOSTS` con el dominio exacto y `TRADER_ORIGINS=https://alejandropico.github.io` para permitir las consultas de Pages. Añade otros orígenes separados por comas si utilizas otros dominios. El servicio usa memoria para su caché; los perfiles de usuario se guardan en Firestore.

En Render se utiliza automáticamente `RENDER_EXTERNAL_HOSTNAME` para admitir únicamente el nombre del servicio, además de los hosts locales.

## Qué significan las cotizaciones

Las cifras proceden de los proveedores; si faltan, la aplicación deja el dato vacío y muestra el fallo. Cuando existe una hora de mercado, se conserva por separado de la hora de consulta. Las respuestas sin hora del mercado se identifican como consultas. Un volumen ausente se conserva como ausente.

Binance suministra los pares spot contra USDT y un flujo de velas para actualizaciones continuas. Acciones, índices, divisas y futuros usan la interfaz pública no oficial de Yahoo Finance, con consultas periódicas y caché de 30 segundos. Puede haber retrasos, restricciones o símbolos no disponibles. Una bolsa cerrada conserva la fecha de su última sesión.

No se garantiza un suministro profesional en tiempo real para todas las bolsas. Ese alcance requiere contratar o integrar proveedores que lo autoricen. La aplicación identifica los retrasos comunicados y no los sustituye por cifras generadas.

Referencia del asistente de alojamiento: [documentación oficial de Render Blueprints](https://render.com/docs/blueprint-spec).
