# Arquitectura y estado operativo — Gestión de incidencias TIC · IES Isla de León

> Fuente de verdad actual del proyecto. Actualizado el 14/10/2026.
>
> La aplicación vigente ocupa la raíz del repositorio. Las secciones que describen la migración desde los prototipos se conservan como contexto, pero esa migración ya está implementada.

## Resumen operativo actual

- Frontend Vue 3 + Vite + Tailwind CSS compilado: implementado.
- Backend Supabase y RLS del MVP: operativo; las migraciones hasta `202610140001` están aplicadas en remoto.
- Avisos por correo: activos mediante Resend, Edge Function, cola persistente y reintentos.
- Lint, 11 pruebas unitarias, comprobación de tipos de la Edge Function y build de producción: correctos.
- Git: repositorio `IES-Isla-de-Leon/incidencias-tic`, rama principal `main` y remoto `origin` configurado.
- Publicación: GitHub Pages mediante GitHub Actions en `https://ies-isla-de-leon.github.io/incidencias-tic/`.
- Pendiente: completar pruebas manuales autenticadas con perfiles `USUARIO` y `ADMINISTRADOR`.
- Servidor local canónico: `http://localhost:4173/`.
- Vite usa el puerto `4173` en modo estricto; no cambia automáticamente si está ocupado.

## 1. Objetivo del proyecto

Aplicación web interna para comunicar y gestionar incidencias TIC del IES Isla de León.

Debe ser sencilla para el usuario normal y permitir una gestión más completa al administrador.

El backend ya está operativo sobre Supabase y **no debe sustituirse ni rediseñarse salvo necesidad real**.

---

# 2. Estado actual

## Backend: COMPLETADO PARA EL MVP

Ya están funcionando y probados:

- Supabase creado y operativo.
- PostgreSQL configurado.
- Google OAuth configurado.
- Login con cuentas del dominio funcionando.
- Alta automática de usuarios tras el primer login.
- Row Level Security configurado.
- Permisos probados con:
  - usuario normal;
  - administrador.
- Triggers funcionando.
- Generación automática de códigos de incidencia.
- Sincronización automática del estado desde las actualizaciones.

La seguridad ha sido probada manualmente:

### Usuario normal

Puede:

- iniciar sesión;
- consultar estancias activas;
- crear incidencias propias;
- ver únicamente sus incidencias;
- consultar sus actualizaciones.

No puede:

- ver incidencias de otros usuarios;
- modificar incidencias;
- cambiar prioridad;
- cambiar estado;
- crear actualizaciones;
- gestionar estancias.

### Administrador

Puede:

- ver todas las incidencias;
- modificar prioridad;
- modificar estado;
- crear actualizaciones;
- gestionar estancias.

---

# 3. Supabase

## Proyecto

```text
https://nynfesrryincxqpqfmmf.supabase.co
```

## Publishable key

```text
sb_publishable_IeWhPD2AD3d4pHnneoOJfA_yb9cE256
```

Es una clave pública/publishable. La seguridad depende de RLS.

## Importante

No usar nunca una `service_role` key en frontend.

---

# 4. Modelo de datos actual

Existen cinco entidades principales.

## usuarios

Descripción:

Usuarios autenticados mediante Google. Se crean automáticamente en el primer login.

Campos:

```text
id
email
nombre
rol
activo
```

Roles:

```text
USUARIO
ADMINISTRADOR
```

En el MVP no existe interfaz para gestionar roles.

Los administradores se configuran manualmente.

---

## estancias

Descripción:

Espacios físicos del centro donde pueden producirse incidencias.

Campos:

```text
id
nombre
ubicacion
equipamiento
activo
```

`nombre` es único.

Valores válidos de `ubicacion`:

```text
Edif. principal, pl. baja
Edif. principal, pl. 1
Edif. principal, pl. 2
Módulo norte, pl. baja
Módulo norte, pl. 1
Módulo norte, pl. 2
Gimnasio
```

`equipamiento` es texto libre.

Actualmente NO existe una entidad independiente `equipos`.

Debe dejarse abierta la posibilidad de añadirla posteriormente.

---

## incidencias

Campos:

```text
id
codigo
fecha_creacion
creada_por
tipo
estancia_id
descripcion
prioridad
estado
```

Código visible generado automáticamente:

```text
INC-2026-0001
INC-2026-0002
...
INC-2027-0001
```

Prioridades:

```text
BAJA
NORMAL
ALTA
URGENTE
```

Regla:

- una incidencia nace como `NORMAL`;
- si el usuario marca que es urgente, nace como `URGENTE`;
- después el administrador puede modificarla.

