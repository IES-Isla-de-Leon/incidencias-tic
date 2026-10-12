import { reactive } from 'vue'
import { friendlyError } from '../lib/formatters.js'
import { supabase } from '../services/supabase.js'

const INCIDENT_FIELDS = `
  id,codigo,fecha_creacion,descripcion,prioridad,estado,creada_por,estancia_id,
  estancias(nombre,ubicacion)
`

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
        .order('fecha_creacion', { ascending: false })
    )
  }

  async function loadAdminIncidents() {
    return loadIncidents(
      supabase
        .from('incidencias')
        .select(ADMIN_INCIDENT_FIELDS)
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

  async function createIncident({ userId, roomId, description, urgent }) {
    const { data, error } = await supabase
      .from('incidencias')
      .insert({
        creada_por: userId,
        estancia_id: roomId,
        descripcion: description.trim(),
        prioridad: urgent ? 'URGENTE' : 'NORMAL',
        estado: 'ABIERTA'
      })
      .select('codigo')
      .single()

    if (error) throw new Error(friendlyError(error))
    return data
  }

  async function loadIncidentDetail(id) {
    const { data: incident, error } = await supabase
      .from('incidencias')
      .select(`
        id,codigo,fecha_creacion,descripcion,prioridad,estado,creada_por,estancia_id,
        estancias(nombre,ubicacion,equipamiento),
        usuarios!incidencias_creada_por_fkey(nombre,email)
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

  async function deleteIncident(id) {
    const { error } = await supabase
      .from('incidencias')
      .delete()
      .eq('id', id)
      .select('id')
      .single()

    if (error) throw new Error(friendlyError(error))
  }

  return {
    state,
    loadUserIncidents,
    loadAdminIncidents,
    createIncident,
    loadIncidentDetail,
    updateIncident,
    deleteIncident
  }
}

