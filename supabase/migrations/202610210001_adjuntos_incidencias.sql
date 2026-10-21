-- Adjuntos privados para incidencias de equipamiento.
-- La incidencia se crea como borrador y solo se publica cuando todos sus
-- adjuntos han terminado de subirse y registrar sus metadatos.

alter table public.incidencias
  add column publicada_en timestamptz null,
  add column borrador_actualizado_en timestamptz not null default now(),
  add column borrador_reclamado_en timestamptz null;

-- Todo lo creado antes de esta migración ya estaba publicado.
update public.incidencias
set publicada_en = fecha_creacion,
    borrador_actualizado_en = fecha_creacion;

create index idx_incidencias_publicada_en
  on public.incidencias (publicada_en desc)
  where publicada_en is not null;

create index idx_incidencias_borradores
  on public.incidencias (borrador_actualizado_en)
  where publicada_en is null;

comment on column public.incidencias.publicada_en is
  'Momento en que el borrador se hace visible y genera el aviso de nueva incidencia.';

create table public.adjuntos_incidencia (
  id uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references public.incidencias(id) on delete cascade,
  ruta_storage text not null unique,
  nombre_original text not null,
  tipo_mime text not null,
  tamano_bytes bigint not null,
  subido_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),

  constraint adjuntos_nombre_no_vacio
    check (length(trim(nombre_original)) between 1 and 255),
  constraint adjuntos_tipo_permitido
    check (tipo_mime in ('image/jpeg', 'image/png', 'application/pdf')),
  constraint adjuntos_tamano_permitido
    check (tamano_bytes between 1 and 5242880)
);

create index idx_adjuntos_incidencia_id
  on public.adjuntos_incidencia (incidencia_id);

comment on table public.adjuntos_incidencia is
  'Metadatos de los archivos privados asociados a incidencias de equipamiento.';

-- Serializa las altas de una misma incidencia, exige que siga siendo un
-- borrador de equipamiento y aplica el máximo de tres archivos también en BD.
create or replace function public.validar_adjunto_incidencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_incidencia public.incidencias%rowtype;
begin
  select * into v_incidencia
  from public.incidencias
  where id = new.incidencia_id
  for update;

  if not found then
    raise exception 'La incidencia no existe.';
  end if;

  if v_incidencia.tipo <> 'EQUIPAMIENTO' then
    raise exception 'Las incidencias de cuentas no admiten adjuntos.';
  end if;

  if v_incidencia.publicada_en is not null then
    raise exception 'No se pueden añadir archivos después de publicar la incidencia.';
  end if;

  if new.subido_por <> v_incidencia.creada_por then
    raise exception 'El archivo debe pertenecer a quien creó la incidencia.';
  end if;

  if (select count(*) from public.adjuntos_incidencia a
      where a.incidencia_id = new.incidencia_id) >= 3 then
    raise exception 'Una incidencia admite un máximo de tres archivos.';
  end if;

  update public.incidencias
  set borrador_actualizado_en = now()
  where id = new.incidencia_id;

  return new;
end;
$$;

create trigger trg_validar_adjunto_incidencia
before insert on public.adjuntos_incidencia
for each row execute function public.validar_adjunto_incidencia();

revoke all on function public.validar_adjunto_incidencia()
  from public, anon, authenticated;

