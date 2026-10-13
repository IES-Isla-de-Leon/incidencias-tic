# Plan de trabajo pendiente

Última revisión: 14 de octubre de 2026.

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

- 🟡 La aplicación desplegada se ha probado de forma general y funciona correctamente en las comprobaciones realizadas.
- 🟡 El formulario impide nuevos envíos mientras una creación está en curso, pero falta comprobar de forma dirigida el comportamiento ante doble pulsación y conexiones lentas.
- 🟡 Se ha comprobado el envío real de correo con Resend, incluido al menos un aviso de nueva incidencia.
- ⬜ Falta una prueba de aceptación completa y anotada con una cuenta normal y una cuenta administradora.
- ⬜ Falta confirmar en producción el ciclo completo de los dos avisos: nueva incidencia para administradores y actualización para el comunicante.
- ⬜ Falta una comprobación específica en móvil y ante errores o pérdida de conexión.

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

### Privacidad de los avisos

- ⬜ Falta validar expresamente si los correos deben incluir la descripción completa de la incidencia y los datos del comunicante, especialmente en las incidencias relacionadas con cuentas de usuario.
- ⬜ Si ese nivel de detalle no resulta apropiado, habrá que sustituirlo por un resumen mínimo y un enlace a la aplicación.

## Orden propuesto

### P0 — Cerrar la validación de producción

Es el siguiente paso más prioritario. Antes de añadir nuevas funciones conviene comprobar de manera sistemática que autenticación, permisos, gestión y correos funcionan conjuntamente en el entorno real.

La prueba debe realizarse con una cuenta normal y una administradora e incluir:

1. Iniciar sesión con ambas cuentas.
2. Crear una incidencia de «Gestión de cuentas de usuario» y otra de «Incidencias sobre equipamiento».
3. Confirmar que el usuario normal solo puede consultar sus propias incidencias.
4. Confirmar que la cuenta administradora ve y puede gestionar ambas.
5. Verificar que cada nueva incidencia genera el aviso para administradores.
6. Cambiar el estado y la observación administrativa y verificar el aviso al comunicante.
7. Repetir las acciones principales desde un móvil.
8. Comprobar el envío con conexión lenta, doble pulsación y un fallo de red controlado.
9. Anotar el resultado y cualquier incidencia encontrada.

Se considerará terminado cuando todos los puntos estén comprobados y no haya errores de permisos, duplicados ni avisos perdidos.

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

### P2 — Preparar recuperación y mantenimiento periódico

- Definir la estrategia de exportación o copia de seguridad.
- Escribir procedimientos breves de recuperación.
- Establecer una revisión periódica de `avisos_email`, usuarios desactivados y errores de la Edge Function.

### P3 — Incorporar paginación

Actualmente el volumen previsto permite aplazarla, pero deberá añadirse antes de que el listado acumule suficientes incidencias como para afectar al tiempo de carga. La solución debe paginar desde Supabase, no solo ocultar filas ya descargadas en el navegador.

## Próxima acción concreta

Preparar y ejecutar la prueba de aceptación de P0, registrando cada resultado en este mismo documento o en una lista de comprobación vinculada. Si aparece un fallo, su corrección tendrá prioridad sobre las mejoras P1–P3.
