# Evolución de incidencias de cuentas y adjuntos

Última revisión: 21 de octubre de 2026.

## Alcance y relación con el resto de la documentación

Este documento recoge las decisiones funcionales previas al diseño técnico de tres ampliaciones:

1. solicitudes de restauración de contraseña de cuentas de alumnado;
2. creación de cuentas de alumnado y profesorado, con prioridad baja;
3. archivos adjuntos en las incidencias.

Es la especificación consolidada de estas ampliaciones. `arquitectura.md` y `modelo-datos.md` describen el sistema que existe actualmente; `plan-pendiente.md` establece el orden de ejecución. Este documento no describe todavía una implementación.

## 1. Base común: identidades y Google Workspace

### Limitaciones actuales

`incidencias.creada_por` referencia `public.usuarios.id` y representa a la vez a quien registra una incidencia y a quien la consulta y recibe sus actualizaciones. Los perfiles de `public.usuarios` solo se crean después del primer inicio de sesión con Google.

Actualmente:

- el formulario siempre asigna la incidencia a la sesión activa;
- RLS solo permite insertar y consultar incidencias propias mediante `creada_por = auth.uid()`;
- los avisos de seguimiento se envían al perfil relacionado mediante `creada_por`;
- «Gestión de cuentas de usuario» solo solicita descripción y urgencia;
- no existe un modelo para representar una cuenta de Workspace que nunca haya iniciado sesión;
- no existe almacenamiento de adjuntos.

### Identidades del modelo futuro

Las ampliaciones requieren distinguir tres conceptos:

- **Solicitante o registrador:** persona autenticada que realiza materialmente la petición.
- **Destinatario de la incidencia:** persona que puede consultarla y recibe las comunicaciones de seguimiento.
- **Cuenta afectada:** identidad de Google Workspace sobre la que se solicita una operación.

No siempre coinciden:

- en una incidencia propia, solicitante y destinatario son la misma persona;
- si un administrador registra una incidencia para otra persona, el administrador es el registrador y la otra persona es la destinataria;
- en una restauración de contraseña, un profesor es solicitante y destinatario de la respuesta, mientras que la cuenta del alumno es la cuenta afectada;
- en una creación de cuenta todavía no existe una identidad de Google estable hasta que Workspace completa el alta.

El modelo debe conservar el ID estable de Google de la cuenta afectada cuando exista, además de una copia de su nombre y correo para listados y auditoría. Nunca se atribuirá al destinatario o al alumno una acción realizada por otra persona.

### Integración disponible con Google Workspace

Se ha elegido una cuenta de servicio con acceso administrativo directo y limitado. Las consultas se realizarán desde Edge Functions de Supabase; la clave privada nunca llegará al frontend.

Configuración existente:

```text
Proyecto de Google Cloud: incidencias-tic-511323
Cuenta de servicio: incidencias-tic-directorio@incidencias-tic-511323.iam.gserviceaccount.com
API: Admin SDK API
Ámbito OAuth actual: https://www.googleapis.com/auth/admin.directory.user.readonly
Permiso actual de Workspace: Usuarios > Leer
```

La cuenta de servicio tiene un rol personalizado de Workspace de solo lectura. Para esta consulta no se utiliza delegación de todo el dominio ni se suplanta a una cuenta personal.

El 16 de octubre de 2026 se verificó, sin mostrar datos personales, que Google aceptaba el JWT, entregaba un token de acceso y permitía ejecutar `users.list` con `viewType=admin_view`. La prueba también confirmó que el directorio contiene varias páginas de resultados.

### Estado de la credencial

La clave JSON se conserva fuera del repositorio con permisos locales restringidos y no se ha mostrado ni incorporado al proyecto. Está previsto guardarla como Edge Function Secret codificada en Base64:

```text
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
```

El secreto aún no está configurado en Supabase. El intento del 16 de octubre de 2026 terminó con `AccessTokenRequiredError` antes de enviar la clave. Para repetirlo habrá que autenticar localmente la CLI:

