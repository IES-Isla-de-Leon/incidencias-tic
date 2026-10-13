-- Cola fiable de avisos por correo para incidencias nuevas y actualizaciones.
-- Requiere estos secretos en Vault antes de activarla:
--   project_url: URL del proyecto Supabase
--   incident_email_webhook_secret: secreto compartido con la Edge Function

create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table public.avisos_email (
  id uuid primary key default gen_random_uuid(),
  tipo_evento text not null
    check (tipo_evento in ('NUEVA_INCIDENCIA', 'ACTUALIZACION')),
  incidencia_id uuid not null references public.incidencias(id) on delete cascade,
  actualizacion_id uuid null references public.actualizaciones(id) on delete cascade,
  destinatario_email text not null,
  destinatario_nombre text not null,
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'PROCESANDO', 'ENVIADO', 'FALLIDO')),
  intentos integer not null default 0 check (intentos >= 0),
  proximo_intento timestamptz null default now(),
  ultimo_error text null,
  creado_en timestamptz not null default now(),
  bloqueado_en timestamptz null,
  enviado_en timestamptz null,
  constraint avisos_email_actualizacion_coherente check (
    (tipo_evento = 'NUEVA_INCIDENCIA' and actualizacion_id is null)
    or (tipo_evento = 'ACTUALIZACION' and actualizacion_id is not null)
  )
);

comment on table public.avisos_email is
'Cola interna de correos transaccionales generados por las incidencias TIC.';

create unique index avisos_email_nueva_incidencia_destinatario_uidx
  on public.avisos_email (incidencia_id, lower(destinatario_email))
  where tipo_evento = 'NUEVA_INCIDENCIA';

create unique index avisos_email_actualizacion_destinatario_uidx
  on public.avisos_email (actualizacion_id, lower(destinatario_email))
  where tipo_evento = 'ACTUALIZACION';

create index avisos_email_pendientes_idx
  on public.avisos_email (proximo_intento, creado_en)
  where estado in ('PENDIENTE', 'FALLIDO', 'PROCESANDO');

alter table public.avisos_email enable row level security;
revoke all on public.avisos_email from anon, authenticated;
grant select, update on public.avisos_email to service_role;

create or replace function public.encolar_avisos_incidencia_nueva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.avisos_email (
    tipo_evento,
    incidencia_id,
    destinatario_email,
    destinatario_nombre
  )
  select
    'NUEVA_INCIDENCIA',
    new.id,
    u.email,
    u.nombre
  from public.usuarios u
  where u.rol = 'ADMINISTRADOR'
    and u.activo = true
  on conflict do nothing;

  return new;
end;
$$;

create trigger trg_encolar_avisos_incidencia_nueva
after insert on public.incidencias
for each row
execute function public.encolar_avisos_incidencia_nueva();

revoke all on function public.encolar_avisos_incidencia_nueva() from public, anon, authenticated;

create or replace function public.encolar_aviso_actualizacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.avisos_email (
    tipo_evento,
    incidencia_id,
    actualizacion_id,
    destinatario_email,
    destinatario_nombre
  )
  select
    'ACTUALIZACION',
    new.incidencia_id,
    new.id,
    u.email,
    u.nombre
  from public.incidencias i
  join public.usuarios u on u.id = i.creada_por
  where i.id = new.incidencia_id
    and u.activo = true
  on conflict do nothing;

  return new;
end;
$$;

create trigger trg_encolar_aviso_actualizacion
after insert on public.actualizaciones
for each row
execute function public.encolar_aviso_actualizacion();

revoke all on function public.encolar_aviso_actualizacion() from public, anon, authenticated;

create or replace function public.reclamar_avisos_email(cantidad integer default 10)
returns setof public.avisos_email
language sql
security definer
set search_path = public
as $$
  with candidatos as (
    select id
    from public.avisos_email
    where intentos < 5
      and (
        (estado in ('PENDIENTE', 'FALLIDO') and proximo_intento <= now())
        or (estado = 'PROCESANDO' and bloqueado_en < now() - interval '10 minutes')
      )
    order by creado_en
    for update skip locked
    limit least(greatest(cantidad, 1), 25)
  )
  update public.avisos_email aviso
  set estado = 'PROCESANDO',
      intentos = aviso.intentos + 1,
      bloqueado_en = now()
  from candidatos
  where aviso.id = candidatos.id
  returning aviso.*;
$$;

revoke all on function public.reclamar_avisos_email(integer) from public, anon, authenticated;
grant execute on function public.reclamar_avisos_email(integer) to service_role;

create or replace function public.solicitar_procesado_avisos_email()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  project_url text;
  webhook_secret text;
  request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  order by created_at desc
  limit 1;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'incident_email_webhook_secret'
  order by created_at desc
  limit 1;

  if project_url is null or webhook_secret is null then
    raise warning 'No se puede invocar la función de avisos: faltan secretos en Vault.';
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/notificar-incidencia',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object('source', 'avisos_email'),
    timeout_milliseconds := 5000
  ) into request_id;

  return request_id;
exception
  when others then
    raise warning 'No se pudo invocar la función de avisos: %', sqlerrm;
    return null;
end;
$$;

revoke all on function public.solicitar_procesado_avisos_email() from public, anon, authenticated;

create or replace function public.invocar_procesador_avisos_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.solicitar_procesado_avisos_email();
  return new;
end;
$$;

create trigger trg_invocar_procesador_avisos_email
after insert on public.avisos_email
for each statement
execute function public.invocar_procesador_avisos_email();

revoke all on function public.invocar_procesador_avisos_email() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'procesar-avisos-email'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'procesar-avisos-email',
    '* * * * *',
    $job$select public.solicitar_procesado_avisos_email();$job$
  );
end;
$$;
