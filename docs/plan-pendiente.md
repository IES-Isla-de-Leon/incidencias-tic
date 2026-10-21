# Plan de trabajo pendiente

Última revisión: 21 de octubre de 2026.

Este documento recoge el estado real del proyecto y sirve como hoja de ruta para preparar su uso general en el centro. Debe actualizarse cuando se complete una tarea o cambie su prioridad.

## Leyenda

- ✅ Completado.
- 🟡 Parcialmente completado o pendiente de validación sistemática.
- ⬜ Pendiente.

## Estado general

### Despliegue y seguridad básica

- ✅ Repositorio creado en la organización `IES-Isla-de-Leon` y publicado en GitHub.
- ✅ Frontend desplegado mediante GitHub Pages.
- ✅ Flujo de GitHub Actions configurado con comprobaciones de lint, pruebas y compilación antes del despliegue.
- ✅ URL definitiva registrada en Supabase Auth y Google OAuth.
- ✅ Acceso externo al sitio comprobado de forma básica.
- ✅ Migración de endurecimiento de funciones privilegiadas aplicada en Supabase.
- ✅ Historial del repositorio revisado sin detectar secretos evidentes.
- ✅ Credenciales sensibles rotadas cuando fue necesario y trasladadas al almacenamiento privado del responsable.
- ✅ Archivos locales con secretos excluidos de Git.

### Validación funcional en producción

- ✅ La prueba de aceptación P0 se cerró satisfactoriamente el 21 de octubre de 2026.
- ✅ Se validaron en producción la autenticación, los permisos, ambos tipos de incidencia y la gestión administrativa.
- ✅ Se comprobó el ciclo de avisos: nueva incidencia para administradores y actualización para el comunicante.
- ✅ Se comprobaron el bloqueo de envíos duplicados, las conexiones lentas y la recuperación ante fallos de red.
- ✅ Se comprobaron desde móvil las acciones principales del usuario y del administrador.

### Operación y mantenimiento

- 🟡 La cola `avisos_email` conserva estado, número de intentos y último error, y permite diagnosticar fallos mediante SQL.
- ⬜ No existe una pantalla para que un administrador vea avisos de correo fallidos y los reintente.
- ⬜ No se guarda el identificador que devuelve Resend para facilitar el seguimiento de cada envío.
- ⬜ Los roles, las bajas y la recuperación de acceso siguen gestionándose manualmente en Supabase, sin una guía operativa completa.
- ⬜ No hay un procedimiento documentado de copias, recuperación y actuación ante fallos de Supabase, OAuth o Resend.
- ⬜ Falta documentar quién debe conservar acceso administrativo a GitHub, Supabase, Google Cloud y Resend.

### Evolución técnica

- 🟡 Existen pruebas unitarias para componentes y utilidades importantes.
- ⬜ No hay pruebas automatizadas del recorrido completo contra una base de datos de pruebas.
- ⬜ La Edge Function y las plantillas de correo no tienen pruebas unitarias propias.
- ⬜ Los listados todavía cargan todas las incidencias; no hay paginación del lado del servidor.

### Integración con Workspace y adjuntos

- ✅ Se ha creado una cuenta de servicio de Google con acceso de solo lectura al directorio.
- ✅ Se ha verificado mediante una consulta real que la cuenta puede enumerar usuarios del dominio.
- ✅ La clave se conserva fuera del repositorio con permisos locales restringidos.
- ✅ Se han definido el flujo funcional de restauración de contraseñas de alumnado y el alcance inicial de los adjuntos.
- 🟡 El diseño consolidado y los requisitos de seguridad están recogidos en [evolucion-cuentas-y-adjuntos.md](evolucion-cuentas-y-adjuntos.md).
- ⬜ Falta autenticar la CLI y guardar la credencial como secreto de la Edge Function en Supabase.
- ⬜ Falta implementar la consulta protegida del directorio, la separación de identidades, la migración, las políticas RLS y los formularios.
- ⬜ Falta implementar la aprobación y ejecución segura de restauraciones de contraseña.
- ⬜ Falta crear el bucket privado, el modelo de adjuntos y su eliminación coordinada.
- ⬜ La creación de cuentas queda pospuesta hasta revisar la hoja de cálculo y sus reglas.

### Privacidad de los avisos

- ⬜ Falta validar expresamente si los correos deben incluir la descripción completa de la incidencia y los datos del comunicante, especialmente en las incidencias relacionadas con cuentas de usuario.
- ⬜ Si ese nivel de detalle no resulta apropiado, habrá que sustituirlo por un resumen mínimo y un enlace a la aplicación.

## Orden propuesto

### P0 — Validación de producción ✅

Completada el 21 de octubre de 2026. Se comprobó de manera sistemática que autenticación, permisos, gestión y correos funcionan conjuntamente en el entorno real.