```text
npx --yes supabase@2.120.0 login
```

El token personal de Supabase, la clave JSON y su contenido codificado no deben documentarse, enviarse por mensajería ni guardarse en Git.

### Reglas compartidas de autorización

- Un usuario normal solo puede crear incidencias propias, salvo operaciones expresamente habilitadas como la solicitud de restauración.
- Las búsquedas del directorio y las comprobaciones de unidad organizativa se harán en backend.
- Un administrador podrá registrar una incidencia para una cuenta válida del directorio.
- El destinatario podrá consultar la incidencia y sus actualizaciones cuando disponga de acceso a la aplicación.
- Los administradores podrán consultar y gestionar todas las incidencias.
- El navegador no podrá elegir libremente identidades, consultar el directorio sin una operación protegida ni ejecutar acciones administrativas en Workspace.
- Las políticas RLS y las Edge Functions comprobarán los permisos de forma independiente.
- Solo se conservarán los datos del directorio necesarios para operar y auditar la incidencia.

## 2. Restauración de contraseña de alumnado

### Objetivo

Sustituir las solicitudes que actualmente llegan por correo por un caso estructurado dentro de «Gestión de cuentas de usuario». La aplicación registrará la solicitud y permitirá que el administrador la apruebe o deniegue. Solo después de aprobarla se ejecutará el cambio en Google Workspace.

### Flujo funcional acordado

1. El usuario inicia sesión con su cuenta del dominio.
2. La aplicación comprueba que pertenece a la unidad organizativa `CLAUSTRO`.
3. Dentro de «Gestión de cuentas de usuario» elige «Restaurar contraseña de alumno».
4. Introduce preferentemente la dirección de correo de la cuenta afectada.
5. La aplicación consulta el directorio y muestra inmediatamente la cuenta encontrada para que el solicitante la confirme.
6. Solo se admite una cuenta existente de alumnado, identificada inicialmente por un correo que comienza por `alum.`.
7. Se crea una solicitud pendiente, conservando por separado solicitante y cuenta afectada.
8. El administrador revisa la identidad del solicitante y la cuenta seleccionada.
9. El administrador aprueba o deniega la solicitud. Puede añadir un comentario opcional para el solicitante, pero no debe justificar obligatoriamente la decisión.
10. Si se aprueba, una operación protegida en backend restaura la contraseña en Google Workspace a `12345678` y fuerza su cambio en el siguiente inicio de sesión.
11. La solicitud conserva permanentemente el resultado como registro de auditoría.

No se cerrarán las sesiones existentes y, en la primera versión, no se diseñarán tratamientos especiales para cuentas suspendidas, archivadas, inexistentes o con verificación en dos pasos.

### Participantes que deben conservarse

- **Solicitante:** miembro de `CLAUSTRO` que registra la petición.
- **Cuenta afectada:** alumno cuya contraseña se debe restaurar.
- **Administrador decisor:** administrador que aprueba o deniega.
- **Ejecutor técnico:** proceso de backend que realiza la operación en Workspace.

La cuenta afectada se identificará mediante el ID estable de Google y se conservarán nombre y correo como datos de referencia. El correo no debe ser la única identidad técnica porque puede cambiar.

### Estados mínimos

El flujo necesita estados propios, distintos del estado general de una incidencia:

- `PENDIENTE_APROBACION`
- `DENEGADA`
- `APROBADA_PENDIENTE_EJECUCION`
- `EJECUTANDO`
- `COMPLETADA`
- `FALLIDA`

La incidencia general podrá seguir usando `ABIERTA`, `EN_PROGRESO`, `BLOQUEADA` y `RESUELTA`, pero la operación administrativa debe tener un estado explícito para no confundir una aprobación con una ejecución correcta.

### Seguridad y auditoría

