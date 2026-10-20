# Incidencias registradas por administradores en nombre de usuarios

Última revisión: 20 de octubre de 2026.

## Objetivo

Permitir que un administrador registre una incidencia para cualquier usuario activo del dominio Google Workspace `iesisladeleon.es`, aunque esa persona todavía no haya iniciado sesión en la aplicación.

La incidencia debe conservar dos identidades diferentes:

- la persona que realizó materialmente el registro;
- la persona para la que se registró la incidencia y que debe poder consultarla y recibir sus actualizaciones.

No se debe atribuir al usuario destinatario una acción realizada por el administrador.

## Limitaciones del modelo actual

`incidencias.creada_por` referencia `public.usuarios.id`. Los perfiles de `public.usuarios` se crean después del primer inicio de sesión mediante Google, por lo que la aplicación no conoce actualmente a todas las cuentas de Workspace.

Además:

- el formulario siempre asigna la incidencia a la sesión actual;
- RLS solo permite insertar y consultar incidencias propias mediante `creada_por = auth.uid()`;
- el router envía a los administradores directamente al panel y no les muestra el formulario de usuario;
- los avisos de seguimiento se envían al usuario relacionado mediante `creada_por`.

Permitir incidencias para todos los usuarios requiere separar el registrador del destinatario y obtener el directorio desde Google Workspace.

## Integración elegida con Google Workspace

Se utilizará una cuenta de servicio con acceso administrativo directo y limitado a lectura de usuarios. La consulta se hará desde una Edge Function de Supabase. La clave privada nunca debe llegar al frontend.

Configuración creada:

```text
Proyecto de Google Cloud: incidencias-tic-511323
Cuenta de servicio: incidencias-tic-directorio@incidencias-tic-511323.iam.gserviceaccount.com
API: Admin SDK API
Ámbito OAuth: https://www.googleapis.com/auth/admin.directory.user.readonly
Permiso de Workspace: Usuarios > Leer
```

La cuenta de servicio tiene asignado un rol personalizado de Google Workspace de solo lectura. Para este caso no se utiliza delegación de todo el dominio ni se suplanta a una cuenta personal.

El 16 de octubre de 2026 se comprobó directamente, sin mostrar datos personales, que:

- Google aceptaba el JWT firmado por la cuenta de servicio;
- el intercambio por un token de acceso devolvía HTTP 200;
- `Admin SDK Directory API users.list` con `viewType=admin_view` devolvía HTTP 200;
- el directorio contenía más resultados de los incluidos en la primera página de prueba.

## Estado de la credencial

La clave JSON se conserva fuera del repositorio y sus permisos locales se restringieron a `600`. Su contenido no se ha mostrado ni incorporado a ningún archivo del proyecto.

Está previsto almacenarla en Edge Function Secrets codificada como Base64 con el nombre:

```text
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
```

Este secreto todavía no está configurado en Supabase. El intento realizado el 16 de octubre de 2026 no llegó a enviar la clave porque la CLI respondió `AccessTokenRequiredError`. Antes de repetirlo hay que autenticar localmente la CLI:

```text
npx --yes supabase@2.120.0 login
```

El token personal de Supabase no debe escribirse en documentación, enviarse por mensajería ni guardarse en el repositorio.

## Diseño propuesto

La migración debe conservar por separado:

- `registrada_por`: perfil autenticado que envió el formulario;
- identificador estable de Google del destinatario;
- nombre y correo del destinatario como datos de referencia para listados y avisos.

Para las incidencias que un usuario crea para sí mismo, registrador y destinatario corresponderán a la misma persona. Los datos existentes deberán migrarse con esa equivalencia.

Las políticas RLS deberán garantizar que:

- un usuario normal solo puede crear incidencias para sí mismo;
- un administrador puede crear una incidencia para una cuenta válida del directorio;
- el destinatario puede consultar la incidencia y sus actualizaciones al iniciar sesión;
- los administradores pueden consultar y gestionar todas las incidencias;
- el navegador no puede suplantar libremente identidades ni consultar el directorio sin pasar por una operación administrativa protegida.

Los avisos deberán comportarse así:

- una nueva incidencia continúa avisando a los administradores activos;
- una actualización se envía al destinatario de la incidencia;
- el listado y el correo administrativo muestran quién es el destinatario;
- cuando registrador y destinatario sean distintos, el detalle administrativo muestra también quién realizó el registro.

## Trabajo pendiente

1. Autenticar la CLI de Supabase y guardar la credencial como Edge Function Secret.
2. Crear una Edge Function que valide el JWT de Supabase y el rol `ADMINISTRADOR` antes de consultar Directory API.
3. Limitar la respuesta del directorio a los campos necesarios y excluir cuentas suspendidas.
4. Crear la migración de base de datos y adaptar RLS, relaciones y avisos.
5. Añadir el formulario administrativo con buscador de nombre o correo.
6. Adaptar listados y detalle para distinguir destinatario y registrador.
7. Añadir pruebas de permisos, creación, visibilidad y destinatarios de correo.
8. Ejecutar una prueba manual completa con una cuenta que nunca haya usado antes la aplicación.

## Reglas de seguridad

- No incluir la clave JSON, su contenido codificado ni tokens de Supabase en Git.
- No exponer la credencial mediante variables `VITE_*`.
- No llamar a Directory API directamente desde el navegador.
- Mantener exclusivamente el permiso de lectura de usuarios.
- Comprobar el rol administrativo en la Edge Function y nuevamente mediante las políticas de base de datos.
- Registrar únicamente los datos del directorio necesarios para operar la incidencia.
- Revocar la clave y retirar el rol de Workspace si se abandona esta integración.

