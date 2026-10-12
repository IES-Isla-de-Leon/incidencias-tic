-- Distingue las incidencias de cuentas de usuario de las de equipamiento.
-- Las incidencias existentes se consideran de equipamiento.

alter table public.incidencias
  add column tipo text not null default 'EQUIPAMIENTO';

alter table public.incidencias
  alter column estancia_id drop not null;

alter table public.incidencias
  add constraint incidencias_tipo_check
  check (tipo in ('CUENTAS_USUARIO', 'EQUIPAMIENTO'));

alter table public.incidencias
  add constraint incidencias_tipo_estancia_check
  check (
    (tipo = 'CUENTAS_USUARIO' and estancia_id is null)
    or
    (tipo = 'EQUIPAMIENTO' and estancia_id is not null)
  );

comment on column public.incidencias.tipo is
  'Clasificación funcional: CUENTAS_USUARIO o EQUIPAMIENTO.';
