# Prueba de aceptación P0

Última revisión: 21 de octubre de 2026.

> **Estado:** P0 cerrada satisfactoriamente el 21 de octubre de 2026 por confirmación del responsable del proyecto. No se comunicaron fallos pendientes, duplicados ni avisos perdidos. La lista se conserva como procedimiento reproducible para futuras regresiones; el detalle de evidencias de esta ejecución no se registró en este documento.

## Objetivo y criterio de aprobación

Esta lista valida en producción la autenticación, el aislamiento entre usuarios, los dos tipos actuales de incidencia, la gestión administrativa, los avisos por correo y el funcionamiento básico en móvil y ante conexiones problemáticas.

P0 se considera superada únicamente cuando todos los pasos marcados como obligatorios tienen resultado `OK`, no aparecen incidencias duplicadas y no se pierde ningún aviso esperado. Cada problema debe comunicarse usando el identificador del paso, por ejemplo: `P0-MAIL-04`.

## Cuentas y datos necesarios

| Código | Cuenta | Requisitos |
|---|---|---|
| `U1` | Usuario normal 1 | Cuenta activa de `iesisladeleon.es`, rol `USUARIO` y acceso a su correo. |
| `U2` | Usuario normal 2 | Cuenta activa distinta de `U1`, rol `USUARIO` y acceso a su correo. Es necesaria para demostrar aislamiento real. |
| `A1` | Administrador | Cuenta activa de `iesisladeleon.es`, rol `ADMINISTRADOR` y acceso al buzón que recibe avisos. |
| `X1` | Cuenta externa | Cuenta que no pertenezca a `iesisladeleon.es`. Solo se usa para comprobar el rechazo de dominio. |

También se necesita una estancia activa que pueda utilizarse para una incidencia de prueba. Se denomina `S1` en esta lista.

Usar dos perfiles de navegador o una ventana normal y otra privada para mantener abiertas simultáneamente las sesiones de usuario y administrador. No compartir una misma sesión entre cuentas.

Antes de empezar, definir un identificador único de ejecución con el formato:

```text
P0-AAAAMMDD-HHMM
```

Debe incluirse al principio de todas las descripciones y observaciones. Ejemplo: `P0-20261020-1730 — prueba de cuentas`.

Registrar durante la prueba:

- identificador de ejecución;
- correos utilizados como `U1`, `U2` y `A1`;
- nombre de `S1`;
- código de cada incidencia creada;
- hora aproximada de cada acción;
- asunto y destinatario de cada correo recibido;
- resultado `OK` o `FALLO` de cada paso;
- captura o explicación breve cuando exista un fallo.

## A. Preparación

- [ ] **`P0-PRE-01` — Confirmar despliegue.** Cuenta: ninguna. Abrir `https://ies-isla-de-leon.github.io/incidencias-tic/`. **Esperado:** carga la pantalla de acceso sin error visible y mediante HTTPS.
- [ ] **`P0-PRE-02` — Confirmar cuentas.** Cuenta: responsable de la prueba. Verificar que `U1` y `U2` tienen rol `USUARIO`, `A1` tiene rol `ADMINISTRADOR` y las tres están activas. **Esperado:** la configuración coincide y se tiene acceso a los tres buzones.
- [ ] **`P0-PRE-03` — Confirmar estancia.** Cuenta: `A1`. Elegir una estancia activa existente como `S1` sin modificarla. **Esperado:** `S1` aparece como activa en la administración de estancias.
- [ ] **`P0-PRE-04` — Preparar sesiones separadas.** Cuentas: `U1`, `U2` y `A1`. Abrir cada cuenta en un perfil o contexto de navegador independiente. **Esperado:** cambiar de una ventana a otra no sustituye la sesión de las demás.

## B. Autenticación y autorización de rutas

