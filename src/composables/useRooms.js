import { computed, reactive } from 'vue'
import { friendlyError } from '../lib/formatters.js'
import { supabase } from '../services/supabase.js'

export function useRooms() {
  let includeIncidentCounts = false

  const state = reactive({
    rooms: [],
    loading: false,
    error: ''
  })

  const activeRooms = computed(() => state.rooms.filter((room) => room.activo))

  async function loadRooms(options = {}) {
    includeIncidentCounts = options.includeIncidentCounts ?? includeIncidentCounts
    state.loading = true
    state.error = ''

    const roomsQuery = supabase
      .from('estancias')
      .select('id,nombre,ubicacion,equipamiento,activo')
      .order('ubicacion')
      .order('nombre')

    const [roomsResult, incidentsResult] = await Promise.all([
      roomsQuery,
      includeIncidentCounts
        ? supabase.from('incidencias').select('estancia_id,estado').not('publicada_en', 'is', null)
        : Promise.resolve({ data: [], error: null })
    ])

    state.loading = false
    if (roomsResult.error || incidentsResult.error) {
      state.error = friendlyError(roomsResult.error || incidentsResult.error)
      return false
    }

    const incidentCounts = (incidentsResult.data ?? []).reduce((counts, incident) => {
      const current = counts.get(incident.estancia_id) ?? { total: 0, open: 0 }
      current.total += 1
      if (incident.estado !== 'RESUELTA') current.open += 1
      counts.set(incident.estancia_id, current)
      return counts
    }, new Map())

    state.rooms = (roomsResult.data ?? []).map((room) => ({
      ...room,
      incidentCount: incidentCounts.get(room.id)?.total ?? 0,
      openIncidentCount: incidentCounts.get(room.id)?.open ?? 0
    }))
    return true
  }

  async function saveRoom(room) {
    const payload = {
      nombre: room.nombre.trim(),
      ubicacion: room.ubicacion,
      equipamiento: room.equipamiento.trim(),
      activo: room.activo
    }

    const query = room.id
      ? supabase.from('estancias').update(payload).eq('id', room.id)
      : supabase.from('estancias').insert(payload)

    const { error } = await query
    if (error) throw new Error(friendlyError(error))
    await loadRooms()
  }

  async function setRoomActive(room, activo) {
    const { error } = await supabase
      .from('estancias')
      .update({ activo })
      .eq('id', room.id)

    if (error) throw new Error(friendlyError(error))
    await loadRooms()
  }

  return { state, activeRooms, loadRooms, saveRoom, setRoomActive }
}