Estados:

```text
ABIERTA
EN_PROGRESO
BLOQUEADA
RESUELTA
```

`BLOQUEADA` significa que la incidencia no puede continuar temporalmente por una dependencia externa: material, proveedor, obra, autorización, etc.

El usuario no puede editar ni eliminar una incidencia tras enviarla.

---

## actualizaciones

Descripción:

Seguimiento de una incidencia realizado exclusivamente por administradores.

Campos:

```text
id
incidencia_id
fecha
usuario_id
observacion
estado
```

Una actualización puede contener:

```text
solo observacion
solo cambio de estado
ambas cosas
```

Si una actualización incluye estado, se actualiza automáticamente `incidencias.estado`.

Las actualizaciones son inmutables:

```text
NO editar
NO borrar
```

---

## avisos_email

Descripción:

Cola interna de correos transaccionales. Cada fila representa un destinatario concreto y conserva el estado del envío.

Campos:

```text
id
tipo_evento
incidencia_id
actualizacion_id
destinatario_email
destinatario_nombre
estado
intentos
proximo_intento
ultimo_error
creado_en
bloqueado_en
enviado_en
```

Eventos:

- `NUEVA_INCIDENCIA`: se crea una fila por cada administrador activo.
- `ACTUALIZACION`: se crea una fila para el usuario creador cuando un administrador registra una observación, un cambio de estado o ambos.
- Un cambio exclusivo de prioridad no crea avisos.
- La creación no genera un correo de confirmación al usuario.

La cola no es accesible para `anon` ni `authenticated`. La Edge Function usa credenciales de servicio únicamente en backend.

---

# 5. Backend ya implementado

Existen SQL ya ejecutados para:

- ENUMs;
- tablas;
- relaciones;
- índices;
- triggers;
- generación de código;
- alta automática de usuarios;
- cola de avisos, reintentos e idempotencia;
- invocación asíncrona mediante `pg_net` y recuperación mediante `pg_cron`;
- RLS;
- permisos SQL.

No recrear el backend desde cero.

Si se trabaja desde un repositorio nuevo, conviene versionar estos SQL como migraciones o documentación.

---

# 6. Autenticación

Proveedor:

```text
Google OAuth
```

El login debe estar orientado al dominio:

```text
iesisladeleon.es
```

En frontend se ha usado:

```js
queryParams: {
  hd: 'iesisladeleon.es',
  prompt: 'select_account'
}
```

La seguridad real del dominio se refuerza en backend/RLS.

## Redirect OAuth

MUY IMPORTANTE:

La app puede ejecutarse desde una subcarpeta.

No usar únicamente:

```js
window.location.origin
```

porque pierde el pathname.

Usar la URL completa actual, por ejemplo:

```js
window.location.href.split('#')[0].split('?')[0]
```

o equivalente robusto.

Esto ya fue un problema detectado durante las pruebas.

---

# 7. Frontend: decisión tecnológica definitiva

NO usar React.

La siguiente versión debe hacerse con:

```text
Vue 3
Vite
Tailwind CSS compilado
Supabase JS
```

Preferencia:

- Vue 3 con Composition API.
- Single File Components (`.vue`).
- JavaScript inicialmente; TypeScript solo si aporta valor real.
- Evitar sobrearquitectura.

No usar Tailwind por CDN en la versión nueva.

El CDN se utilizó únicamente para validar el prototipo.

---

# 8. Motivo de la migración

El prototipo Vanilla JS ya funciona, pero ha llegado a un punto donde:

- existe demasiado HTML incrustado en JavaScript;
- se manejan manualmente vistas;
- se manejan manualmente modales;
- se manejan manualmente filtros y renderizados;
- `innerHTML` empieza a perjudicar mantenibilidad.

Vue debe utilizarse para:

- componentes;
- estado reactivo;
- vistas;
- formularios;
- modales;
- filtros;
- listas;
- reutilización de UI.

---

# 9. Estructura Vue propuesta

Una estructura razonable:

```text
src/
├── components/
│   ├── AppHeader.vue
│   ├── IncidentForm.vue
│   ├── IncidentList.vue
│   ├── IncidentRow.vue
│   ├── IncidentDetailModal.vue
│   ├── StatusBadge.vue
│   ├── PriorityBadge.vue
│   └── RoomModal.vue
│
├── views/
│   ├── UserHome.vue
│   ├── AdminDashboard.vue
│   ├── AdminIncidents.vue
│   └── AdminRooms.vue
│
├── composables/
│   ├── useAuth.js
│   ├── useIncidents.js
│   └── useRooms.js
│
├── services/
│   └── supabase.js
│
├── router/
│   └── index.js
│
├── App.vue
└── main.js
```

