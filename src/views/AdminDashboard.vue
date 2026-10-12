<script setup>
import { computed, onMounted, ref } from 'vue'
import IncidentDetailModal from '../components/IncidentDetailModal.vue'
import IncidentList from '../components/IncidentList.vue'
import { useIncidents } from '../composables/useIncidents.js'

const incidents = useIncidents()
const selectedIncident = ref('')
const rows = computed(() => incidents.state.incidents)
const stats = computed(() => ({
  abiertas: rows.value.filter((item) => item.estado === 'ABIERTA').length,
  progreso: rows.value.filter((item) => item.estado === 'EN_PROGRESO').length,
  bloqueadas: rows.value.filter((item) => item.estado === 'BLOQUEADA').length,
  urgentes: rows.value.filter((item) => item.prioridad === 'URGENTE' && item.estado !== 'RESUELTA').length
}))
const recent = computed(() => rows.value.slice(0, 6))

onMounted(incidents.loadAdminIncidents)
</script>

<template>
  <main class="page-container py-8 sm:py-10">
    <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Administración</p>
        <h1 class="section-title mt-1">Panel TIC</h1>
        <p class="mt-2 text-lg text-slate-600">Resumen actual del servicio.</p>
      </div>
      <RouterLink class="btn-primary" to="/admin/incidencias">Ver incidencias</RouterLink>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <article class="card p-4 sm:p-5"><p class="text-sm font-semibold text-slate-500">Abiertas</p><p class="mt-2 text-3xl font-bold text-rose-700">{{ stats.abiertas }}</p></article>
      <article class="card p-4 sm:p-5"><p class="text-sm font-semibold text-slate-500">En progreso</p><p class="mt-2 text-3xl font-bold text-sky-700">{{ stats.progreso }}</p></article>
      <article class="card p-4 sm:p-5"><p class="text-sm font-semibold text-slate-500">Bloqueadas</p><p class="mt-2 text-3xl font-bold text-amber-700">{{ stats.bloqueadas }}</p></article>
      <article class="card p-4 sm:p-5"><p class="text-sm font-semibold text-slate-500">Urgentes activas</p><p class="mt-2 text-3xl font-bold text-red-700">{{ stats.urgentes }}</p></article>
    </div>

    <section class="card mt-7 overflow-hidden" aria-labelledby="recent-title">
      <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div><h2 id="recent-title" class="text-xl font-bold">Últimas incidencias</h2><p class="mt-1 text-slate-600">Las seis más recientes.</p></div>
      </div>
      <div v-if="incidents.state.error" class="m-5 notice-error">{{ incidents.state.error }}</div>
      <IncidentList :incidents="recent" :loading="incidents.state.loading" show-reporter @open="selectedIncident = $event" />
    </section>

    <IncidentDetailModal
      :incident-id="selectedIncident"
      admin
      @close="selectedIncident = ''"
      @saved="incidents.loadAdminIncidents"
    />
  </main>
</template>

