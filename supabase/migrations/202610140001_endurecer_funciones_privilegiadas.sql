-- Endurecimiento de funciones SECURITY DEFINER antes de publicar el código.
--
-- Todas las relaciones y funciones usadas por estas rutinas están cualificadas
-- con su esquema. Un search_path vacío evita que un objeto controlado por otro
-- rol pueda sustituir una referencia durante la ejecución privilegiada.

alter function public.generar_codigo_incidencia()
  set search_path = '';

alter function public.sincronizar_estado_incidencia()
  set search_path = '';

alter function public.crear_perfil_usuario()
  set search_path = '';

alter function public.es_dominio_permitido()
  set search_path = '';

alter function public.es_usuario_activo()
  set search_path = '';

alter function public.es_administrador()
  set search_path = '';

alter function public.puede_acceder()
  set search_path = '';

alter function public.encolar_avisos_incidencia_nueva()
  set search_path = '';

alter function public.encolar_aviso_actualizacion()
  set search_path = '';

alter function public.reclamar_avisos_email(integer)
  set search_path = '';

alter function public.solicitar_procesado_avisos_email()
  set search_path = '';

alter function public.invocar_procesador_avisos_email()
  set search_path = '';

-- Las funciones de trigger y de procesamiento interno nunca se invocan desde
-- clientes. Los triggers conservan su funcionamiento aunque se retire EXECUTE.
revoke all on function public.generar_codigo_incidencia()
  from public, anon, authenticated;
revoke all on function public.sincronizar_estado_incidencia()
  from public, anon, authenticated;
revoke all on function public.crear_perfil_usuario()
  from public, anon, authenticated;
revoke all on function public.encolar_avisos_incidencia_nueva()
  from public, anon, authenticated;
revoke all on function public.encolar_aviso_actualizacion()
  from public, anon, authenticated;
revoke all on function public.solicitar_procesado_avisos_email()
  from public, anon, authenticated;
revoke all on function public.invocar_procesador_avisos_email()
  from public, anon, authenticated;

-- La Edge Function procesa la cola con el rol de servicio.
revoke all on function public.reclamar_avisos_email(integer)
  from public, anon, authenticated;
grant execute on function public.reclamar_avisos_email(integer)
  to service_role;

-- Estas comprobaciones se usan en políticas RLS. Solo los usuarios con una
-- sesión autenticada necesitan poder ejecutarlas.
revoke all on function public.es_dominio_permitido()
  from public, anon, authenticated;
revoke all on function public.es_usuario_activo()
  from public, anon, authenticated;
revoke all on function public.es_administrador()
  from public, anon, authenticated;
revoke all on function public.puede_acceder()
  from public, anon, authenticated;

grant execute on function public.es_dominio_permitido() to authenticated;
grant execute on function public.es_usuario_activo() to authenticated;
grant execute on function public.es_administrador() to authenticated;
grant execute on function public.puede_acceder() to authenticated;
