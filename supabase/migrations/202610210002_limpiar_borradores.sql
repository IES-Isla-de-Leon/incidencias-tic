-- Invoca cada cinco minutos la limpieza de borradores abandonados. La Edge
-- Function aplica una caducidad de 15 minutos y elimina primero los objetos.

create or replace function public.reclamar_borradores_caducados(cantidad integer default 100)
returns table (id uuid, creada_por uuid)
language sql
security definer
set search_path = ''
as $$
  with candidatos as (
    select i.id
    from public.incidencias i
    where i.publicada_en is null
      and i.borrador_actualizado_en < now() - interval '15 minutes'
      and (
        i.borrador_reclamado_en is null
        or i.borrador_reclamado_en < now() - interval '10 minutes'
      )
    order by i.borrador_actualizado_en
    limit greatest(cantidad, 0)
    for update skip locked
  )
  update public.incidencias i
  set borrador_reclamado_en = now()
  from candidatos c
  where i.id = c.id
  returning i.id, i.creada_por;
$$;

revoke all on function public.reclamar_borradores_caducados(integer)
  from public, anon, authenticated;
grant execute on function public.reclamar_borradores_caducados(integer)
  to service_role;

create or replace function public.solicitar_limpieza_borradores()
returns bigint
language plpgsql
security definer
set search_path = ''
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
    raise warning 'No se puede invocar la limpieza de borradores: faltan secretos en Vault.';
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/limpiar-borradores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
exception
  when others then
    raise warning 'No se pudo invocar la limpieza de borradores: %', sqlerrm;
    return null;
end;
$$;

revoke all on function public.solicitar_limpieza_borradores()
  from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'limpiar-borradores-incidencias'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'limpiar-borradores-incidencias',
    '*/5 * * * *',
    $job$select public.solicitar_limpieza_borradores();$job$
  );
end;
$$;