- [ ] **`P0-AUTH-01` — Rechazar cuenta externa.** Cuenta: `X1`. Intentar iniciar sesión desde la portada. **Esperado:** la aplicación no concede acceso, cierra cualquier sesión creada y muestra que el acceso está limitado al dominio `iesisladeleon.es`.
- [ ] **`P0-AUTH-02` — Acceso de usuario normal.** Cuenta: `U1`. Iniciar sesión con Google. **Esperado:** aparece la vista de usuario con el saludo, las opciones «Gestión de cuentas de usuario» e «Incidencias sobre equipamiento» y el listado «Mis incidencias».
- [ ] **`P0-AUTH-03` — Bloqueo de ruta administrativa.** Cuenta: `U1`. Escribir directamente `https://ies-isla-de-leon.github.io/incidencias-tic/#/admin/incidencias`. **Esperado:** la aplicación redirige a `#/` y no muestra listados, filtros ni controles administrativos.
- [ ] **`P0-AUTH-04` — Acceso de segundo usuario.** Cuenta: `U2`. Iniciar sesión con Google en otra sesión de navegador. **Esperado:** aparece la vista de usuario y no se comparte la sesión de `U1`.
- [ ] **`P0-AUTH-05` — Acceso administrativo.** Cuenta: `A1`. Iniciar sesión con Google. **Esperado:** la aplicación redirige a `#/admin`, muestra «Panel TIC», sus contadores y el botón «Ver incidencias».
- [ ] **`P0-AUTH-06` — Redirección del administrador.** Cuenta: `A1`. Escribir directamente la ruta `#/`. **Esperado:** la aplicación vuelve a `#/admin`; el administrador no recibe por error la vista de creación de un usuario normal.

## C. Creación de los dos tipos de incidencia

- [ ] **`P0-CREATE-01` — Abrir formulario de cuentas.** Cuenta: `U1`. Elegir «Gestión de cuentas de usuario». **Esperado:** aparece un formulario sin selector de estancia, con descripción y opción de urgencia.
- [ ] **`P0-CREATE-02` — Validar descripción obligatoria.** Cuenta: `U1`. Intentar enviar el formulario anterior con la descripción vacía. **Esperado:** no se crea ninguna incidencia y se solicita describir el problema.
- [ ] **`P0-CREATE-03` — Crear incidencia de cuentas.** Cuenta: `U1`. Escribir `<ID-EJECUCION> — prueba de gestión de cuentas`, no marcar urgencia y pulsar una sola vez «Enviar incidencia». **Esperado:** el botón queda temporalmente deshabilitado, aparece «Incidencia enviada correctamente» y se muestra un único código. Registrar el código como `C1`.
- [ ] **`P0-CREATE-04` — Ver C1 como propietario.** Cuenta: `U1`. Volver al inicio del formulario si fuese necesario y localizar `C1` en «Mis incidencias». **Esperado:** aparece una sola vez, con tipo «Gestión de cuentas de usuario», prioridad `Normal` y estado `Abierta`.
- [ ] **`P0-CREATE-05` — Abrir formulario de equipamiento.** Cuenta: `U2`. Elegir «Incidencias sobre equipamiento». **Esperado:** aparece el selector obligatorio de estancia, además de descripción y urgencia.
- [ ] **`P0-CREATE-06` — Validar estancia obligatoria.** Cuenta: `U2`. Escribir una descripción pero intentar enviar sin elegir estancia. **Esperado:** no se crea ninguna incidencia y se solicita seleccionar una estancia.
- [ ] **`P0-CREATE-07` — Crear incidencia urgente de equipamiento.** Cuenta: `U2`. Seleccionar `S1`, escribir `<ID-EJECUCION> — prueba de equipamiento`, marcar urgencia y enviar una sola vez. **Esperado:** aparece la confirmación con un único código. Registrar el código como `C2`.
- [ ] **`P0-CREATE-08` — Ver C2 como propietario.** Cuenta: `U2`. Localizar y abrir `C2`. **Esperado:** aparece una sola vez, con tipo «Incidencias sobre equipamiento», estancia `S1`, prioridad `Urgente`, estado `Abierta` y sin actualizaciones.

## D. Aislamiento entre usuarios y visibilidad administrativa