-- El borrador solo puede publicarlo su creador. Además, se comprueba que cada
-- metadato apunte a un objeto que realmente exista en el bucket privado.
create or replace function public.finalizar_incidencia_borrador(p_incidencia_id uuid)
returns table (id uuid, codigo text, publicada_en timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_incidencia public.incidencias%rowtype;
begin
  select * into v_incidencia
  from public.incidencias
  where incidencias.id = p_incidencia_id
  for update;

  if not found
     or v_incidencia.creada_por <> auth.uid()
     or not public.puede_acceder() then
    raise exception 'No se puede publicar este borrador.';
  end if;

  if v_incidencia.borrador_reclamado_en is not null then
    raise exception 'El borrador ha caducado. Vuelve a comunicar la incidencia.';
  end if;

  if v_incidencia.publicada_en is null and exists (
    select 1
    from public.adjuntos_incidencia a
    left join storage.objects o
      on o.bucket_id = 'incidencias-adjuntos'
     and o.name = a.ruta_storage
    where a.incidencia_id = p_incidencia_id
      and o.id is null
  ) then
    raise exception 'Hay archivos que todavía no se han almacenado correctamente.';
  end if;

  update public.incidencias i
  set publicada_en = coalesce(i.publicada_en, now()),
      borrador_actualizado_en = now()
  where i.id = p_incidencia_id;

  return query
  select i.id, i.codigo, i.publicada_en
  from public.incidencias i
  where i.id = p_incidencia_id;
end;
$$;

revoke all on function public.finalizar_incidencia_borrador(uuid)
  from public, anon, authenticated;
grant execute on function public.finalizar_incidencia_borrador(uuid)
  to authenticated;

-- Renueva la actividad justo antes de cada intento de subida para que una
-- transferencia legítima no coincida con la limpieza programada.
create or replace function public.mantener_incidencia_borrador(p_incidencia_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_acceder() then
    raise exception 'No autorizado.';
  end if;

  update public.incidencias i
  set borrador_actualizado_en = now()
  where i.id = p_incidencia_id
    and i.creada_por = auth.uid()
    and i.publicada_en is null
    and i.borrador_reclamado_en is null;

  if not found then
    raise exception 'El borrador no existe o ha caducado.';
  end if;
end;
$$;

revoke all on function public.mantener_incidencia_borrador(uuid)
  from public, anon, authenticated;
grant execute on function public.mantener_incidencia_borrador(uuid)
  to authenticated;

-- Se invoca después de que el cliente haya retirado del bucket los objetos del
-- borrador. No se permite usarla para borrar una incidencia ya publicada.
create or replace function public.eliminar_incidencia_borrador(p_incidencia_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_acceder() then
    raise exception 'No autorizado.';
  end if;

  delete from public.incidencias i
  where i.id = p_incidencia_id
    and i.creada_por = auth.uid()
    and i.publicada_en is null;

  if not found then
    raise exception 'El borrador no existe o ya está publicado.';
  end if;
end;
$$;

revoke all on function public.eliminar_incidencia_borrador(uuid)
  from public, anon, authenticated;
grant execute on function public.eliminar_incidencia_borrador(uuid)
  to authenticated;

-- El aviso se genera al publicar, nunca al insertar el borrador.
drop trigger if exists trg_encolar_avisos_incidencia_nueva on public.incidencias;

create trigger trg_encolar_avisos_incidencia_nueva
after update of publicada_en on public.incidencias
for each row
when (old.publicada_en is null and new.publicada_en is not null)
execute function public.encolar_avisos_incidencia_nueva();

-- Bucket privado con límites aplicados por Storage antes de aceptar el objeto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incidencias-adjuntos',
  'incidencias-adjuntos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.adjuntos_incidencia enable row level security;

create policy "usuarios_leer_adjuntos_visibles"
on public.adjuntos_incidencia
for select to authenticated
using (
  public.puede_acceder()
  and exists (
    select 1 from public.incidencias i
    where i.id = adjuntos_incidencia.incidencia_id
      and (i.creada_por = auth.uid() or public.es_administrador())
  )
);

create policy "usuarios_crear_adjuntos_en_borrador"
on public.adjuntos_incidencia
for insert to authenticated
with check (
  public.puede_acceder()
  and subido_por = auth.uid()
  and exists (
    select 1 from public.incidencias i
    where i.id = adjuntos_incidencia.incidencia_id
      and i.creada_por = auth.uid()
      and i.tipo = 'EQUIPAMIENTO'
      and i.publicada_en is null
  )
);

create policy "usuarios_eliminar_adjuntos_borrador_o_admin"
on public.adjuntos_incidencia
for delete to authenticated
using (
  public.puede_acceder()
  and exists (
    select 1 from public.incidencias i
    where i.id = adjuntos_incidencia.incidencia_id
      and (
        public.es_administrador()
        or (i.creada_por = auth.uid() and i.publicada_en is null)
      )
  )
);

grant select, insert, delete on public.adjuntos_incidencia to authenticated;
revoke update on public.adjuntos_incidencia from authenticated;

create policy "usuarios_subir_objetos_a_borrador"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'incidencias-adjuntos'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.incidencias i
    where i.id::text = (storage.foldername(name))[2]
      and i.creada_por = auth.uid()
      and i.tipo = 'EQUIPAMIENTO'
      and i.publicada_en is null
      and public.puede_acceder()
  )
);

create policy "usuarios_leer_objetos_visibles"
on storage.objects
for select to authenticated
using (
  bucket_id = 'incidencias-adjuntos'
  and array_length(storage.foldername(name), 1) = 2
  and public.puede_acceder()
  and exists (
    select 1 from public.incidencias i
    where i.id::text = (storage.foldername(name))[2]
      and (
        (i.creada_por = auth.uid() and i.publicada_en is null)
        or exists (
          select 1 from public.adjuntos_incidencia a
          where a.incidencia_id = i.id
            and a.ruta_storage = storage.objects.name
            and (i.creada_por = auth.uid() or public.es_administrador())
        )
      )
  )
);

create policy "usuarios_eliminar_objetos_borrador_o_admin"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'incidencias-adjuntos'
  and array_length(storage.foldername(name), 1) = 2
  and public.puede_acceder()
  and exists (
    select 1 from public.incidencias i
    where i.id::text = (storage.foldername(name))[2]
      and (
        public.es_administrador()
        or (i.creada_por = auth.uid() and i.publicada_en is null)
      )
  )
);

