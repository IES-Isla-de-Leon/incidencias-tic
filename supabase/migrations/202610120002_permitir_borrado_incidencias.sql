-- Permite que únicamente los administradores eliminen incidencias.
-- Las actualizaciones asociadas se eliminan mediante la FK ON DELETE CASCADE.

drop policy if exists "administradores_eliminar_incidencias" on public.incidencias;

create policy "administradores_eliminar_incidencias"
on public.incidencias
for delete
to authenticated
using (
  public.es_dominio_permitido()
  and public.es_administrador()
);

grant delete on public.incidencias to authenticated;
