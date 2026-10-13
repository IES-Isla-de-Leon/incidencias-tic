-- ============================================================
-- Gestión de incidencias TIC — IES Isla de León
-- Políticas RLS y permisos del MVP
-- Se aplica después de 202610110001_esquema_inicial.sql.
-- ============================================================

-- ============================================================
-- 1. FUNCIONES AUXILIARES DE SEGURIDAD
-- ============================================================

-- Comprueba que el JWT autenticado pertenece al dominio permitido.
create or replace function public.es_dominio_permitido()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@iesisladeleon.es';
$$;

-- Comprueba que existe un perfil activo para el usuario autenticado.
create or replace function public.es_usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.activo = true
  );
$$;

-- Comprueba que el usuario autenticado es administrador.
create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.activo = true
      and u.rol = 'ADMINISTRADOR'
  );
$$;

-- Función común: usuario autenticado, del dominio y activo.
create or replace function public.puede_acceder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_dominio_permitido()
     and public.es_usuario_activo();
$$;

-- ============================================================
-- 2. ENDURECER EL ALTA AUTOMÁTICA DE USUARIOS
-- ============================================================

-- El trigger existente ya crea public.usuarios tras el primer login.
-- Lo modificamos para NO crear perfil de aplicación a cuentas externas.
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  if new.email is null
     or lower(new.email) not like '%@iesisladeleon.es' then
    return new;
  end if;

  v_nombre := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  insert into public.usuarios (id, email, nombre)
  values (new.id, lower(new.email), v_nombre)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- 3. RLS: USUARIOS
-- ============================================================

drop policy if exists "usuarios_leer_propio" on public.usuarios;
drop policy if exists "administradores_leer_usuarios" on public.usuarios;

create policy "usuarios_leer_propio"
on public.usuarios
for select
to authenticated
using (
  public.puede_acceder()
  and id = auth.uid()
);

create policy "administradores_leer_usuarios"
on public.usuarios
for select
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
);

-- No se crean políticas INSERT/UPDATE/DELETE para usuarios:
-- el perfil lo crea el trigger y no existe gestión de usuarios en el MVP.

-- ============================================================
-- 4. RLS: ESTANCIAS
-- ============================================================

drop policy if exists "usuarios_leer_estancias_activas" on public.estancias;
drop policy if exists "administradores_leer_estancias" on public.estancias;
drop policy if exists "administradores_crear_estancias" on public.estancias;
drop policy if exists "administradores_actualizar_estancias" on public.estancias;
drop policy if exists "administradores_eliminar_estancias" on public.estancias;

create policy "usuarios_leer_estancias_activas"
on public.estancias
for select
to authenticated
using (
  public.puede_acceder()
  and activo = true
);

create policy "administradores_leer_estancias"
on public.estancias
for select
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
);

create policy "administradores_crear_estancias"
on public.estancias
for insert
to authenticated
with check (
  public.es_dominio_permitido()
  and public.es_administrador()
);

create policy "administradores_actualizar_estancias"
on public.estancias
for update
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
)
with check (
  public.es_dominio_permitido()
  and public.es_administrador()
);

-- Se permite borrar estancias solo a administrador.
-- Las FK con ON DELETE RESTRICT impedirán borrar una estancia usada.
create policy "administradores_eliminar_estancias"
on public.estancias
for delete
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
);

-- ============================================================
-- 5. RLS: INCIDENCIAS
-- ============================================================

drop policy if exists "usuarios_crear_incidencias" on public.incidencias;
drop policy if exists "usuarios_leer_incidencias_propias" on public.incidencias;
drop policy if exists "administradores_leer_incidencias" on public.incidencias;
drop policy if exists "administradores_actualizar_incidencias" on public.incidencias;

-- Usuario normal: puede crear SOLO incidencias a su nombre.
create policy "usuarios_crear_incidencias"
on public.incidencias
for insert
to authenticated
with check (
  public.puede_acceder()
  and creada_por = auth.uid()
  and estado = 'ABIERTA'
  and prioridad in ('NORMAL', 'URGENTE')
);

