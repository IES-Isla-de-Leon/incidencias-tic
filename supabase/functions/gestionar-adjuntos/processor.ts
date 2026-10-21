import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = getSupabaseSecretKey()
const BUCKET = 'incidencias-adjuntos'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function getSupabaseSecretKey() {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacyKey) return legacyKey

  try {
    return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default
  } catch {
    return undefined
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' }
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'La función no está configurada.' }, 500)

  const authorization = request.headers.get('authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'No autorizado.' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) return json({ error: 'Sesión no válida.' }, 401)

  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('rol,activo,email')
    .eq('id', authData.user.id)
    .single()
  if (
    profileError
    || !profile?.activo
    || profile.rol !== 'ADMINISTRADOR'
    || !profile.email.toLowerCase().endsWith('@iesisladeleon.es')
  ) return json({ error: 'Se requiere una cuenta administradora activa.' }, 403)

  let body: { action?: string; id?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Petición no válida.' }, 400)
  }
  if (!body.id) return json({ error: 'Falta el identificador.' }, 400)

  if (body.action === 'delete-attachment') {
    const { data: attachment, error } = await supabase
      .from('adjuntos_incidencia')
      .select('id,ruta_storage')
      .eq('id', body.id)
      .single()
    if (error) return json({ error: 'No se encontró el archivo.' }, 404)

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.ruta_storage])
    if (storageError) return json({ error: `No se pudo eliminar el archivo: ${storageError.message}` }, 502)

    const { error: deleteError } = await supabase.from('adjuntos_incidencia').delete().eq('id', attachment.id)
    if (deleteError) return json({ error: `El archivo se retiró, pero falta completar la limpieza: ${deleteError.message}` }, 500)
    return json({ deleted: attachment.id })
  }

  if (body.action === 'delete-incident') {
    const { data: incident, error } = await supabase
      .from('incidencias')
      .select('id,adjuntos_incidencia(ruta_storage)')
      .eq('id', body.id)
      .single()
    if (error) return json({ error: 'No se encontró la incidencia.' }, 404)

    const paths = (incident.adjuntos_incidencia ?? []).map((item: { ruta_storage: string }) => item.ruta_storage)
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
      if (storageError) return json({ error: `No se pudieron eliminar los archivos: ${storageError.message}` }, 502)
    }

    const { error: deleteError } = await supabase.from('incidencias').delete().eq('id', incident.id)
    if (deleteError) return json({ error: `Los archivos se retiraron, pero falta completar la eliminación: ${deleteError.message}` }, 500)
    return json({ deleted: incident.id })
  }

  return json({ error: 'Acción no permitida.' }, 400)
})