- [ ] **`P0-PERM-01` — U1 no ve C2.** Cuenta: `U1`. Actualizar «Mis incidencias» y buscar visualmente el código `C2`. **Esperado:** `C2` no aparece.
- [ ] **`P0-PERM-02` — U2 no ve C1.** Cuenta: `U2`. Actualizar «Mis incidencias» y buscar visualmente el código `C1`. **Esperado:** `C1` no aparece.
- [ ] **`P0-PERM-03` — Administrador ve ambas.** Cuenta: `A1`. Abrir «Ver incidencias» y buscar primero `C1` y después `C2`. **Esperado:** ambas aparecen exactamente una vez y muestran el nombre y correo del comunicante correcto.
- [ ] **`P0-PERM-04` — Filtrar por tipo.** Cuenta: `A1`. Aplicar el filtro «Gestión de cuentas de usuario» y después «Incidencias sobre equipamiento». **Esperado:** `C1` aparece solo con el primer filtro y `C2` solo con el segundo.
- [ ] **`P0-PERM-05` — Filtrar por prioridad y estancia.** Cuenta: `A1`. Filtrar por prioridad `Urgente` y por `S1`. **Esperado:** `C2` permanece visible y `C1` no aparece.
- [ ] **`P0-PERM-06` — Revisar detalle administrativo.** Cuenta: `A1`. Abrir `C1` y `C2`. **Esperado:** descripción, tipo, fecha, prioridad, estado, comunicante y, para `C2`, estancia y ubicación, coinciden con lo introducido.

## E. Correos por creación

Esperar hasta tres minutos por cada aviso, porque la cola dispone de una tarea de recuperación cada minuto. Buscar también en correo no deseado. No continuar con la gestión de una incidencia hasta haber registrado el resultado de su aviso de creación.

- [ ] **`P0-MAIL-01` — Aviso administrativo de C1.** Buzón: `A1`. **Esperado:** llega exactamente un correo cuyo asunto contiene `C1`; identifica el tipo de cuentas, prioridad normal y a `U1` como comunicante.
- [ ] **`P0-MAIL-02` — Aviso administrativo de C2.** Buzón: `A1`. **Esperado:** llega exactamente un correo cuyo asunto contiene `C2`; identifica el tipo de equipamiento, prioridad urgente, la estancia `S1` y a `U2` como comunicante.
- [ ] **`P0-MAIL-03` — Sin confirmación de creación para U1.** Buzón: `U1`. **Esperado:** no llega ningún correo por la creación de `C1`.
- [ ] **`P0-MAIL-04` — Sin confirmación de creación para U2.** Buzón: `U2`. **Esperado:** no llega ningún correo por la creación de `C2`.

## F. Gestión, historial y correos de actualización

- [ ] **`P0-MANAGE-01` — Cambiar solo prioridad.** Cuenta: `A1`. Abrir `C1`, cambiar prioridad de `Normal` a `Alta`, dejar estado en `Abierta` y observación vacía, y pulsar «Guardar actualización». **Esperado:** aparece «Cambios guardados», la prioridad pasa a `Alta` y el seguimiento continúa vacío.
- [ ] **`P0-MANAGE-02` — Cambio de prioridad sin correo.** Buzón: `U1`. Esperar tres minutos desde `P0-MANAGE-01`. **Esperado:** no llega ningún correo por el cambio exclusivo de prioridad.
- [ ] **`P0-MANAGE-03` — Registrar estado y observación juntos.** Cuenta: `A1`. Abrir `C1`, seleccionar estado `En progreso`, escribir `<ID-EJECUCION> — actualización conjunta de P0` y guardar. **Esperado:** aparece «Cambios guardados», el estado pasa a `En progreso` y el seguimiento contiene una única entrada con ese estado, texto, fecha y administrador.
- [ ] **`P0-MANAGE-04` — Un único correo por actualización conjunta.** Buzón: `U1`. Esperar hasta tres minutos. **Esperado:** llega exactamente un correo referente a `C1`, con el nuevo estado y la observación; no llegan dos correos separados.
- [ ] **`P0-MANAGE-05` — Propietario ve el seguimiento.** Cuenta: `U1`. Actualizar el listado y abrir `C1`. **Esperado:** se muestran prioridad `Alta`, estado `En progreso` y una sola actualización con el contenido registrado en `P0-MANAGE-03`; no aparecen controles administrativos.
- [ ] **`P0-MANAGE-06` — Resolver C2 mediante acción rápida.** Cuenta: `A1`. Abrir `C2` y pulsar «Resolver» sin observación. **Esperado:** el estado cambia a `Resuelta` y el seguimiento incorpora una única entrada de cambio de estado.
- [ ] **`P0-MANAGE-07` — Correo de resolución.** Buzón: `U2`. Esperar hasta tres minutos. **Esperado:** llega exactamente un correo referente a `C2` indicando el estado `Resuelta`.
- [ ] **`P0-MANAGE-08` — U1 no recibe correo de C2.** Buzón: `U1`. **Esperado:** no recibe el aviso de resolución de `C2`.