Vue Router es opcional pero recomendable si ayuda a separar las vistas de administración.

Evitar Pinia salvo que realmente haga falta.

---

# 10. UX definida

## Usuario normal

El usuario normal NO debe tener menú lateral.

La pantalla principal debe ser deliberadamente simple.

Orden:

```text
Cabecera institucional

Mensaje de bienvenida

Nueva incidencia
  - elegir Gestión de cuentas de usuario o Incidencias sobre equipamiento
  - estancia buscable solo para equipamiento
  - descripción
  - checkbox urgente
  - enviar

Mis incidencias
  - listado
  - estado
  - prioridad
  - fecha
  - estancia
  - abrir detalle

Detalle
  - descripción original
  - estado
  - prioridad
  - seguimiento
```

Nada de:

- dashboard;
- estadísticas;
- menú lateral;
- administración;
- navegación compleja.

El objetivo es que entre y pueda comunicar una incidencia inmediatamente.

---

## Administrador

El administrador sí dispone de navegación.

Secciones principales:

```text
Panel
Incidencias
Estancias
```

### Panel

Puede mostrar:

- abiertas;
- en progreso;
- bloqueadas;
- urgentes;
- últimas incidencias.

No debe convertirse en una pantalla sobrecargada.

### Incidencias

Debe incluir:

- listado completo;
- búsqueda;
- filtro por tipo;
- filtro por estado;
- filtro por prioridad;
- filtro por estancia, enlazable desde el listado de estancias;
- detalle;
- cambio de prioridad;
- cambio de estado;
- nueva actualización;
- borrado con confirmación, disponible únicamente para administradores.

### Estancias

Debe ser una sección independiente.

El listado puede llegar a ser grande.

Debe incluir:

- búsqueda;
- filtros por ubicación y por existencia de incidencias no resueltas;
- listado con recuento total de incidencias por estancia;
- enlace desde el recuento al listado de incidencias filtrado;
- creación mediante modal o formulario separado.

NO mostrar permanentemente un formulario de nueva estancia al lado del listado.

---

# 11. Guía visual

La referencia visual principal es:

```text
https://www.iesisladeleon.es
```

La nueva aplicación debe seguir esa identidad.

## Tipografía

Usar exclusivamente:

```text
Source Sans
```

Preferentemente `Source Sans 3`.

## Cabecera

Se desea replicar o aproximar la cabecera institucional de la web.

Puede usarse directamente el logo existente del centro.

Durante el prototipo se usó:

```text
https://iesisladeleon.es/wp-content/uploads/2025/08/Logo.png
```

Hotlinking es aceptable durante el desarrollo.

Para producción puede copiarse el asset al proyecto si conviene.

## Layout

NO usar contenido full-width.

Usar un contenedor central con ancho máximo.

Referencia actual:

```text
max-width: ~1180px
```

y:

```text
width: 100%
padding horizontal responsive
```

En pantallas pequeñas debe reducirse naturalmente.

---

# 12. Principios de interfaz

- sencilla;
- institucional;
- limpia;
- legible;
- responsive;
- poco ruido visual;
- sin exceso de tarjetas;
- sin dashboards innecesarios;
- acciones principales muy claras.

El usuario normal debe sentir que está usando un formulario de servicio, no un ERP.

---

# 13. Flujo esperado de usuario

```text
Login Google
↓
Nueva incidencia visible inmediatamente
↓
Elige gestión de cuentas o equipamiento
↓
Si es equipamiento, selecciona una estancia
↓
Describe problema
↓
Opcional: marca urgente
↓
Enviar
↓
La incidencia aparece en "Mis incidencias"
↓
Puede consultar seguimiento
```

---

# 14. Flujo esperado de administrador

```text
Login Google
↓
Panel
↓
Ver incidencias
↓
Abrir incidencia
↓
Revisar prioridad
↓
Cambiar estado
↓
Añadir observación
↓
Guardar actualización
```

---

# 15. Qué NO hacer ahora

No implementar todavía:

- modelo `equipos`;
- inventario;
- QR;
- fotografías;
- adjuntos;
- gestión visual de roles;
- múltiples técnicos;
- asignación de incidencias;
- comentarios del usuario;
- otras áreas distintas a TIC;
- realtime;
- Storage.

Mantener el MVP pequeño.

Las notificaciones y la Edge Function ya están implementadas; no deben tratarse como trabajo pendiente.

---

# 16. Plan de migración ejecutado (referencia histórica)

## Migración frontend a Vue

