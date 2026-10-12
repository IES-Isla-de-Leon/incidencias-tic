# Incidencias TIC · IES Isla de León

Migración del MVP validado a Vue 3, Vite y Tailwind CSS compilado.

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

La aplicación utiliza rutas hash y `base: './'`, por lo que puede desplegarse en una subcarpeta de GitHub Pages. Antes de publicar hay que añadir la URL final a las Redirect URLs permitidas en Supabase Auth.

## Seguridad

La interfaz oculta las acciones no autorizadas, pero la protección real reside en las políticas RLS de Supabase. Nunca debe incluirse una clave `service_role` ni secretos OAuth en el frontend.

Antes de usar la administración de la versión Vue debe aplicarse, mediante el editor SQL de Supabase, la migración:

```text
supabase/migrations/202610120001_reforzar_historial_y_baja_estancias.sql
```

Esta migración fuerza que los cambios de estado procedan del historial de actualizaciones y sustituye el borrado de estancias por su activación/desactivación.

## Validación manual recomendada

- Cuenta externa: se cierra la sesión y se explica la restricción de dominio.
- Usuario desactivado: se cierra la sesión y se muestra un aviso.
- Usuario normal: crea y consulta solo sus incidencias y seguimientos.
- Administrador: consulta todas, filtra, cambia prioridad y registra cambios de estado.
- Administrador: crea, edita, activa y desactiva estancias.
- Vista móvil: formulario, listados y modales son utilizables sin desplazamiento horizontal.


