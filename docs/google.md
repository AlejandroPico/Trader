# Activar Google y la sincronización

Esta configuración la realiza el propietario una vez. Los usuarios acceden desde el círculo de cuenta y pulsan **Continuar con Google**. Sus perfiles, pestañas, seguimiento, preferencias y trazados se guardan automáticamente en su cuenta.

## 1. Crear el proyecto

1. Abre [Firebase Console](https://console.firebase.google.com/) con tu cuenta de Google.
2. Pulsa **Crear un proyecto**, llámalo **Trader** y completa el asistente. Google Analytics es opcional y no lo utiliza esta aplicación.
3. Dentro del proyecto, abre el engranaje → **Configuración del proyecto** → **General**.
4. En **Tus aplicaciones**, pulsa el icono web **</>**, registra una aplicación llamada **Trader** y copia el bloque `firebaseConfig` que aparece. No hace falta activar Firebase Hosting.

Puedes enviarme ese bloque para preparar las variables del despliegue. Es la configuración pública de la aplicación; no es una contraseña. **No hace falta generar ni enviar claves privadas, archivos de cuentas de servicio ni contraseñas.**

## 2. Activar el acceso de Google

1. En el menú de Firebase, abre **Compilación / Build → Authentication → Comenzar**.
2. En **Método de inicio de sesión / Sign-in method**, selecciona **Google**, actívalo, selecciona tu correo de soporte y guarda.
3. En **Authentication → Configuración → Dominios autorizados**, añade `alejandropico.github.io`.
4. Para desarrollo y escritorio, añade también `localhost` y `127.0.0.1`. Si usas otro dominio para la web, añádelo aquí, sin protocolo ni ruta.

## 3. Activar el almacenamiento de perfiles

1. Abre **Compilación / Build → Firestore Database → Crear base de datos**.
2. Elige la base predeterminada `(default)`, la edición estándar y una ubicación europea. Empieza con reglas de producción.
3. Abre la pestaña **Reglas**, sustituye su contenido por el archivo [`firestore.rules`](../firestore.rules) del repositorio y pulsa **Publicar**.

Las reglas limitan los perfiles a su propietario autenticado. No uses reglas que permitan leer o escribir a cualquier visitante.

## 4. Conectar el despliegue

1. En [Trader → Settings → Secrets and variables → Actions → Variables](https://github.com/AlejandroPico/Trader/settings/variables/actions), crea la variable de repositorio `TRADER_FIREBASE_CONFIG` con el objeto de configuración en formato JSON. Si me envías el bloque del paso 1, puedo prepararlo y configurar esta parte.
2. En **Actions**, ejecuta **Publicar web** y **Crear escritorio**. Ambos incorporan la misma configuración pública.
3. Para desarrollo local, copia `.env.example` a `.env.local`, asigna `TRADER_FIREBASE_CONFIG` con el mismo JSON y reinicia `npm start`.
4. Si alojas todo el producto en el servidor Python, añade allí la variable de entorno con el mismo nombre. También puede usar la configuración incluida en el paquete compilado.

La configuración se publica con el producto. Los límites de acceso los imponen Google y las reglas de Firestore; no deben guardarse claves administrativas en la aplicación.

## 5. Comprobar el resultado

1. Abre Trader, pulsa el círculo de cuenta y **Continuar con Google**. Se abre el selector oficial de Google.
2. Añade un activo, abre un gráfico y espera a que la cuenta muestre **Sincronizado**.
3. Abre otro navegador e inicia sesión con la misma cuenta. Deben recuperarse las pestañas, el seguimiento y las preferencias.
4. Crea otro perfil desde la cuenta y comprueba que conserva su espacio por separado.
5. En escritorio, el acceso se realiza en el navegador habitual y regresa automáticamente a la aplicación al terminar.

No se ha podido ejecutar esta prueba real porque todavía no existe una configuración de Firebase proporcionada por el propietario. El botón indica esta situación y no concede una sesión ficticia.

Los cambios pendientes se conservan en el equipo y se vuelven a enviar al recuperar la conexión. Si dos navegadores editan a la vez el mismo elemento del perfil, prevalece el último guardado; no es un editor colaborativo. Las importaciones CSV permanecen en la sesión del equipo y no se suben.

Referencias oficiales: [Google en Firebase Authentication](https://firebase.google.com/docs/auth/web/google-signin), [reglas de seguridad de Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions) y [almacenamiento sin conexión](https://firebase.google.com/docs/firestore/manage-data/enable-offline).
