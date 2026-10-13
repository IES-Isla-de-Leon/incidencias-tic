# Modelo de datos — Gestión de incidencias TIC

## 1. Usuarios

Usuarios autenticados mediante Google con una cuenta del dominio del centro. Se crean automáticamente al iniciar sesión y no disponen de perfil editable.

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador interno. |
| `email` | TEXT UNIQUE | Correo corporativo del usuario. |
| `nombre` | TEXT | Nombre obtenido automáticamente de Google. |
| `rol` | ENUM | `USUARIO` o `ADMINISTRADOR`. |
| `activo` | BOOLEAN | Permite deshabilitar el acceso sin eliminar al usuario. |

### Relaciones

- Un usuario puede crear muchas incidencias.
- Solo los administradores pueden registrar actualizaciones.

---

## 2. Estancias

Representa los espacios físicos del centro donde pueden producirse incidencias TIC. Incluye una descripción libre del equipamiento existente y sus particularidades.

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador interno. |
| `nombre` | TEXT UNIQUE | Nombre de la estancia. |
| `ubicacion` | ENUM | Zona física del centro donde se encuentra. |
| `equipamiento` | TEXT | Descripción libre del equipamiento TIC y observaciones de la estancia. |
| `activo` | BOOLEAN | Indica si la estancia puede seleccionarse actualmente. |

### Valores de `ubicacion`

- `Edif. principal, pl. baja`
- `Edif. principal, pl. 1`
- `Edif. principal, pl. 2`
- `Módulo norte, pl. baja`
- `Módulo norte, pl. 1`
- `Módulo norte, pl. 2`
- `Gimnasio`

### Relaciones

- Una estancia puede tener muchas incidencias.
- Una incidencia de equipamiento pertenece a una estancia.

> En una ampliación futura, `equipamiento` podrá sustituirse o complementarse con un modelo independiente `equipos`.

---

## 3. Incidencias

Registra un problema TIC comunicado por un usuario. Puede referirse a la gestión de una cuenta de usuario o al equipamiento de una estancia. El usuario solo puede crearla y consultar posteriormente su evolución.

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador interno. |
| `codigo` | TEXT UNIQUE | Código generado automáticamente, por ejemplo `INC-2026-0042`. |
| `fecha_creacion` | TIMESTAMP | Fecha y hora de creación. |
| `creada_por` | UUID | Usuario que comunica la incidencia. |
| `tipo` | TEXT | `CUENTAS_USUARIO` o `EQUIPAMIENTO`. |
| `estancia_id` | UUID NULL | Estancia afectada; obligatoria solo para incidencias de equipamiento. |
| `descripcion` | TEXT | Explicación inicial del problema. |
| `prioridad` | ENUM | Prioridad actual de la incidencia. |
| `estado` | ENUM | Situación actual de la incidencia. |

### Prioridades

- `BAJA`
- `NORMAL`
- `ALTA`
- `URGENTE`

La prioridad inicial es `NORMAL`, salvo que el usuario marque la incidencia como urgente, en cuyo caso comienza como `URGENTE`. El administrador puede modificarla posteriormente.

### Tipos

- `CUENTAS_USUARIO`: incidencia imprevista relacionada con una cuenta; no se asocia a una estancia.
- `EQUIPAMIENTO`: incidencia sobre equipos o recursos TIC; debe asociarse a una estancia.

### Estados

- `ABIERTA`
- `EN_PROGRESO`
- `BLOQUEADA`
- `RESUELTA`

`BLOQUEADA` indica que la resolución no puede continuar temporalmente por una dependencia externa, como material pendiente, proveedor, obra o autorización.

### Relaciones

- Pertenece a un usuario.
- Pertenece a una estancia cuando es de tipo `EQUIPAMIENTO`.
- Puede tener muchas actualizaciones.

---

## 4. Actualizaciones

