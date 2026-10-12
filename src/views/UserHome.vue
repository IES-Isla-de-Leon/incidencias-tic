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
      <IncidentForm
        :rooms="rooms.activeRooms.value"
        :loading-rooms="rooms.state.loading"
        @created="loadIncidents"
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