-- Usuario normal: solo lee las suyas.
create policy "usuarios_leer_incidencias_propias"
on public.incidencias
for select
to authenticated
using (
  public.puede_acceder()
  and creada_por = auth.uid()
);

-- Administrador: puede leer todas.
create policy "administradores_leer_incidencias"
on public.incidencias
for select
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
);

-- Administrador: puede actualizar incidencias.
create policy "administradores_actualizar_incidencias"
on public.incidencias
for update
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
)
with check (
  public.es_dominio_permitido()
  and public.es_administrador()
);

-- No hay DELETE de incidencias en el MVP.

-- ============================================================
-- 6. RLS: ACTUALIZACIONES
-- ============================================================

drop policy if exists "usuarios_leer_actualizaciones_propias" on public.actualizaciones;
drop policy if exists "administradores_leer_actualizaciones" on public.actualizaciones;
drop policy if exists "administradores_crear_actualizaciones" on public.actualizaciones;

-- Usuario: solo puede leer actualizaciones de incidencias creadas por él.
create policy "usuarios_leer_actualizaciones_propias"
on public.actualizaciones
for select
to authenticated
using (
  public.puede_acceder()
  and exists (
    select 1
    from public.incidencias i
    where i.id = actualizaciones.incidencia_id
      and i.creada_por = auth.uid()
  )
);

-- Administrador: puede leer todas.
create policy "administradores_leer_actualizaciones"
on public.actualizaciones
for select
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
);

-- Administrador: puede crear actualizaciones únicamente con su propio usuario_id.
create policy "administradores_crear_actualizaciones"
on public.actualizaciones
for insert
to authenticated
with check (
  public.es_dominio_permitido()
  and public.es_administrador()
  and usuario_id = auth.uid()
);

-- No hay UPDATE ni DELETE:
-- las actualizaciones son inmutables.

-- ============================================================
-- 7. RLS: CONTADORES
-- ============================================================

-- La tabla de contadores no debe ser accesible directamente desde el frontend.
-- El trigger SECURITY DEFINER es quien la utiliza.
-- No creamos ninguna policy para authenticated.

-- ============================================================
-- 8. PERMISOS SQL ADICIONALES
-- ============================================================

-- Incidencias: el frontend autenticado puede SELECT e INSERT.
grant select, insert on public.incidencias to authenticated;

-- UPDATE queda limitado a las columnas que realmente necesita el administrador.
revoke update on public.incidencias from authenticated;
grant update (prioridad, estado) on public.incidencias to authenticated;

-- Nadie desde el frontend puede borrar incidencias.
revoke delete on public.incidencias from authenticated;

-- Actualizaciones: solo SELECT e INSERT; RLS decide quién puede insertar.
grant select, insert on public.actualizaciones to authenticated;
revoke update, delete on public.actualizaciones from authenticated;

-- Usuarios: solo lectura desde frontend.
grant select on public.usuarios to authenticated;
revoke insert, update, delete on public.usuarios from authenticated;

-- Estancias: administradores podrán gestionarlas vía RLS.
grant select, insert, update, delete on public.estancias to authenticated;

-- Contadores: sin acceso directo desde frontend.
revoke all on public.contadores_incidencias from authenticated, anon;

-- ============================================================
-- 9. ASEGURAR RLS
-- ============================================================

alter table public.usuarios enable row level security;
alter table public.estancias enable row level security;
alter table public.incidencias enable row level security;
alter table public.actualizaciones enable row level security;
alter table public.contadores_incidencias enable row level security;

-- ============================================================
-- FIN
-- ============================================================

-- Tras ejecutar este script:
--
-- 1. Un USUARIO puede:
--    - leer su perfil
--    - ver estancias activas
--    - crear incidencias propias
--    - ver sus incidencias
--    - ver sus actualizaciones
--
-- 2. Un ADMINISTRADOR puede además:
--    - ver todas las incidencias
--    - cambiar prioridad y estado
--    - crear actualizaciones
--    - gestionar estancias
--
-- 3. Ningún usuario del frontend puede:
--    - cambiar su rol
--    - modificar una actualización
--    - borrar una incidencia
--    - acceder a contadores internos