- La pertenencia a `CLAUSTRO` se comprobará en backend contra Google Workspace; no se confiará en un valor enviado por el navegador.
- La búsqueda solo devolverá los campos imprescindibles para confirmar la identidad del alumno.
- Antes de crear la solicitud se volverá a validar que la cuenta existe y que su correo comienza por `alum.`.
- La aprobación y la ejecución exigirán el rol `ADMINISTRADOR` de la aplicación.
- La operación de Workspace se realizará exclusivamente desde una Edge Function u otro backend protegido.
- Se registrarán solicitante, cuenta afectada, decisión, administrador, fechas, resultado y error técnico sanitizado.
- La contraseña no se guardará en la base de datos, historial de actualizaciones, cola de correo, logs ni analítica.
- La interfaz debe impedir dobles pulsaciones. Una misma aprobación solo podrá producir una ejecución lógica.
- Un resultado ambiguo de red no se reintentará automáticamente hasta verificar el estado, porque un reintento de una operación privilegiada requiere tratamiento específico.

### Decisión sobre la contraseña inicial

Se mantiene la contraseña inicial conocida `12345678`, de acuerdo con el procedimiento existente del centro, y se forzará su cambio en el siguiente inicio de sesión.

Esta decisión acepta conscientemente el riesgo de utilizar una clave predecible. Como medidas compensatorias:

- solo `CLAUSTRO` podrá solicitar el cambio;
- el administrador deberá revisar y aprobar cada solicitud;
- la contraseña no se incluirá en correos ni se almacenará en la aplicación;
- la notificación indicará únicamente que se ha restaurado la contraseña inicial habitual;
- Google obligará al alumno a cambiarla al iniciar sesión.

### Impacto sobre el diseño existente

El formulario actual de cuentas solo contiene descripción y urgencia. Se mantendrá la entrada visible «Gestión de cuentas de usuario», pero dentro habrá un segundo paso para elegir la operación. Como mínimo:

- `RESTAURAR_PASSWORD_ALUMNO`
- `CREAR_CUENTA`
- `OTRO_PROBLEMA_CUENTA`

La separación entre solicitante, destinatario y cuenta afectada definida en este documento es un requisito previo. También habrá que adaptar listados y detalle para mostrar claramente el subtipo, el solicitante y la cuenta afectada.

### Permisos de Google Workspace

La credencial actual de lectura del directorio no permite cambiar contraseñas. La ejecución requerirá el ámbito de escritura de usuarios y un rol administrativo limitado a la restauración de contraseñas de las unidades organizativas necesarias.

Se estudiará mantener separadas:

- la credencial de consulta del directorio;
- la credencial capaz de restaurar contraseñas;
- la futura credencial o función destinada a crear cuentas.

## 3. Creación de cuentas

Esta ampliación queda expresamente pospuesta y conserva prioridad baja.

La idea de partida es trasladar el proceso asistido de la hoja de cálculo:

1. recibir nombre y tipo de persona, alumno o profesor;
2. generar una propuesta de dirección conforme a las reglas del centro;
3. comprobar en Workspace si la cuenta o un alias ya existen;
4. mostrar la propuesta para su confirmación;
5. crear la cuenta después de una aprobación explícita.

Antes de diseñarla será necesario revisar la hoja y resolver:

- reglas exactas para formar direcciones;
- homónimos, tildes, `ñ`, apellidos compuestos y duplicados;
- unidades organizativas de alumnado y profesorado;
- grupos, licencias, alias y demás atributos;
- quién puede solicitar y aprobar;
- altas individuales o por lotes;
- datos identificativos mínimos.

## 4. Archivos adjuntos

> Estado a 21 de octubre de 2026: implementación local completada y validada en frontend; migraciones y Edge Functions pendientes de aplicar y probar en el proyecto remoto.

### Alcance acordado para la primera versión