## G. Doble pulsación, conexión lenta y fallo de red

Estas pruebas crean incidencias adicionales de cuentas porque no requieren estancia. Registrar sus códigos como `C3`, `C4` y `C5`.

- [ ] **`P0-NET-01` — Doble pulsación.** Cuenta: `U1`. Abrir una incidencia de cuentas con descripción `<ID-EJECUCION> — doble pulsación`; hacer doble clic rápido sobre «Enviar incidencia». **Esperado:** el botón se deshabilita, solo aparece un código `C3`, `C3` figura una sola vez en el listado y `A1` recibe un solo aviso.
- [ ] **`P0-NET-02` — Activar conexión lenta.** Cuenta: `U1`. Abrir las herramientas del navegador, seleccionar una limitación equivalente a `Slow 3G` y mantener la red conectada. **Esperado:** la aplicación continúa visible y la sesión permanece iniciada.
- [ ] **`P0-NET-03` — Envío con conexión lenta.** Cuenta: `U1`. Crear una incidencia de cuentas con descripción `<ID-EJECUCION> — conexión lenta`. **Esperado:** durante el envío aparece «Enviando…», no se permiten nuevos clics y finalmente se obtiene un único código `C4`. `C4` aparece una vez y genera un solo aviso para `A1`.
- [ ] **`P0-NET-04` — Simular pérdida de red.** Cuenta: `U1`. Preparar una incidencia de cuentas con descripción `<ID-EJECUCION> — fallo de red`; antes de enviarla, poner las herramientas del navegador en modo `Offline`. **Esperado:** no aparece una confirmación ni un código y se muestra un error comprensible. No se crea una incidencia ni llega correo al administrador.
- [ ] **`P0-NET-05` — Recuperar tras el fallo.** Cuenta: `U1`. Restaurar la conexión, conservar o volver a introducir la misma descripción y enviar una sola vez. **Esperado:** se crea un único código `C5`, aparece una vez en el listado y `A1` recibe exactamente un aviso.
- [ ] **`P0-NET-06` — Restaurar configuración de red.** Cuenta: `U1`. Quitar `Offline` o `Slow 3G` y seleccionar `No throttling`. **Esperado:** la navegación y actualización del listado vuelven a funcionar normalmente.

## H. Comprobación móvil

Puede utilizarse un teléfono real o una emulación de `390 × 844` píxeles. No se debe aceptar desplazamiento horizontal de toda la página.