Los pasos de esta sección ya se han realizado en la raíz del repositorio. Se conservan para explicar el alcance de la migración y facilitar su verificación.

Objetivo:

Rehacer el frontend actual sin alterar la funcionalidad ya validada.

Orden recomendado:

### Paso 1

Crear:

```text
Vue 3 + Vite
```

### Paso 2

Configurar Tailwind compilado.

### Paso 3

Configurar Supabase JS.

### Paso 4

Crear autenticación mediante composable `useAuth`.

### Paso 5

Crear `AppHeader`.

### Paso 6

Crear vista de usuario:

```text
UserHome.vue
IncidentForm.vue
IncidentList.vue
IncidentDetailModal.vue
```

### Paso 7

Crear administración:

```text
AdminDashboard.vue
AdminIncidents.vue
AdminRooms.vue
```

### Paso 8

Validar nuevamente RLS desde la aplicación Vue.

### Paso 9

Pulir diseño visual contra la web del centro.

### Paso 10

Desplegar en GitHub Pages.

---

# 17. Estado funcional del prototipo previo

El prototipo Vanilla JS demostró que funcionan correctamente:

```text
Login
Logout
Alta automática de usuario
Lectura de estancias
Creación de incidencia
Listado de incidencias propias
Listado global para administrador
Cambio de prioridad
Cambio de estado
Actualizaciones
Alta de estancias
Filtros básicos
RLS
```

La nueva versión Vue debe conservar exactamente este comportamiento antes de añadir nuevas funcionalidades.

---

# 18. Criterio de éxito de la siguiente iteración

La migración se considera completada cuando:

```text
1. Usuario normal entra.
2. Ve directamente Nueva incidencia.
3. Puede crear una incidencia.
4. Puede verla en Mis incidencias.
5. Puede abrir su detalle.
6. No puede acceder a funciones administrativas.
7. Administrador entra.
8. Ve panel administrativo.
9. Puede gestionar incidencias.
10. Puede gestionar estancias.
11. RLS sigue protegiendo los datos.
12. No existe HTML incrustado masivamente en JavaScript.
13. La UI está dividida en componentes Vue mantenibles.
```

---

# 19. Decisiones ya cerradas

No reabrir salvo petición expresa:

```text
Backend: Supabase
DB: PostgreSQL
Auth: Google
Dominio: iesisladeleon.es
Frontend: Vue 3
Build: Vite
CSS: Tailwind compilado
Fuente: Source Sans
Hosting previsto: GitHub Pages
Roles: USUARIO / ADMINISTRADOR
Área: solo TIC
Sin equipos como entidad por ahora
Sin adjuntos
Sin técnicos múltiples
Sin comentarios del usuario
Avisos por correo con Resend
Remitente: TDE <tde@iesisladeleon.es>
```

---

# 20. Prioridad inmediata actual

Orden actual:

1. Mantener el workflow de GitHub Pages verde: lint, 11 pruebas y build deben pasar antes de cada despliegue.
2. Validar desde un equipo externo el acceso con una cuenta `USUARIO` y otra `ADMINISTRADOR`.
3. Comprobar creación, seguimiento, filtros, navegación y comportamiento móvil en producción.
4. Verificar los avisos de correo de una incidencia nueva y de una actualización real.
5. Revisar periódicamente si existen filas `FALLIDO` en `avisos_email`.
6. Corregir cualquier incidencia encontrada en esos flujos.

---

# 21. Migración Vue realizada (12/10/2026)

La aplicación Vue se encuentra ahora en la raíz del repositorio:

```text
src/
supabase/
package.json
```

Incluye:

- Vue 3 y Vite;
- Tailwind CSS compilado;
- Vue Router con rutas hash para GitHub Pages;
- Source Sans 3 servida desde el propio build;
- autenticación Google y control de dominio;
- tratamiento sencillo de usuarios desactivados;
- vista directa de usuario con alta, listado y detalle de incidencias;
- selector inicial entre gestión de cuentas e incidencias sobre equipamiento;
- selector de estancia buscable con nombre destacado y apertura al pulsar en cualquier parte;
- panel, incidencias y estancias para administradores;
- filtros administrativos compactos de búsqueda, tipo, estado, prioridad y estancia;
- creación, edición y activación/desactivación de estancias;
- recuento y filtrado de estancias según sus incidencias no resueltas;
- navegación desde una estancia al listado de sus incidencias;
- borrado administrativo de incidencias con confirmación;
- pruebas unitarias, lint y build de producción;
- Supabase CLI instalada como dependencia de desarrollo y proyecto remoto vinculado;
- avisos por correo mediante Resend desde `TDE <tde@iesisladeleon.es>`;
- Edge Function protegida por secreto, cola por destinatario, idempotencia y hasta cinco intentos;
- Git publicado en `IES-Isla-de-Leon/incidencias-tic`, con rama principal `main`.