- Los controles de adjuntos solo aparecerán en «Incidencias sobre equipamiento»; los flujos de cuentas permanecerán simples y sin adjuntos.
- El backend rechazará adjuntos asociados a una incidencia de tipo `CUENTAS_USUARIO`. Esta restricción podrá relajarse en el futuro sin cambiar el modelo de almacenamiento.
- Los archivos se adjuntan únicamente durante la creación de la incidencia de equipamiento.
- Máximo de tres archivos por incidencia.
- Máximo de 5 MB por archivo.
- Tipos admitidos: JPEG, PNG y PDF.
- Se excluyen documentos de Office, archivos comprimidos, ejecutables, HTML y SVG.
- No se realizará análisis antivirus en la primera versión.
- Los usuarios no añadirán archivos después de enviar la incidencia.
- Los administradores podrán eliminar adjuntos en cualquier momento.
- La eliminación individual será definitiva y no conservará un registro histórico del archivo eliminado.
- Al eliminar una incidencia se eliminarán también físicamente todos sus archivos.
- No se necesita previsualización; la descarga autenticada es suficiente.
- El usuario y el administrador verán el nombre original del archivo, pero nunca su ruta interna.
- No se define por ahora un plazo adicional de conservación.

### Diseño funcional recomendado

Los objetos se almacenarán en un bucket privado `incidencias-adjuntos` de Supabase Storage, limitado a 5 MB y a los tres tipos MIME admitidos. Una tabla propia `adjuntos_incidencia` relacionará cada archivo con su incidencia y conservará al menos:

- incidencia;
- ruta interna aleatoria;
- nombre original;
- tipo MIME;
- tamaño;
- usuario que lo subió;
- fecha de subida.

Los nombres originales no se usarán como ruta del objeto. Las políticas de acceso deberán reproducir las de la incidencia: el solicitante o destinatario autorizado podrá descargar sus archivos y el administrador podrá descargar y eliminar todos.

La ruta interna tendrá una estructura equivalente a:

```text
<usuario-id>/<incidencia-id>/<adjunto-id>.<extension>
```

No se permitirán sobrescrituras. Los usuarios solo podrán eliminar sus propios objetos mientras la incidencia siga siendo un borrador; después de publicarla, únicamente el administrador podrá eliminarlos.

### Secuencia de creación

La incidencia se creará en dos fases para impedir que el correo administrativo salga antes de que los adjuntos estén disponibles:

1. validar formulario y archivos en el navegador;
2. crear la incidencia como borrador, todavía oculta en los listados y sin generar avisos;
3. subir los archivos con rutas nuevas y no sobrescribibles;
4. registrar su relación con la incidencia;
5. finalizar y publicar la incidencia mediante una operación protegida;
6. mostrar el resultado final y encolar el correo administrativo con el número real de adjuntos.

El modelo incorporará un indicador equivalente a `publicada_en`. Las incidencias existentes se migrarán como publicadas. La finalización comprobará que la incidencia pertenece al usuario autenticado, que es de equipamiento y que no supera los límites definidos.

Durante el envío, la interfaz mostrará fases explícitas: creación, subida de cada archivo y finalización. El botón permanecerá deshabilitado durante todo el proceso.

Si una subida falla, la incidencia no se publicará. El usuario deberá elegir entre reintentar ese archivo o retirarlo y continuar con los demás. No se enviará correo ni se mostrará el borrador en los listados hasta que el usuario resuelva el fallo y finalice la operación.

### Cancelación y borradores abandonados

- Si el usuario pulsa cancelar, cambia de tipo o abandona mediante un control de la aplicación, se intentarán eliminar inmediatamente los objetos ya subidos y el borrador.
- Al cerrar una pestaña, apagar el equipo o perder la red no se puede garantizar que el navegador complete una petición de limpieza.
- La aplicación realizará un intento de limpieza al detectar la salida de la página, pero se tratará como una optimización y no como garantía.
- Una tarea programada eliminará como respaldo los borradores y objetos que lleven un breve periodo sin actividad. El umbral técnico se fijará inicialmente en 15 minutos para evitar borrar una subida lenta que siga en curso.
- No se ofrecerá recuperación de borradores: un envío interrumpido deberá comenzar de nuevo.

