import { reactive } from 'vue'
import { friendlyError } from '../lib/formatters.js'
import { supabase } from '../services/supabase.js'

const INCIDENT_FIELDS = `
  id,codigo,fecha_creacion,publicada_en,descripcion,prioridad,estado,tipo,creada_por,estancia_id,
  estancias(nombre,ubicacion)
`

export const ATTACHMENT_BUCKET = 'incidencias-adjuntos'
export const MAX_ATTACHMENT_COUNT = 3
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
export const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

const ADMIN_INCIDENT_FIELDS = `
  ${INCIDENT_FIELDS},
  usuarios!incidencias_creada_por_fkey(nombre,email)
`

export function useIncidents() {
  const state = reactive({
    incidents: [],
    loading: false,
    error: ''
  })

  async function loadUserIncidents(userId) {
    return loadIncidents(
      supabase
        .from('incidencias')
        .select(INCIDENT_FIELDS)
        .eq('creada_por', userId)
        .not('publicada_en', 'is', null)
        .order('fecha_creacion', { ascending: false })
    )
  }

  async function loadAdminIncidents() {
    return loadIncidents(
      supabase
        .from('incidencias')
        .select(ADMIN_INCIDENT_FIELDS)
        .not('publicada_en', 'is', null)
        .order('fecha_creacion', { ascending: false })
    )
  }

  async function loadIncidents(query) {
    state.loading = true
    state.error = ''
    const { data, error } = await query
    state.loading = false

    if (error) {
      state.error = friendlyError(error)
      return false
    }
    state.incidents = data ?? []
    return true
  }

  async function createIncident({ userId, type, roomId, description, urgent }) {
    const { data, error } = await supabase
      .from('incidencias')
      .insert({
        creada_por: userId,
        tipo: type,
        estancia_id: type === 'EQUIPAMIENTO' ? roomId : null,
        descripcion: description.trim(),
        prioridad: urgent ? 'URGENTE' : 'NORMAL',
        estado: 'ABIERTA'
      })
      .select('id,codigo')
      .single()

    if (error) throw new Error(friendlyError(error))
    return data
  }

  async function finalizeIncident(id) {
    const { data, error } = await supabase
      .rpc('finalizar_incidencia_borrador', { p_incidencia_id: id })
      .single()

    if (error) throw new Error(friendlyError(error))
    return data
  }

  async function uploadAttachment({ incidentId, userId, file, attachmentId = crypto.randomUUID() }) {
    const extension = file.type === 'application/pdf'
      ? 'pdf'
      : file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${userId}/${incidentId}/${attachmentId}.${extension}`

    const { error: keepAliveError } = await supabase
      .rpc('mantener_incidencia_borrador', { p_incidencia_id: incidentId })
    if (keepAliveError) throw new Error(friendlyError(keepAliveError))

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      await supabase.storage.from(ATTACHMENT_BUCKET).remove([path])
      throw new Error(friendlyError(uploadError))
    }

    const { data, error: metadataError } = await supabase
      .from('adjuntos_incidencia')
      .insert({
        id: attachmentId,
        incidencia_id: incidentId,
        ruta_storage: path,
        nombre_original: file.name,
        tipo_mime: file.type,
        tamano_bytes: file.size,
        subido_por: userId
      })
      .select('id,ruta_storage,nombre_original,tipo_mime,tamano_bytes')
      .single()

    if (metadataError) {
      await supabase.storage.from(ATTACHMENT_BUCKET).remove([path])
      throw new Error(friendlyError(metadataError))
    }

    return data
  }

  async function removeAttachment(attachment) {
    const { error: storageError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([attachment.ruta_storage])

    if (storageError) throw new Error(friendlyError(storageError))

    const { error } = await supabase
      .from('adjuntos_incidencia')
      .delete()
      .eq('id', attachment.id)

    if (error) throw new Error(friendlyError(error))
  }

  async function removeAdminAttachment(attachment) {
    const { error } = await supabase.functions.invoke('gestionar-adjuntos', {
      body: { action: 'delete-attachment', id: attachment.id }
    })
    if (error) throw new Error(friendlyError(error))
  }

  async function cancelDraft(incidentId, userId) {
    const folder = `${userId}/${incidentId}`
    const { data: objects, error: listError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .list(folder, { limit: 100 })
    if (listError) throw new Error(friendlyError(listError))

    const paths = (objects ?? [])
      .filter((object) => object.id)
      .map((object) => `${folder}/${object.name}`)
    if (paths.length) {
      const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths)
      if (error) throw new Error(friendlyError(error))
    }

    const { error } = await supabase
      .rpc('eliminar_incidencia_borrador', { p_incidencia_id: incidentId })

    if (error) throw new Error(friendlyError(error))
  }

  async function loadIncidentDetail(id) {
    const { data: incident, error } = await supabase
      .from('incidencias')
      .select(`
        id,codigo,fecha_creacion,publicada_en,descripcion,prioridad,estado,tipo,creada_por,estancia_id,
        estancias(nombre,ubicacion,equipamiento),
        usuarios!incidencias_creada_por_fkey(nombre,email),
        adjuntos_incidencia(id,ruta_storage,nombre_original,tipo_mime,tamano_bytes,creado_en)
      `)
      .eq('id', id)
      .single()

    if (error) throw new Error(friendlyError(error))

    const { data: updates, error: updatesError } = await supabase
      .from('actualizaciones')
      .select('id,fecha,observacion,estado,usuario_id,usuarios(nombre)')
      .eq('incidencia_id', id)
      .order('fecha', { ascending: true })

    if (updatesError) throw new Error(friendlyError(updatesError))
    return { ...incident, updates: updates ?? [] }
  }

  async function downloadAttachment(attachment) {
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .download(attachment.ruta_storage)

    if (error) throw new Error(friendlyError(error))

    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.nombre_original
    link.click()
    URL.revokeObjectURL(url)
  }

  async function updateIncident({ incident, priority, status, observation, userId }) {
    const statusChanged = status !== incident.estado
    const priorityChanged = priority !== incident.prioridad

    if (statusChanged || observation.trim()) {
      const { error } = await supabase.from('actualizaciones').insert({
        incidencia_id: incident.id,
        usuario_id: userId,
        observacion: observation.trim() || null,
        estado: statusChanged ? status : null
      })
      if (error) throw new Error(friendlyError(error))
    }

    if (priorityChanged) {
      const { error } = await supabase
        .from('incidencias')
        .update({ prioridad: priority })
        .eq('id', incident.id)
      if (error) throw new Error(friendlyError(error))
    }
  }

  async function deleteIncident(incident) {
    const { error } = await supabase.functions.invoke('gestionar-adjuntos', {
      body: { action: 'delete-incident', id: incident.id }
    })
    if (error) throw new Error(friendlyError(error))
  }

  return {
    state,
    loadUserIncidents,
    loadAdminIncidents,
    createIncident,
    finalizeIncident,
    uploadAttachment,
    removeAttachment,
    removeAdminAttachment,
    cancelDraft,
    loadIncidentDetail,
    downloadAttachment,
    updateIncident,
    deleteIncident
  }
}