Los prototipos Vanilla y los bancos de pruebas se conservan como referencia y no deben seguir evolucionándose.

## Decisiones posteriores al handoff original

- `docs/arquitectura.md` prevalece sobre `docs/historico/plan-inicial.md` si existe alguna contradicción.
- Se utiliza el proyecto Supabase actual.
- Se permiten todas las transiciones de estado, incluida la reapertura.
- Todo cambio de estado debe generar una fila de `actualizaciones`.
- Los cambios de prioridad no requieren historial.
- Las estancias no se borran desde la aplicación; se desactivan.
- Las incidencias pueden ser eliminadas únicamente por administradores; su seguimiento se elimina en cascada.
- La URL definitiva es `https://ies-isla-de-leon.github.io/incidencias-tic/`.
- Los despliegues se realizan mediante el workflow `.github/workflows/deploy-pages.yml` tras superar lint, pruebas y build.
- La creación de incidencias comienza con dos opciones: `Gestión de cuentas de usuario` e `Incidencias sobre equipamiento`.
- Las incidencias de cuentas solicitan descripción y urgencia, sin estancia; las de equipamiento conservan el formulario previo.
- `incidencias.tipo` usa `CUENTAS_USUARIO` o `EQUIPAMIENTO`; las incidencias anteriores se clasifican como `EQUIPAMIENTO`.
- Una incidencia nueva avisa a todos los administradores activos.
- Una observación o un cambio de estado avisa al usuario creador; si contiene ambos, se envía un solo correo.
- Los cambios exclusivos de prioridad y la confirmación de creación no generan correo.
- Los avisos usan Resend y el remitente real `TDE <tde@iesisladeleon.es>`.

## Servidor local y OAuth

Usar siempre:

```text
http://localhost:4173/
```

Tanto `vite dev` como `vite preview` están fijados al puerto `4173` con `strictPort: true`. Si el puerto está ocupado, hay que liberar ese puerto; no debe elegirse otro. La URL anterior debe permanecer registrada en las Redirect URLs de Supabase Auth.

No usar alternativamente `http://127.0.0.1:4173/`, ya que constituye un origen OAuth diferente.

## Estado de Supabase

Las siguientes migraciones están aplicadas y verificadas en el proyecto remoto `nynfesrryincxqpqfmmf`:

```text
supabase/migrations/202610110001_esquema_inicial.sql
supabase/migrations/202610110002_politicas_rls_iniciales.sql
supabase/migrations/202610120001_reforzar_historial_y_baja_estancias.sql
supabase/migrations/202610120002_permitir_borrado_incidencias.sql
supabase/migrations/202610120003_clasificar_incidencias.sql
supabase/migrations/202610130001_avisos_email.sql
supabase/migrations/202610140001_endurecer_funciones_privilegiadas.sql
```

Las dos migraciones de 11/10 documentan el esquema y las políticas que originalmente se aplicaron manualmente; en remoto están registradas como aplicadas sin volver a ejecutar su contenido. La migración de 14/10 fija un `search_path` vacío para las funciones `SECURITY DEFINER` y reduce sus permisos de ejecución al mínimo necesario. La CLI de Supabase está instalada como dependencia de desarrollo. `npx supabase migration list` y `npx supabase db push --dry-run` confirman que la base remota está al día. Los archivos locales de vinculación de `supabase/.temp/` están excluidos de Git.

La Edge Function desplegada es `notificar-incidencia` y debe mantenerse con verificación JWT desactivada porque valida el encabezado `x-webhook-secret`. La cola intenta invocarla inmediatamente y el trabajo `procesar-avisos-email` vuelve a invocarla cada minuto. La última comprobación se realizó con la cola vacía y devolvió cero procesados, enviados y fallidos.

## Secretos y configuración local

`.env.local` está excluido del control de versiones y solo contiene la configuración pública necesaria para el frontend. No deben crearse archivos de credenciales dentro del proyecto.

`supabase/config.toml` conserva la configuración reproducible no secreta. La producción usa la URL de GitHub Pages como `site_url`; las únicas redirecciones permitidas son la producción y `http://localhost:4173/`.

`RESEND_API_KEY` e `INCIDENT_EMAIL_WEBHOOK_SECRET` viven en Edge Function Secrets. `incident_email_webhook_secret` y `project_url` viven en Vault. El secreto del webhook debe coincidir en ambos almacenes. La clave de Resend no debe conservarse en archivos locales.
