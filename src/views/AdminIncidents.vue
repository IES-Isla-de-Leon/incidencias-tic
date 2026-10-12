<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IncidentDetailModal from '../components/IncidentDetailModal.vue'
import IncidentList from '../components/IncidentList.vue'
import { INCIDENT_TYPES, PRIORITIES, STATUSES } from '../lib/constants.js'
import { incidentTypeLabel, priorityLabel, statusLabel } from '../lib/formatters.js'
import { useIncidents } from '../composables/useIncidents.js'

const incidents = useIncidents()
const route = useRoute()
const router = useRouter()
const selectedIncident = ref('')
const search = ref('')
const status = ref('')
const priority = ref('')
const type = ref('')
const roomId = computed({
  get: () => typeof route.query.estancia === 'string' ? route.query.estancia : '',
  set: (value) => router.replace({
    query: { ...route.query, estancia: value || undefined }
  })
})

const roomOptions = computed(() => {
  const roomsById = new Map()
  incidents.state.incidents.forEach((incident) => {
    if (incident.estancia_id && incident.estancias?.nombre) {
      roomsById.set(incident.estancia_id, incident.estancias.nombre)
    }
  })
  return [...roomsById.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
})

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return incidents.state.incidents.filter((incident) => {
    if (roomId.value && incident.estancia_id !== roomId.value) return false
    if (status.value && incident.estado !== status.value) return false
    if (priority.value && incident.prioridad !== priority.value) return false
    if (type.value && incident.tipo !== type.value) return false
    if (!query) return true

    return [
      incident.codigo,
      incident.descripcion,
      incidentTypeLabel(incident.tipo),
      incident.estancias?.nombre,
      incident.estancias?.ubicacion,
      incident.usuarios?.nombre,
      incident.usuarios?.email
    ].filter(Boolean).join(' ').toLowerCase().includes(query)
  })
})

onMounted(incidents.loadAdminIncidents)
</script>

<template>
  <main class="page-container py-8 sm:py-10">
    <div class="mb-7">
      <p class="eyebrow">Administración</p>
      <h1 class="section-title mt-1">Incidencias</h1>
      <p class="mt-2 text-lg text-slate-600">Consulta y actualiza las incidencias del centro.</p>
    </div>

    <section class="card overflow-hidden" aria-labelledby="incidents-list-title">
      <div class="border-b border-slate-200 p-5 sm:p-6">
        <h2 id="incidents-list-title" class="sr-only">Listado de incidencias</h2>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_210px_190px_190px_220px]">
          <div>
            <label class="sr-only" for="incident-search">Buscar incidencias</label>
            <input id="incident-search" v-model="search" class="field" type="search" placeholder="Buscar por código, texto, estancia o usuario…" />
          </div>
          <div>
            <label class="sr-only" for="type-filter">Filtrar por tipo</label>
            <select id="type-filter" v-model="type" class="field">
              <option value="">Todos los tipos</option>
              <option v-for="item in INCIDENT_TYPES" :key="item" :value="item">{{ incidentTypeLabel(item) }}</option>
            </select>
          </div>
          <div>
            <label class="sr-only" for="status-filter">Filtrar por estado</label>
            <select id="status-filter" v-model="status" class="field">
              <option value="">Todos los estados</option>
              <option v-for="item in STATUSES" :key="item" :value="item">{{ statusLabel(item) }}</option>
            </select>
          </div>
          <div>
            <label class="sr-only" for="priority-filter">Filtrar por prioridad</label>
            <select id="priority-filter" v-model="priority" class="field">
              <option value="">Todas las prioridades</option>
              <option v-for="item in PRIORITIES" :key="item" :value="item">{{ priorityLabel(item) }}</option>
            </select>
          </div>
          <div>
            <label class="sr-only" for="room-filter">Filtrar por estancia</label>
            <select id="room-filter" v-model="roomId" class="field">
              <option value="">Todas las estancias</option>
              <option v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.nombre }}</option>
            </select>
          </div>
        </div>
        <p class="mt-3 text-sm text-slate-500">{{ filtered.length }} resultado{{ filtered.length === 1 ? '' : 's' }}</p>
      </div>

      <div v-if="incidents.state.error" class="m-5 notice-error" role="alert">{{ incidents.state.error }}</div>
      <IncidentList
        :incidents="filtered"
        :loading="incidents.state.loading"
        empty-text="No hay incidencias que coincidan con los filtros."
        show-reporter
        @open="selectedIncident = $event"
      />
    </section>

    <IncidentDetailModal
      :incident-id="selectedIncident"
      admin
      @close="selectedIncident = ''"
      @saved="incidents.loadAdminIncidents"
    />
  </main>
</template>