Registra el seguimiento realizado por el administrador sobre una incidencia. Permite documentar actuaciones y, opcionalmente, modificar su estado.

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador interno. |
| `incidencia_id` | UUID | Incidencia a la que pertenece. |
| `fecha` | TIMESTAMP | Fecha y hora de la actualización. |
| `usuario_id` | UUID | Administrador que registra la actualización. |
| `observacion` | TEXT NULL | Actuación, diagnóstico o información relevante. Puede quedar vacía. |
| `estado` | ENUM NULL | Nuevo estado de la incidencia, si cambia. |

### Reglas

- Solo los administradores pueden crear actualizaciones.
- Las actualizaciones no pueden editarse ni eliminarse.
- Una actualización puede contener solo una observación, solo un cambio de estado o ambos.
- Si incluye un nuevo estado, `incidencias.estado` se actualiza automáticamente.

### Relaciones

- Una incidencia puede tener muchas actualizaciones.
- Cada actualización pertenece a una incidencia.
- Cada actualización es registrada por un administrador.

---

## 5. Avisos por correo

`avisos_email` es una cola interna y no una entidad editable desde la aplicación. Se crea una fila independiente por destinatario para controlar reintentos y evitar que el fallo de un correo repita los envíos correctos.

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador y base de la clave de idempotencia de Resend. |
| `tipo_evento` | TEXT | `NUEVA_INCIDENCIA` o `ACTUALIZACION`. |
| `incidencia_id` | UUID | Incidencia relacionada. |
| `actualizacion_id` | UUID NULL | Actualización relacionada; solo existe para `ACTUALIZACION`. |
| `destinatario_email` | TEXT | Dirección capturada al encolar el aviso. |
| `destinatario_nombre` | TEXT | Nombre utilizado en el saludo. |
| `estado` | TEXT | `PENDIENTE`, `PROCESANDO`, `ENVIADO` o `FALLIDO`. |
| `intentos` | INTEGER | Número de intentos realizados, con un máximo automático de cinco. |
| `proximo_intento` | TIMESTAMP NULL | Momento a partir del cual puede reintentarse. |
| `ultimo_error` | TEXT NULL | Último error devuelto por el procesador. |
| `creado_en` | TIMESTAMP | Fecha de entrada en la cola. |
| `bloqueado_en` | TIMESTAMP NULL | Inicio del intento en curso. |
| `enviado_en` | TIMESTAMP NULL | Fecha de envío correcto. |

### Reglas

- Una nueva incidencia crea un aviso para cada administrador activo.
- Una nueva actualización crea un aviso para el usuario activo que comunicó la incidencia.
- Una actualización con estado y observación genera un solo correo.
- Los cambios exclusivos de prioridad no generan avisos.
- El usuario no recibe un correo de confirmación al crear la incidencia.
- Las combinaciones incidencia/actualización y destinatario son únicas.
- Los usuarios autenticados no pueden consultar ni modificar la cola.
- La Edge Function reclama lotes de hasta diez avisos y Resend recibe una clave de idempotencia por fila.
- Los fallos se reintentan con espera creciente; una tarea programada despierta el procesador cada minuto.

---

# Relaciones generales

```text
USUARIOS
   │
   │ 1:N
   ▼
INCIDENCIAS ───── N:1 ───── ESTANCIAS
   │
   │ 1:N
   ▼
ACTUALIZACIONES
   │
   └──── N:1 ───── USUARIOS

INCIDENCIAS ───── 1:N ───── AVISOS_EMAIL
ACTUALIZACIONES ─ 1:N ───── AVISOS_EMAIL
```

# Ampliación futura

El modelo permite incorporar posteriormente una entidad `EQUIPOS` sin rediseñar el resto del sistema:

```text
ESTANCIAS
   │
   └── EQUIPOS
          │
          └── INCIDENCIAS
```

Hasta entonces, el equipamiento se describe en `estancias.equipamiento` y el equipo concreto afectado se identifica dentro de `incidencias.descripcion`.