- [ ] **`P0-MOBILE-01` — Portada y selección.** Cuenta: `U1`. Abrir la aplicación en vista móvil e iniciar sesión. **Esperado:** saludo, selector de tipo y listado son legibles, utilizables y no producen desplazamiento horizontal.
- [ ] **`P0-MOBILE-02` — Crear desde móvil.** Cuenta: `U1`. Crear una incidencia de cuentas con descripción `<ID-EJECUCION> — prueba móvil`. **Esperado:** formulario y botón son utilizables, aparece un único código `C6` y `A1` recibe un solo aviso.
- [ ] **`P0-MOBILE-03` — Consultar detalle como usuario.** Cuenta: `U1`. Abrir `C6`. **Esperado:** el modal cabe en la pantalla, permite desplazamiento vertical interno, muestra todos los datos y se puede cerrar.
- [ ] **`P0-MOBILE-04` — Gestionar desde móvil.** Cuenta: `A1`. Abrir la administración en vista móvil, localizar `C6`, abrirlo, añadir `<ID-EJECUCION> — actualización móvil` y cambiar su estado a `Resuelta`. **Esperado:** filtros, listado, modal y controles son utilizables; se guarda una sola actualización.
- [ ] **`P0-MOBILE-05` — Recibir actualización móvil.** Buzón: `U1`. **Esperado:** llega exactamente un correo referente a `C6`, con estado `Resuelta` y la observación móvil.

## I. Borrado y limpieza

No limpiar los datos de una prueba que haya fallado hasta documentar el problema. Cuando todo esté registrado, eliminar mediante la aplicación las incidencias `C1` a `C6` que realmente se hayan creado.

- [ ] **`P0-DELETE-01` — Cancelar un borrado.** Cuenta: `A1`. Abrir `C1`, pulsar «Eliminar incidencia» y después «Cancelar». **Esperado:** el cuadro de confirmación desaparece y `C1` continúa existiendo.
- [ ] **`P0-DELETE-02` — Confirmar un borrado.** Cuenta: `A1`. Volver a iniciar el borrado de `C1` y pulsar «Sí, eliminar definitivamente». **Esperado:** el modal se cierra y `C1` deja de aparecer en el listado administrativo.
- [ ] **`P0-DELETE-03` — Propietario deja de ver la incidencia.** Cuenta: `U1`. Actualizar «Mis incidencias». **Esperado:** `C1` ya no aparece y la aplicación no muestra un error.
- [ ] **`P0-DELETE-04` — Limpiar el resto.** Cuenta: `A1`. Eliminar `C2`, `C3`, `C4`, `C5` y `C6`, omitiendo cualquier código que no llegara a crearse. **Esperado:** ninguno permanece en el listado al buscar por el identificador de ejecución.

## Plantilla de registro para futuras ejecuciones

| ID | Resultado (`OK`/`FALLO`/`NO EJECUTADO`) | Evidencia o incidencia observada |
|---|---|---|
| `P0-PRE-01` |  |  |
| `P0-PRE-02` |  |  |
| `P0-PRE-03` |  |  |
| `P0-PRE-04` |  |  |
| `P0-AUTH-01` |  |  |
| `P0-AUTH-02` |  |  |
| `P0-AUTH-03` |  |  |
| `P0-AUTH-04` |  |  |
| `P0-AUTH-05` |  |  |
| `P0-AUTH-06` |  |  |
| `P0-CREATE-01` a `P0-CREATE-08` |  |  |
| `P0-PERM-01` a `P0-PERM-06` |  |  |
| `P0-MAIL-01` a `P0-MAIL-04` |  |  |
| `P0-MANAGE-01` a `P0-MANAGE-08` |  |  |
| `P0-NET-01` a `P0-NET-06` |  |  |
| `P0-MOBILE-01` a `P0-MOBILE-05` |  |  |
| `P0-DELETE-01` a `P0-DELETE-04` |  |  |

Si un bloque contiene resultados distintos, registrar cada identificador en una fila separada para poder referenciar el fallo sin ambigüedad.

## Resultado final

- Fecha de cierre de P0: 21 de octubre de 2026.
- Responsable: responsable del proyecto.
- Resultado global: `APROBADA`.
- Pasos con fallo comunicados: ninguno.
- Incidencias de prueba conservadas para diagnóstico: ninguna comunicada.
- Observaciones: cierre registrado por confirmación del responsable; no se archivó el detalle individual de la ejecución.
