<script setup>
import { onMounted, ref } from 'vue'
import IncidentDetailModal from '../components/IncidentDetailModal.vue'
import IncidentForm from '../components/IncidentForm.vue'
import IncidentList from '../components/IncidentList.vue'
import { useAuth } from '../composables/useAuth.js'
import { useIncidents } from '../composables/useIncidents.js'
import { useRooms } from '../composables/useRooms.js'

const auth = useAuth()
const incidents = useIncidents()
const rooms = useRooms()
const selectedIncident = ref('')
const incidentType = ref('')

function selectIncidentType(type) {
  incidentType.value = type
}

async function handleCreated() {
  await loadIncidents()
}

async function loadIncidents() {
  await incidents.loadUserIncidents(auth.state.session.user.id)
}

onMounted(async () => {
  await Promise.all([rooms.loadRooms(), loadIncidents()])
})
</script>

<template>
  <main class="page-container py-8 sm:py-10">
    <section class="mb-7">
      <p class="eyebrow">Servicio TIC</p>
      <h1 class="section-title mt-1">Bienvenido, {{ auth.state.profile.nombre }}</h1>
      <p class="mt-2 max-w-3xl text-lg text-slate-600">
        Comunica una nueva incidencia y consulta el estado de las que ya hayas enviado.
      </p>
    </section>

    <div class="grid gap-7">
      <section v-if="!incidentType" class="card overflow-hidden" aria-labelledby="incident-type-title">
        <div class="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="incident-type-title" class="text-xl font-bold">¿Qué tipo de incidencia quieres comunicar?</h2>
        </div>
        <div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <button
            class="group flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition hover:border-isla-500 hover:bg-isla-50 focus-visible:border-isla-600"
            type="button"
            @click="selectIncidentType('CUENTAS_USUARIO')"
          >
            <span class="flex size-20 items-center justify-center rounded-2xl bg-isla-100 text-5xl text-isla-800" aria-hidden="true">@</span>
            <span class="mt-5 block text-xl font-bold text-slate-950">Gestión de cuentas de usuario</span>
          </button>
          <button
            class="group flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition hover:border-isla-500 hover:bg-isla-50 focus-visible:border-isla-600"
            type="button"
            @click="selectIncidentType('EQUIPAMIENTO')"
          >
            <span class="flex size-20 items-center justify-center rounded-2xl bg-isla-100 text-5xl text-isla-800" aria-hidden="true">▣</span>
            <span class="mt-5 block text-xl font-bold text-slate-950">Incidencias sobre equipamiento</span>
          </button>
        </div>
      </section>

      <IncidentForm
        v-else
        :type="incidentType"
        :rooms="rooms.activeRooms.value"
        :loading-rooms="rooms.state.loading"
        @cancel="incidentType = ''"
        @created="handleCreated"
      />

      <section class="card overflow-hidden" aria-labelledby="my-incidents-title">
        <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="my-incidents-title" class="text-xl font-bold">Mis incidencias</h2>
            <p class="mt-1 text-slate-600">Consulta su estado y seguimiento.</p>
          </div>
          <button class="btn-secondary hidden sm:inline-flex" type="button" :disabled="incidents.state.loading" @click="loadIncidents">
            Actualizar
          </button>
        </div>
        <div v-if="incidents.state.error" class="m-5 notice-error" role="alert">{{ incidents.state.error }}</div>
        <IncidentList
          :incidents="incidents.state.incidents"
          :loading="incidents.state.loading"
          empty-text="Todavía no has comunicado ninguna incidencia."
          @open="selectedIncident = $event"
        />
      </section>
    </div>

    <IncidentDetailModal :incident-id="selectedIncident" @close="selectedIncident = ''" />
  </main>
</template>

