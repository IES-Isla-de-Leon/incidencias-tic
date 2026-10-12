<script setup>
import { computed, onMounted, ref } from 'vue'
import IncidentDetailModal from '../components/IncidentDetailModal.vue'
import IncidentList from '../components/IncidentList.vue'
import { PRIORITIES, STATUSES } from '../lib/constants.js'
import { priorityLabel, statusLabel } from '../lib/formatters.js'
import { useIncidents } from '../composables/useIncidents.js'

const incidents = useIncidents()
const selectedIncident = ref('')
const search = ref('')
const status = ref('')
const priority = ref('')

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return incidents.state.incidents.filter((incident) => {
    if (status.value && incident.estado !== status.value) return false
    if (priority.value && incident.prioridad !== priority.value) return false
    if (!query) return true

    return [
      incident.codigo,
      incident.descripcion,
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
        <div class="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px]">
          <div>
            <label class="sr-only" for="incident-search">Buscar incidencias</label>
            <input id="incident-search" v-model="search" class="field" type="search" placeholder="Buscar por código, texto, estancia o usuario…" />
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

