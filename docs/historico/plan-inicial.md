# DOCUMENTO HISTÓRICO — NO USAR COMO FUENTE DE VERDAD

Este documento refleja la planificación inicial, anterior a la implementación del backend y a la migración Vue. Se conserva solo para consultar el origen del proyecto.

Varias exclusiones iniciales ya se han superado: actualmente existen dos tipos de incidencia, un selector buscable de estancias y avisos por correo mediante Resend. Consultar siempre la documentación vigente indicada a continuación.

La documentación vigente es:

- `README.md`, como entrada operativa;
- `docs/arquitectura.md`, como fuente de verdad detallada;
- `docs/modelo-datos.md`, como referencia del modelo.

---

# Proyecto: Gestión de incidencias TIC — IES Isla de León

## 1. Objetivo

Desarrollar una aplicación web interna para gestionar incidencias TIC del instituto.

La aplicación debe permitir que cualquier usuario autorizado del dominio del centro pueda comunicar una incidencia asociada a una estancia y consultar posteriormente su evolución.

La gestión de las incidencias será realizada por un equipo TIC unipersonal mediante un rol administrador.

El objetivo inicial es un MVP sencillo, mantenible y sin infraestructura propia.

---

## 2. Alcance inicial

La aplicación gestionará únicamente incidencias TIC.

Quedan fuera del MVP:

- Gestión individual de equipos.
- Inventario TIC completo.
- Fotografías o archivos adjuntos.
- Asignación de incidencias a técnicos.
- Comentarios de usuarios sobre incidencias existentes.
- Notificaciones por correo.
- Gestión avanzada de usuarios y roles.
- Gestión de otras áreas como mantenimiento, climatización o conserjería.

El modelo debe permitir añadir algunas de estas funciones posteriormente sin rediseñar el sistema completo.

---

## 3. Arquitectura prevista

### Frontend

Aplicación web estática desplegada inicialmente en GitHub Pages.

Tecnologías previstas:

- HTML
- CSS
- JavaScript o TypeScript
- Vite como herramienta de desarrollo/build

No es necesario utilizar React para el MVP.

### Backend as a Service

Supabase Free.

Servicios utilizados inicialmente:

- Supabase Auth
- PostgreSQL
- Row Level Security (RLS)

No se utilizará Supabase Storage inicialmente.

### Autenticación

Inicio de sesión exclusivamente mediante Google OAuth.

Condición de acceso:

- El usuario debe pertenecer al dominio corporativo del centro.

No habrá:

- Registro manual.
- Contraseñas propias de la aplicación.
- Perfil editable por el usuario.

Los usuarios se crearán automáticamente en la base de datos al iniciar sesión por primera vez.

---

## 4. Roles

Solo existen dos roles:

### USUARIO

Puede:

- Iniciar sesión.
- Crear incidencias.
- Consultar únicamente sus propias incidencias.
- Consultar las actualizaciones de sus incidencias.

No puede:

- Editar incidencias.
- Eliminar incidencias.
- Cambiar prioridad.
- Cambiar estado.
- Añadir actualizaciones.

### ADMINISTRADOR

Puede:

- Consultar todas las incidencias.
- Cambiar prioridad.
- Cambiar estado.
- Añadir actualizaciones.
- Consultar y gestionar estancias.

En el MVP no se desarrollará una interfaz de gestión de roles.

Inicialmente varias direcciones concretas del dominio se considerarán administradores mediante configuración/hardcode.

---

## 5. Modelo de datos resumido

El modelo completo se encuentra en:

`docs/modelo-datos.md`

Entidades principales:

### usuarios

Representa usuarios autenticados mediante Google.

Campos principales:

- id
- email
- nombre
- rol
- activo

### estancias

Representa espacios físicos del centro donde pueden producirse incidencias.

Campos principales:

- id
- nombre
- ubicacion
- equipamiento
- activo

Valores de ubicación:

- Edif. principal, pl. baja
- Edif. principal, pl. 1
- Edif. principal, pl. 2
- Módulo norte, pl. baja
- Módulo norte, pl. 1
- Módulo norte, pl. 2
- Gimnasio

### incidencias

Representa un problema TIC comunicado por un usuario.

Campos principales:

- id
- codigo
- fecha_creacion
- creada_por
- estancia_id
- descripcion
- prioridad
- estado

Prioridades:

- BAJA
- NORMAL
- ALTA
- URGENTE

La prioridad inicial será NORMAL.

Si el usuario indica que la incidencia es urgente durante su creación, se almacenará directamente como URGENTE.

El administrador podrá modificar posteriormente la prioridad.

Estados:

- ABIERTA
- EN_PROGRESO
- BLOQUEADA
- RESUELTA

BLOQUEADA significa que la resolución no puede continuar temporalmente por una dependencia externa como material, proveedor, obra o autorización.

### actualizaciones

Representa el seguimiento realizado sobre una incidencia.

Campos principales:

- id
- incidencia_id
- fecha
- usuario_id
- observacion
- estado

Una actualización puede incluir:

- Solo una observación.
- Solo un cambio de estado.
- Ambas cosas.

Si una actualización incluye un nuevo estado, se actualizará automáticamente el estado actual de la incidencia.

Las actualizaciones no pueden editarse ni eliminarse.

---

## 6. Ampliación futura prevista

Puede añadirse posteriormente una entidad independiente:

`equipos`

Relación prevista:

```text
ESTANCIAS
   |
   +-- EQUIPOS
          |
          +-- INCIDENCIAS
```

Por ahora:

- El equipamiento general se describe en `estancias.equipamiento`.
- El equipo concreto afectado se identifica dentro de `incidencias.descripcion`.

El diseño actual no debe impedir esta ampliación.

