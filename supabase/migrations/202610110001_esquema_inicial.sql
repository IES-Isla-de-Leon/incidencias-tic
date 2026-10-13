-- ============================================================
-- Gestión de incidencias TIC — IES Isla de León
-- Esquema inicial para Supabase / PostgreSQL
-- ============================================================

-- Requiere pgcrypto para gen_random_uuid().
create extension if not exists pgcrypto;

-- ============================================================
-- 1. TIPOS ENUM
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol_usuario') then
    create type public.rol_usuario as enum (
      'USUARIO',
      'ADMINISTRADOR'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'ubicacion_estancia') then
    create type public.ubicacion_estancia as enum (
      'Edif. principal, pl. baja',
      'Edif. principal, pl. 1',
      'Edif. principal, pl. 2',
      'Módulo norte, pl. baja',
      'Módulo norte, pl. 1',
      'Módulo norte, pl. 2',
      'Gimnasio'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'prioridad_incidencia') then
    create type public.prioridad_incidencia as enum (
      'BAJA',
      'NORMAL',
      'ALTA',
      'URGENTE'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_incidencia') then
    create type public.estado_incidencia as enum (
      'ABIERTA',
      'EN_PROGRESO',
      'BLOQUEADA',
      'RESUELTA'
    );
  end if;
end $$;

-- ============================================================
-- 2. TABLA USUARIOS
-- ============================================================

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre text not null,
  rol public.rol_usuario not null default 'USUARIO',
  activo boolean not null default true
);

comment on table public.usuarios is
'Perfil de aplicación asociado a un usuario autenticado mediante Supabase Auth / Google.';

-- ============================================================
-- 3. TABLA ESTANCIAS
-- ============================================================

create table if not exists public.estancias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  ubicacion public.ubicacion_estancia not null,
  equipamiento text not null default '',
  activo boolean not null default true
);

comment on table public.estancias is
'Espacios físicos del centro donde pueden producirse incidencias TIC.';

-- ============================================================
-- 4. CONTADOR ANUAL DE INCIDENCIAS
-- ============================================================

create table if not exists public.contadores_incidencias (
  anio integer primary key,
  ultimo_numero integer not null default 0
);

comment on table public.contadores_incidencias is
'Contador interno para generar códigos INC-AAAA-NNNN reiniciados cada año.';

-- ============================================================
-- 5. TABLA INCIDENCIAS
-- ============================================================

create table if not exists public.incidencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  fecha_creacion timestamptz not null default now(),
  creada_por uuid not null references public.usuarios(id) on delete restrict,
  estancia_id uuid not null references public.estancias(id) on delete restrict,
  descripcion text not null,
  prioridad public.prioridad_incidencia not null default 'NORMAL',
  estado public.estado_incidencia not null default 'ABIERTA',

  constraint incidencias_descripcion_no_vacia
    check (length(trim(descripcion)) > 0)
);

comment on table public.incidencias is
'Incidencias TIC comunicadas por los usuarios del centro.';

-- ============================================================
-- 6. TABLA ACTUALIZACIONES
-- ============================================================

create table if not exists public.actualizaciones (
  id uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references public.incidencias(id) on delete cascade,
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  observacion text null,
  estado public.estado_incidencia null,

  constraint actualizacion_con_contenido
    check (
      (observacion is not null and length(trim(observacion)) > 0)
      or estado is not null
    )
);

comment on table public.actualizaciones is
'Seguimiento inmutable de una incidencia: observaciones y/o cambios de estado.';

-- ============================================================
-- 7. ÍNDICES
-- ============================================================

create index if not exists idx_incidencias_creada_por
  on public.incidencias (creada_por);

create index if not exists idx_incidencias_estancia_id
  on public.incidencias (estancia_id);

create index if not exists idx_incidencias_estado
  on public.incidencias (estado);

create index if not exists idx_incidencias_prioridad
  on public.incidencias (prioridad);

create index if not exists idx_incidencias_fecha_creacion
  on public.incidencias (fecha_creacion desc);

create index if not exists idx_actualizaciones_incidencia_id
  on public.actualizaciones (incidencia_id);

create index if not exists idx_actualizaciones_fecha
  on public.actualizaciones (fecha desc);

-- ============================================================
-- 8. GENERACIÓN AUTOMÁTICA DE CÓDIGO INC-AAAA-NNNN
-- ============================================================

create or replace function public.generar_codigo_incidencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anio integer;
  v_numero integer;
begin
  -- Permite insertar manualmente un código si fuera necesario.
  if new.codigo is not null and length(trim(new.codigo)) > 0 then
    return new;
  end if;

  v_anio := extract(year from coalesce(new.fecha_creacion, now()))::integer;

  insert into public.contadores_incidencias (anio, ultimo_numero)
  values (v_anio, 1)
  on conflict (anio)
  do update
    set ultimo_numero = public.contadores_incidencias.ultimo_numero + 1
  returning ultimo_numero into v_numero;

  new.codigo :=
    'INC-' || v_anio::text || '-' || lpad(v_numero::text, 4, '0');

  return new;
end;
$$;

drop trigger if exists trg_generar_codigo_incidencia on public.incidencias;

create trigger trg_generar_codigo_incidencia
before insert on public.incidencias
for each row
execute function public.generar_codigo_incidencia();

-- ============================================================
-- 9. ACTUALIZAR ESTADO DE INCIDENCIA DESDE ACTUALIZACIONES
-- ============================================================

create or replace function public.sincronizar_estado_incidencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is not null then
    update public.incidencias
       set estado = new.estado
     where id = new.incidencia_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sincronizar_estado_incidencia
  on public.actualizaciones;

create trigger trg_sincronizar_estado_incidencia
after insert on public.actualizaciones
for each row
execute function public.sincronizar_estado_incidencia();

-- ============================================================
-- 10. ALTA AUTOMÁTICA DE PERFIL AL CREARSE UN USUARIO DE AUTH
-- ============================================================

create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  v_nombre := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  insert into public.usuarios (id, email, nombre)
  values (new.id, new.email, v_nombre)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.crear_perfil_usuario();

-- ============================================================
-- 11. RLS
-- ============================================================
-- Si activaste "Enable automatic RLS", las tablas nuevas deberían
-- tener RLS habilitado automáticamente. Lo forzamos igualmente para
-- que el script sea autocontenido.

alter table public.usuarios enable row level security;
alter table public.estancias enable row level security;
alter table public.contadores_incidencias enable row level security;
alter table public.incidencias enable row level security;
alter table public.actualizaciones enable row level security;

-- IMPORTANTE:
-- Las políticas RLS se crearán en la siguiente fase, cuando configuremos
-- autenticación, dominio permitido y administradores.
