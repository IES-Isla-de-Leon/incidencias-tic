# Incidencias TIC · IES Isla de León

Aplicación interna para comunicar y gestionar incidencias TIC del centro. El frontend utiliza Vue 3, Vite y Tailwind CSS compilado; Supabase proporciona autenticación, PostgreSQL, RLS, funciones y tareas programadas.

## Estructura

```text
src/                 Aplicación Vue.
supabase/functions/  Edge Functions.
supabase/migrations/ Historial completo y reproducible de la base de datos.
docs/                Arquitectura, modelo de datos y documentación histórica.
```

Documentación:

- [Arquitectura y estado operativo](docs/arquitectura.md)
- [Modelo de datos](docs/modelo-datos.md)
- [Plan de trabajo pendiente](docs/plan-pendiente.md)
- [Prueba de aceptación P0](docs/prueba-aceptacion-p0.md)
- [Diseño futuro de cuentas, Workspace y adjuntos](docs/evolucion-cuentas-y-adjuntos.md)
- [Plan inicial histórico](docs/historico/plan-inicial.md)

## Desarrollo

1. Copia `.env.example` como `.env.local` y completa la URL y la clave publicable de Supabase.
2. Instala dependencias con `npm install`.
3. Ejecuta `npm run dev`.

## Servidor local y OAuth

El desarrollo y la previsualización usan siempre:

```text
http://localhost:4173/
```

El puerto está fijado mediante `strictPort: true`. Si `4173` está ocupado, Vite se detiene en lugar de seleccionar otro puerto. Libera el puerto y vuelve a ejecutar el servidor; no cambies la URL configurada en Supabase.

La Redirect URL local que debe estar permitida en Supabase Auth es:

```text
http://localhost:4173/
```

No uses `127.0.0.1` para las pruebas OAuth, porque se considera un origen distinto.

## Comprobaciones

```text
npm run lint
npm run test:run
npm run build
```

## Despliegue

La aplicación se publica mediante GitHub Actions en:

```text
https://ies-isla-de-leon.github.io/incidencias-tic/
```

El workflow `.github/workflows/deploy-pages.yml` ejecuta lint, pruebas y build antes de desplegar. Las variables públicas `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` se configuran como variables del repositorio en GitHub. La aplicación utiliza rutas hash y `base: './'`, por lo que funciona dentro de la subcarpeta de GitHub Pages.

Supabase Auth debe tener la URL de producción como `Site URL` y como Redirect URL exacta. Google OAuth debe admitir `https://ies-isla-de-leon.github.io` como origen JavaScript; la URI de redirección de Google sigue siendo la callback de Supabase.

## Seguridad

La interfaz oculta las acciones no autorizadas, pero la protección real reside en las políticas RLS de Supabase. Nunca debe incluirse una clave `service_role` ni secretos OAuth en el frontend.

La base remota tiene aplicadas, en este orden, las migraciones:

```text
supabase/migrations/202610110001_esquema_inicial.sql
supabase/migrations/202610110002_politicas_rls_iniciales.sql
supabase/migrations/202610120001_reforzar_historial_y_baja_estancias.sql
supabase/migrations/202610120002_permitir_borrado_incidencias.sql
supabase/migrations/202610120003_clasificar_incidencias.sql
supabase/migrations/202610130001_avisos_email.sql
supabase/migrations/202610140001_endurecer_funciones_privilegiadas.sql
```

Las dos primeras migraciones recogen el esquema y las políticas RLS que originalmente se aplicaron de forma manual. Las posteriores fuerzan que los cambios de estado procedan del historial de actualizaciones, sustituyen el borrado de estancias por su activación/desactivación, permiten borrar incidencias únicamente a los administradores, distinguen entre incidencias de cuentas de usuario y de equipamiento, añaden la cola de avisos por correo y endurecen las funciones `SECURITY DEFINER` y sus permisos de ejecución.

La CLI de Supabase está instalada como dependencia de desarrollo y el proyecto está vinculado. Para revisar y aplicar futuras migraciones:

```text
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

## Avisos por correo

Los avisos transaccionales se envían mediante Resend desde la Edge Function:

```text
supabase/functions/notificar-incidencia/
```

El remitente es `TDE <tde@iesisladeleon.es>`. Los eventos configurados son:

- nueva incidencia: un correo para cada administrador activo;
- nueva actualización: un correo para el usuario creador si contiene una observación, un cambio de estado o ambos;
- cambio exclusivo de prioridad: no genera correo;
- creación de incidencia: no genera un correo de confirmación al usuario.

`avisos_email` funciona como cola interna. Cada fila representa un destinatario, tiene una clave de idempotencia estable y admite hasta cinco intentos. La inserción intenta despertar inmediatamente la Edge Function y el trabajo `procesar-avisos-email` la invoca cada minuto para recuperar fallos o ejecuciones interrumpidas.

La tabla no es accesible desde el frontend. La función requiere:

- `RESEND_API_KEY`, almacenada en Edge Function Secrets;
- `INCIDENT_EMAIL_WEBHOOK_SECRET`, almacenado en Edge Function Secrets;
- `incident_email_webhook_secret`, con el mismo valor, almacenado en Vault;
- `project_url`, almacenado en Vault.

No se deben copiar esos valores al repositorio, a archivos `.env` del frontend ni a la documentación. Para desplegar de nuevo la función:

```text
npx supabase functions deploy notificar-incidencia --no-verify-jwt --use-api
```

Una llamada correcta con la cola vacía devuelve:

```json
{"processed":0,"sent":0,"failed":0}
```

Para consultar el estado de los envíos desde SQL:

```sql
select estado, count(*)
from public.avisos_email
group by estado
order by estado;
```

## Validación manual recomendada

- Cuenta externa: se cierra la sesión y se explica la restricción de dominio.
- Usuario desactivado: se cierra la sesión y se muestra un aviso.
- Usuario normal: crea y consulta solo sus incidencias y seguimientos.
- Usuario normal: al entrar elige entre gestión de cuentas de usuario e incidencias sobre equipamiento.
- Usuario normal: una incidencia de cuentas solicita únicamente descripción y urgencia; una de equipamiento conserva la selección de estancia.
- Administrador: consulta todas, filtra, cambia prioridad y registra cambios de estado.
- Administrador: abre las incidencias de una estancia desde su recuento y puede cambiar o retirar ese filtro.
- Administrador: elimina una incidencia de prueba tras la confirmación y se elimina también su seguimiento.
- Administrador: crea, edita, activa y desactiva estancias.
- Avisos: una nueva incidencia avisa a los administradores activos.
- Avisos: una observación o un cambio de estado avisa al usuario creador una sola vez.
- Avisos: un cambio exclusivo de prioridad no genera correo.
- Vista móvil: formulario, listados y modales son utilizables sin desplazamiento horizontal.


