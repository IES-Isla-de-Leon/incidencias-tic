-- Ajustes acordados tras la validación del MVP.
-- Ejecutar sobre el proyecto Supabase actual después de rls_incidencias_tic.sql.

-- Todo cambio de estado debe proceder de una fila inmutable de actualizaciones.
-- El trigger SECURITY DEFINER sincronizar_estado_incidencia conserva la capacidad
-- de actualizar incidencias.estado al insertar dicha actualización.
revoke update on public.incidencias from authenticated;
grant update (prioridad) on public.incidencias to authenticated;

-- Las estancias se dan de baja mediante activo=false; no se eliminan desde clientes.
drop policy if exists "administradores_eliminar_estancias" on public.estancias;
revoke delete on public.estancias from authenticated;

