# Activar la sincronización con Google

Google necesita un identificador para reconocer a Trader. Se crea una vez en tu cuenta de Google Cloud. No es una contraseña ni una clave privada. La aplicación funciona sin él; solo la sincronización depende de este paso.

## Crear el proyecto y habilitar Drive

1. Entrar en [Google Cloud Console](https://console.cloud.google.com/).
2. Abrir el selector de proyectos superior y elegir **Nuevo proyecto**. Llamarlo **Trader** y crearlo, o seleccionar uno propio existente.
3. Abrir **APIs y servicios → Biblioteca**, buscar **Google Drive API** y pulsar **Habilitar** dentro del mismo proyecto.

## Preparar el consentimiento

1. Abrir **Google Auth Platform**. Si aparece **Comenzar**, completar el asistente.
2. En **Branding / Información de la aplicación**, indicar **Trader**, tu correo de soporte y tu correo de contacto.
3. Página de inicio, si la pide: `https://alejandropico.github.io/Trader/`.
4. Privacidad: `https://alejandropico.github.io/Trader/privacy.html`.
5. En **Audience / Público**, seleccionar el público adecuado. Para una cuenta personal, normalmente corresponde **Externo**.
6. Mientras se configura, mantener el modo de pruebas y añadir tu propio correo a **Usuarios de prueba**, si el apartado lo solicita.
7. En **Data Access / Acceso a los datos**, añadir `openid`, el permiso de correo (`email` o `https://www.googleapis.com/auth/userinfo.email`) y `https://www.googleapis.com/auth/drive.appdata`.

`drive.appdata` permite guardar el espacio en la carpeta privada de esta aplicación; no concede acceso general a tus documentos de Drive.

## Crear el cliente

1. Abrir **Clients / Clientes → Crear cliente**.
2. Elegir **Aplicación web**. Se utiliza también para el escritorio porque su conexión se realiza en el navegador habitual.
3. Nombre: **Trader web**.
4. En **Orígenes autorizados de JavaScript**, añadir los que vayas a usar, cada uno en una fila:

```text
https://alejandropico.github.io
http://localhost
http://localhost:4200
http://127.0.0.1:4200
http://127.0.0.1:8765
```

Los orígenes no llevan `/Trader/`, rutas ni barra final. Si se usa otro dominio, añadir su origen HTTPS.

5. El flujo actual usa una ventana emergente; no necesita URI de redirección.
6. Crear y copiar **ID de cliente**, terminado en `.apps.googleusercontent.com`.

No compartir el secreto de cliente, la contraseña de Google, códigos de verificación ni tokens. Si la consola muestra un secreto, no adjuntarlo al chat ni al repositorio.

## Activarlo en Trader

1. Abrir **Ajustes y cuenta**, pegar el ID en **ID de cliente OAuth** y pulsar **Guardar ajustes**.
2. Volver a Ajustes y pulsar **Conectar con Google**.
3. Elegir personalmente la cuenta y revisar los permisos en la ventana oficial de Google.
4. Probar **Guardar en Google**. Antes de recuperar sobre cambios locales, usar **Exportar espacio** para conservar una copia.

En escritorio: pulsar **Sincronizar en el navegador**, conectar y guardar o recuperar allí. Después cerrar Ajustes y pulsar **Devolver al escritorio**. Mantener Trader abierto. Si pasan más de diez minutos, iniciar otra conexión desde el escritorio.

El guardado es manual. La sesión de Google caduca y puede requerir volver a conectar.

## Qué adjuntar para cerrar la comprobación

Solo el **ID de cliente OAuth**, terminado en `.apps.googleusercontent.com`. Confirma también que Drive API está habilitada y que tu cuenta puede usar la aplicación en pruebas. La autenticación y la aceptación de permisos las realizas personalmente en Google.

## Resolver errores

- **Origen no autorizado:** revisar protocolo, nombre y puerto de la barra del navegador y añadir ese origen exacto.
- **Usuario no permitido:** revisar el público y los usuarios de prueba.
- **Drive API deshabilitada:** habilitarla dentro del proyecto del cliente.
- **Ventana bloqueada:** permitir la ventana emergente de Google para Trader y volver a conectar.
- **Permiso insuficiente:** comprobar `drive.appdata` y conectar de nuevo.
- **Sesión caducada:** volver a conectar antes de guardar o recuperar.

Los nombres de apartados pueden variar según el idioma. Referencias oficiales: [configuración de Google Identity](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [autorización web](https://developers.google.com/identity/oauth2/web/guides/use-token-model) y [datos privados de aplicación en Drive](https://developers.google.com/workspace/drive/api/guides/appdata).