### Seguridad y eliminación

- El bucket será privado.
- No se enviarán archivos como adjuntos de correo.
- Los mensajes podrán indicar que la incidencia contiene archivos y enlazar a la aplicación.
- La extensión y el MIME declarados por el navegador se validarán antes de aceptar el archivo.
- Las rutas incluirán identificadores aleatorios para evitar colisiones y exposición de nombres.
- La eliminación individual de un adjunto exigirá confirmación administrativa, borrará primero el objeto mediante la API de Storage y después eliminará sus metadatos. No se conservará una marca o historial de esa eliminación.
- La eliminación de una incidencia no puede depender solo de una cascada SQL: una operación de backend validará el rol `ADMINISTRADOR`, borrará todos los objetos mediante la API de Storage y solo después eliminará la incidencia.
- Si Storage falla, la incidencia o el adjunto permanecerán registrados y la interfaz mostrará el error para poder reintentar; no se dejará una eliminación parcial presentada como correcta.
- La tarea de limpieza de borradores también detectará objetos huérfanos producidos por interrupciones entre la subida y el registro de metadatos.

## 5. Notificaciones

El flujo de notificaciones queda definido así:

1. **Solicitud de restauración registrada:** se avisa al administrador. El solicitante no recibe acuse de recibo ni ningún otro correo mientras la solicitud está pendiente.
2. **Solicitud denegada:** el solicitante recibe el resultado y, si existe, el comentario opcional del administrador.
3. **Solicitud aprobada y ejecutada correctamente:** el solicitante recibe el resultado y, si existe, el comentario opcional. El mensaje indicará «contraseña inicial habitual» sin escribir `12345678`.
4. **Aprobación seguida de fallo técnico:** se avisa únicamente al administrador, que debe gestionar y resolver el problema. El solicitante no recibe información sobre el fallo técnico. Solo se le notificará cuando el administrador despache finalmente la solicitud con un resultado definitivo.
5. **Incidencia con archivos adjuntos:** el correo administrativo indicará que existen adjuntos y cuántos son. Los archivos no se incluirán en el correo ni se enlazarán directamente desde Storage; se accederá a ellos desde la aplicación autenticada.

Por tanto, el solicitante recibe una única comunicación cuando el administrador despacha la solicitud: denegación o restauración completada correctamente.

## 6. Orden recomendado para el futuro plan técnico

1. Ampliar la identidad de las incidencias: solicitante, destinatario y cuenta afectada.
2. Implementar la consulta protegida del directorio y la validación de pertenencia a `CLAUSTRO`.
3. Introducir subtipos y estados propios para operaciones de cuentas.
4. Implementar solicitud, aprobación, denegación y auditoría sin ejecutar todavía cambios reales.
5. Añadir la ejecución protegida de restauración de contraseña y probar los casos de fallo.
6. Incorporar los adjuntos privados y su eliminación segura.
7. Posponer la creación de cuentas hasta disponer de la hoja y sus reglas.

## 7. Validación necesaria

La implementación no se considerará completa sin pruebas de:

- rechazo de solicitudes realizadas por usuarios que no pertenezcan a `CLAUSTRO`;
- rechazo de cuentas que no existan o que no comiencen por `alum.`;
- confirmación visual de la cuenta afectada antes de enviar;
- aprobación, denegación, ejecución correcta y fallo técnico;
- imposibilidad de ejecutar dos veces una misma aprobación;
- visibilidad correcta para solicitante y administrador;
- ausencia de contraseñas y credenciales en base de datos, correos y logs;
- permisos RLS de cada tipo de usuario;
- límites de cantidad, tamaño y tipo de adjuntos;
- descarga autenticada y denegación de acceso a terceros;
- eliminación física de adjuntos al borrar la incidencia;
- limpieza de objetos huérfanos;
- contenido y destinatarios de cada correo definido en la sección anterior.
