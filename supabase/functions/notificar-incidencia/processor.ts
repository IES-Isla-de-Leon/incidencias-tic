import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const WEBHOOK_SECRET = Deno.env.get('INCIDENT_EMAIL_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = getSupabaseSecretKey()
const EMAIL_FROM = 'TDE <tde@iesisladeleon.es>'
const MAX_ATTEMPTS = 5
const PRIORITY_LABELS: Record<string, string> = {
  BAJA: 'Baja',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  URGENTE: 'Urgente'
}
const STATUS_LABELS: Record<string, string> = {
  ABIERTA: 'Abierta',
  EN_PROGRESO: 'En progreso',
  BLOQUEADA: 'Bloqueada',
  RESUELTA: 'Resuelta'
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

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
}

function incidentTypeLabel(value: string) {
  return value === 'CUENTAS_USUARIO'
    ? 'Gestión de cuentas de usuario'
    : 'Incidencias sobre equipamiento'
}

function priorityLabel(value: string) {
  return PRIORITY_LABELS[value] ?? value
}

function statusLabel(value: string | null) {
  if (!value) return ''
  return STATUS_LABELS[value] ?? value
}

function textLine(label: string, value: unknown) {
  return value ? `${label}: ${String(value)}` : null
}

function htmlRow(label: string, value: unknown) {
  if (!value) return ''
  return `<tr><th align="left" style="padding:4px 16px 4px 0">${escapeHtml(label)}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`
}

type EmailContent = {
  subject: string
  text: string
  html: string
}

async function buildEmail(supabase: any, notice: Record<string, any>): Promise<EmailContent> {
  const { data: incident, error: incidentError } = await supabase
    .from('incidencias')
    .select(`
      id,codigo,descripcion,prioridad,estado,tipo,
      estancias(nombre,ubicacion),
      usuarios!incidencias_creada_por_fkey(nombre,email)
    `)
    .eq('id', notice.incidencia_id)
    .single()

  if (incidentError) throw new Error(`No se pudo consultar la incidencia: ${incidentError.message}`)

  const room = Array.isArray(incident.estancias) ? incident.estancias[0] : incident.estancias
  const reporter = Array.isArray(incident.usuarios) ? incident.usuarios[0] : incident.usuarios
  const location = room ? `${room.nombre} · ${room.ubicacion}` : null
  const greetingText = `Hola ${notice.destinatario_nombre},`
  const greetingHtml = `<p>Hola ${escapeHtml(notice.destinatario_nombre)},</p>`

  if (notice.tipo_evento === 'NUEVA_INCIDENCIA') {
    const details = [
      textLine('Código', incident.codigo),
      textLine('Tipo', incidentTypeLabel(incident.tipo)),
      textLine('Prioridad', priorityLabel(incident.prioridad)),
      textLine('Estancia', location),
      textLine('Comunicada por', reporter ? `${reporter.nombre} (${reporter.email})` : null)
    ].filter(Boolean).join('\n')

    return {
      subject: `Nueva incidencia ${incident.codigo} · ${priorityLabel(incident.prioridad)}`,
      text: `${greetingText}\n\nSe ha recibido una nueva incidencia TIC.\n\n${details}\n\nDescripción:\n${incident.descripcion}`,
      html: `${greetingHtml}<p>Se ha recibido una nueva incidencia TIC.</p><table>${htmlRow('Código', incident.codigo)}${htmlRow('Tipo', incidentTypeLabel(incident.tipo))}${htmlRow('Prioridad', priorityLabel(incident.prioridad))}${htmlRow('Estancia', location)}${htmlRow('Comunicada por', reporter ? `${reporter.nombre} (${reporter.email})` : null)}</table><p><strong>Descripción</strong></p><p style="white-space:pre-wrap">${escapeHtml(incident.descripcion)}</p>`
    }
  }

  const { data: update, error: updateError } = await supabase
    .from('actualizaciones')
    .select('estado,observacion,usuarios(nombre)')
    .eq('id', notice.actualizacion_id)
    .single()

  if (updateError) throw new Error(`No se pudo consultar la actualización: ${updateError.message}`)

  const administrator = Array.isArray(update.usuarios) ? update.usuarios[0] : update.usuarios
  const newStatus = statusLabel(update.estado)
  const summary = newStatus ? `Nuevo estado: ${newStatus}` : 'Se ha añadido una nueva observación.'
  const observationText = update.observacion ? `\n\nObservación:\n${update.observacion}` : ''
  const administratorText = administrator?.nombre ? `\n\nActualizada por: ${administrator.nombre}` : ''

  return {
    subject: `Actualización de ${incident.codigo}${newStatus ? ` · ${newStatus}` : ''}`,
    text: `${greetingText}\n\nTu incidencia ${incident.codigo} tiene una nueva actualización.\n\n${summary}${observationText}${administratorText}`,
    html: `${greetingHtml}<p>Tu incidencia <strong>${escapeHtml(incident.codigo)}</strong> tiene una nueva actualización.</p>${newStatus ? `<p><strong>Nuevo estado:</strong> ${escapeHtml(newStatus)}</p>` : ''}${update.observacion ? `<p><strong>Observación</strong></p><p style="white-space:pre-wrap">${escapeHtml(update.observacion)}</p>` : ''}${administrator?.nombre ? `<p style="color:#475569">Actualizada por: ${escapeHtml(administrator.nombre)}</p>` : ''}`
  }
}

async function markFailed(supabase: any, notice: Record<string, any>, message: string) {
  const attempts = Number(notice.intentos)
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1))
  const nextAttempt = attempts >= MAX_ATTEMPTS
    ? null
    : new Date(Date.now() + delayMinutes * 60_000).toISOString()

  const { error } = await supabase
    .from('avisos_email')
    .update({
      estado: 'FALLIDO',
      ultimo_error: message.slice(0, 2000),
      proximo_intento: nextAttempt,
      bloqueado_en: null
    })
    .eq('id', notice.id)
    .eq('estado', 'PROCESANDO')

  if (error) console.error(`No se pudo registrar el fallo del aviso ${notice.id}:`, error.message)
}

async function processNotice(supabase: any, notice: Record<string, any>) {
  try {
    const content = await buildEmail(supabase, notice)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `aviso-${notice.id}`
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [notice.destinatario_email],
        subject: content.subject,
        text: content.text,
        html: content.html
      })
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(`Resend respondió ${response.status}: ${responseText}`)
    }

    const { error } = await supabase
      .from('avisos_email')
      .update({
        estado: 'ENVIADO',
        enviado_en: new Date().toISOString(),
        ultimo_error: null,
        proximo_intento: null,
        bloqueado_en: null
      })
      .eq('id', notice.id)
      .eq('estado', 'PROCESANDO')

    if (error) throw new Error(`El correo se envió, pero no pudo marcarse como enviado: ${error.message}`)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Falló el aviso ${notice.id}:`, message)
    await markFailed(supabase, notice, message)
    return false
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  if (!WEBHOOK_SECRET || request.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'No autorizado.' }, 401)
  }

  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Falta configuración de la función de avisos.')
    return json({ error: 'La función no está configurada.' }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: notices, error } = await supabase.rpc('reclamar_avisos_email', { cantidad: 10 })

  if (error) {
    console.error('No se pudo consultar la cola:', error.message)
    return json({ error: 'No se pudo consultar la cola de avisos.' }, 500)
  }

  if (!notices?.length) return json({ processed: 0, sent: 0, failed: 0 })

  const results = []
  for (const notice of notices) results.push(await processNotice(supabase, notice))

  const sent = results.filter(Boolean).length
  return json({ processed: results.length, sent, failed: results.length - sent })
})