La ejecución detallada y el registro de resultados se encuentran en [prueba-aceptacion-p0.md](prueba-aceptacion-p0.md). Cada problema debe identificarse mediante el código estable del paso correspondiente.

La prueba cubrió:

1. Iniciar sesión con ambas cuentas.
2. Crear una incidencia de «Gestión de cuentas de usuario» y otra de «Incidencias sobre equipamiento».
3. Confirmar que el usuario normal solo puede consultar sus propias incidencias.
4. Confirmar que la cuenta administradora ve y puede gestionar ambas.
5. Verificar que cada nueva incidencia genera el aviso para administradores.
6. Cambiar el estado y la observación administrativa y verificar el aviso al comunicante.
7. Repetir las acciones principales desde un móvil.
8. Comprobar el envío con conexión lenta, doble pulsación y un fallo de red controlado.
9. Anotar el resultado y cualquier incidencia encontrada.

P0 queda cerrada sin errores pendientes de permisos, duplicados ni avisos perdidos comunicados por el responsable.

### P1 — Decidir la privacidad del correo

Debe resolverse antes de extender el uso a todo el centro. La decisión será una de estas dos:

- mantener el contenido actual porque los destinatarios y el nivel de detalle son adecuados; o
- enviar únicamente código, tipo, estado y un enlace seguro a la aplicación.

La decisión y su justificación deben quedar documentadas.

### P1 — Crear una guía de administración y continuidad

Documentar, al menos:

- cómo nombrar y retirar administradores;
- cómo desactivar un usuario y recuperar su acceso;
- quién custodia los accesos de GitHub, Supabase, Google Cloud y Resend;
- cómo consultar y reintentar avisos fallidos;
- cómo exportar o recuperar los datos;
- qué revisar cuando fallen OAuth, Supabase o Resend.

Una interfaz para administrar usuarios puede posponerse; el procedimiento operativo no.

### P1 — Mejorar la gestión de avisos de correo

- Guardar en `avisos_email` el identificador devuelto por Resend.
- Añadir una vista administrativa de avisos fallidos.
- Permitir un reintento manual seguro, sin duplicar avisos ya enviados.

### P2 — Ampliar las pruebas automatizadas

- Añadir pruebas de creación y actualización de incidencias contra un entorno Supabase de pruebas.
- Probar las políticas de acceso con los roles `USUARIO` y `ADMINISTRADOR`.
- Añadir pruebas para la Edge Function y para la generación de los correos.
- Incorporar al flujo de integración continua las pruebas que no dependan de credenciales de producción.

### P1 — Restaurar contraseñas de alumnado

Implementar el flujo aprobado en [evolucion-cuentas-y-adjuntos.md](evolucion-cuentas-y-adjuntos.md): solo miembros de `CLAUSTRO` podrán solicitar la restauración de una cuenta existente cuyo correo comience por `alum.`. El administrador aprobará o denegará cada solicitud y la operación se ejecutará en backend con auditoría, sin almacenar ni enviar la contraseña.

Este trabajo incluye la base común para separar solicitante, destinatario y cuenta afectada, así como la consulta protegida del directorio. Es la siguiente ampliación funcional prioritaria tras el cierre de P0.

### P1 — Incorporar archivos adjuntos

Añadir hasta tres archivos JPEG, PNG o PDF de un máximo de 5 MB cada uno durante la creación de una incidencia. Se almacenarán en un bucket privado y solo podrán descargarlos los usuarios autorizados y el administrador. El borrado de la incidencia deberá eliminar físicamente sus objetos de Storage.

### P2 — Preparar recuperación y mantenimiento periódico

- Definir la estrategia de exportación o copia de seguridad.
- Escribir procedimientos breves de recuperación.
- Establecer una revisión periódica de `avisos_email`, usuarios desactivados y errores de la Edge Function.

### P3 — Incorporar paginación

Actualmente el volumen previsto permite aplazarla, pero deberá añadirse antes de que el listado acumule suficientes incidencias como para afectar al tiempo de carga. La solución debe paginar desde Supabase, no solo ocultar filas ya descargadas en el navegador.

### P3 — Crear cuentas de usuario

Mantener pospuesta esta ampliación hasta revisar la hoja de cálculo actual y documentar las reglas de nombres, homónimos, unidades organizativas, grupos y autorizaciones. Su diseño preliminar está conservado en [evolucion-cuentas-y-adjuntos.md](evolucion-cuentas-y-adjuntos.md).

## Próxima acción concreta

Preparar el diseño técnico ejecutable de la restauración de contraseñas de alumnado: migración del modelo, políticas RLS, consulta protegida del directorio, estados de aprobación, Edge Functions, auditoría, notificaciones y pruebas. La implementación debe comenzar por el flujo de solicitud y aprobación sin activar todavía el cambio real de contraseña.
