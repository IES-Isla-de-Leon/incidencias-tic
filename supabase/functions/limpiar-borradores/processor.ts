import { createClient } from 'npm:@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('INCIDENT_EMAIL_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = getSupabaseSecretKey()
const BUCKET = 'incidencias-adjuntos'

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
    headers: { 'Cache-Control': 'no-store' }
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  if (!WEBHOOK_SECRET || request.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'No autorizado.' }, 401)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'La función no está configurada.' }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { data: drafts, error } = await supabase
    .rpc('reclamar_borradores_caducados', { cantidad: 100 })

  if (error) return json({ error: `No se pudieron consultar los borradores: ${error.message}` }, 500)

  let removed = 0
  const failures: Array<{ id: string; error: string }> = []

  for (const draft of drafts ?? []) {
    try {
      const folder = `${draft.creada_por}/${draft.id}`
      const { data: objects, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(folder, { limit: 100 })
      if (listError) throw listError

      const paths = (objects ?? [])
        .filter((object) => object.id)
        .map((object) => `${folder}/${object.name}`)

      if (paths.length) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths)
        if (removeError) throw removeError
      }

      const { data: deleted, error: deleteError } = await supabase
        .from('incidencias')
        .delete()
        .eq('id', draft.id)
        .is('publicada_en', null)
        .not('borrador_reclamado_en', 'is', null)
        .select('id')
      if (deleteError) throw deleteError
      if (deleted?.length) removed += 1
    } catch (caught) {
      failures.push({
        id: draft.id,
        error: caught instanceof Error ? caught.message : String(caught)
      })
    }
  }

  return json({ inspected: drafts?.length ?? 0, removed, failures })
})