---

# 7. Fases de desarrollo

## Fase 1 — Cerrar modelo de datos

Estado: prácticamente completada.

Tareas:

- Validar entidades.
- Validar campos.
- Validar enumerados.
- Validar relaciones.
- Validar reglas de negocio.

Resultado esperado:

Modelo definitivo para el MVP.

---

## Fase 2 — Crear proyecto Supabase

Tareas:

- Crear proyecto.
- Crear tipos ENUM.
- Crear tablas.
- Crear claves primarias y foráneas.
- Añadir restricciones.
- Añadir valores por defecto.
- Crear índices necesarios.
- Cargar estancias iniciales.

Resultado esperado:

Base de datos funcional y consistente.

---

## Fase 3 — Configurar autenticación

Tareas:

- Configurar Google OAuth.
- Restringir acceso al dominio del centro.
- Crear automáticamente el registro de usuario al primer login.
- Asignar rol USUARIO por defecto.
- Reconocer administradores configurados previamente.

Resultado esperado:

Login transparente con cuentas Google del centro.

---

## Fase 4 — Configurar seguridad

Implementar Row Level Security.

Reglas mínimas:

### USUARIO

- Puede leer su propio usuario.
- Puede leer estancias activas.
- Puede crear incidencias.
- Puede leer solo incidencias creadas por él.
- Puede leer actualizaciones pertenecientes a sus incidencias.
- No puede modificar ni eliminar incidencias.

### ADMINISTRADOR

- Puede consultar todas las incidencias.
- Puede modificar prioridad y estado.
- Puede crear actualizaciones.
- Puede gestionar estancias.

Resultado esperado:

La seguridad debe depender de PostgreSQL/RLS, no de controles del frontend.

---

## Fase 5 — Construir frontend base

Tareas:

- Crear proyecto frontend.
- Configurar Vite.
- Integrar Supabase JS.
- Crear estructura general.
- Aplicar identidad visual inspirada en iesisladeleon.es.
- Crear navegación.
- Añadir diseño responsive básico.

Resultado esperado:

Shell visual navegable de la aplicación.

---

## Fase 6 — Vista de usuario

Implementar:

- Login.
- Formulario de nueva incidencia.
- Selector de estancia.
- Campo descripción.
- Checkbox/pregunta para indicar urgencia.
- Listado de incidencias propias.
- Vista detalle.
- Historial de actualizaciones.

Resultado esperado:

Un usuario normal puede comunicar y seguir una incidencia sin intervención manual externa.

---

## Fase 7 — Vista de administrador

Implementar:

- Panel con todas las incidencias.
- Filtros por estado.
- Filtros por prioridad.
- Filtros por estancia.
- Vista detalle.
- Cambio de prioridad.
- Cambio de estado.
- Creación de actualizaciones.
- Gestión básica de estancias.

Resultado esperado:

MVP completamente utilizable por el equipo TIC.

Este punto marca el final del MVP funcional.

---

## Fase 8 — Dashboard y estadísticas

Añadir indicadores como:

- Incidencias abiertas.
- Incidencias en progreso.
- Incidencias bloqueadas.
- Incidencias resueltas.
- Incidencias urgentes.
- Incidencias por estancia.
- Evolución temporal.

Resultado esperado:

Visión rápida del estado general del servicio TIC.

---

## Fase 9 — Pruebas

Validar:

- Login con usuario del dominio.
- Rechazo de cuentas externas.
- Permisos USUARIO.
- Permisos ADMINISTRADOR.
- Creación de incidencias.
- Cambio de estados.
- Cambio de prioridades.
- Actualizaciones.
- Integridad referencial.
- Navegación responsive.
- Errores de formularios.

Resultado esperado:

Aplicación apta para uso interno.

---

## Fase 10 — Despliegue

Tareas:

- Publicar frontend en GitHub Pages.
- Configurar variables públicas de Supabase.
- Configurar URLs OAuth permitidas.
- Opcionalmente configurar subdominio:
  `incidencias.iesisladeleon.es`
- Crear administradores definitivos.

Resultado esperado:

Aplicación accesible para los usuarios del centro.

---

## Fase 11 — Evolución posterior

Posibles mejoras:

- Modelo independiente de equipos.
- Inventario TIC.
- QR por estancia.
- QR por equipo.
- Notificaciones por correo.
- Adjuntos y fotografías.
- Exportación de estadísticas.
- Gestión visual de usuarios y roles.
- Ampliación a otras áreas del centro.

---

# 8. Principios de desarrollo

- Mantener el MVP pequeño.
- No añadir complejidad sin necesidad real.
- Seguridad en backend mediante RLS.
- Evitar duplicación de datos innecesaria.
- No permitir edición ni borrado de actualizaciones.
- Mantener abierta la futura incorporación del modelo `equipos`.
- Priorizar claridad y mantenibilidad sobre arquitecturas sofisticadas.
- Diseñar la aplicación para funcionar dentro del plan gratuito de Supabase.
- No almacenar información sensible innecesaria.

---

# 9. Estado actual

Decisiones ya cerradas:

- Supabase como backend.
- GitHub Pages como hosting inicial.
- Google OAuth.
- Acceso restringido al dominio del centro.
- Dos roles: USUARIO y ADMINISTRADOR.
- Cuatro entidades principales.
- Sin fotografías.
- Sin modelo de equipos inicialmente.
- Sin asignación de técnicos.
- Equipo TIC unipersonal.
- Sin comentarios del usuario tras crear una incidencia.
- Cuatro estados.
- Cuatro prioridades.
- Actualizaciones inmutables.

Siguiente paso recomendado:

**Fase 2 — Definir e implementar el esquema PostgreSQL/Supabase.**
