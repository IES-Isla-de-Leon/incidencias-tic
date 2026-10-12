<script setup>
import { computed, onMounted, ref } from 'vue'
import RoomModal from '../components/RoomModal.vue'
import { useRooms } from '../composables/useRooms.js'
import { LOCATIONS } from '../lib/constants.js'

const rooms = useRooms()
const search = ref('')
const incidentFilter = ref('')
const locationFilter = ref('')
const editedRoom = ref(null)
const actionError = ref('')
const togglingId = ref('')

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return rooms.state.rooms.filter((room) => {
    if (incidentFilter.value === 'WITH_OPEN' && room.openIncidentCount === 0) return false
    if (incidentFilter.value === 'WITHOUT_OPEN' && room.openIncidentCount > 0) return false
    if (locationFilter.value && room.ubicacion !== locationFilter.value) return false
    if (!query) return true

    return [room.nombre, room.ubicacion, room.equipamiento]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
})

function openNewRoom() {
  editedRoom.value = { nombre: '', ubicacion: '', equipamiento: '', activo: true }
}

async function saveRoom(room, resolve, reject) {
  actionError.value = ''
  try {
    await rooms.saveRoom(room)
    resolve()
  } catch (error) {
    reject(error)
  }
}

async function toggleRoom(room) {
  actionError.value = ''
  togglingId.value = room.id
  try {
    await rooms.setRoomActive(room, !room.activo)
  } catch (error) {
    actionError.value = error.message
  } finally {
    togglingId.value = ''
  }
}

onMounted(() => rooms.loadRooms({ includeIncidentCounts: true }))
</script>

<template>
  <main class="page-container py-8 sm:py-10">
    <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Administración</p>
        <h1 class="section-title mt-1">Estancias</h1>
        <p class="mt-2 text-lg text-slate-600">Gestiona los espacios disponibles en el formulario de incidencias.</p>
      </div>
      <button class="btn-primary" type="button" @click="openNewRoom">Nueva estancia</button>
    </div>

    <section class="card overflow-hidden" aria-labelledby="rooms-list-title">
      <div class="border-b border-slate-200 p-5 sm:p-6">
        <h2 id="rooms-list-title" class="sr-only">Listado de estancias</h2>
        <div class="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_260px]">
          <div>
            <label class="sr-only" for="room-search">Buscar estancias</label>
            <input id="room-search" v-model="search" class="field" type="search" placeholder="Buscar por nombre, ubicación o equipamiento…" />
          </div>
          <div>
            <label class="sr-only" for="room-incidents-filter">Filtrar por incidencias</label>
            <select id="room-incidents-filter" v-model="incidentFilter" class="field">
              <option value="">Todos</option>
              <option value="WITH_OPEN">Con incidencias</option>
              <option value="WITHOUT_OPEN">Sin incidencias</option>
            </select>
          </div>
          <div>
            <label class="sr-only" for="room-location-filter">Filtrar por ubicación</label>
            <select id="room-location-filter" v-model="locationFilter" class="field">
              <option value="">Todas las ubicaciones</option>
              <option v-for="location in LOCATIONS" :key="location" :value="location">{{ location }}</option>
            </select>
          </div>
        </div>
        <p class="mt-3 text-sm text-slate-500">{{ filtered.length }} estancia{{ filtered.length === 1 ? '' : 's' }}</p>
      </div>

      <div v-if="rooms.state.error || actionError" class="m-5 notice-error" role="alert">{{ rooms.state.error || actionError }}</div>
      <div v-if="rooms.state.loading" class="p-10 text-center text-slate-500" role="status">Cargando estancias…</div>
      <div v-else-if="!filtered.length" class="p-10 text-center text-slate-500">No hay estancias que coincidan con los filtros.</div>
      <div v-else>
        <div class="hidden grid-cols-[minmax(0,1fr)_220px_140px_110px_180px] gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Estancia</span>
          <span>Ubicación</span>
          <span>Incidencias</span>
          <span>Estado</span>
          <span class="text-right">Acciones</span>
        </div>
        <article
          v-for="room in filtered"
          :key="room.id"
          class="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_220px_140px_110px_180px] md:items-center sm:px-6"
        >
          <div class="min-w-0">
            <h3 class="font-semibold text-slate-900">{{ room.nombre }}</h3>
            <p v-if="room.equipamiento" class="mt-0.5 truncate text-sm text-slate-500">{{ room.equipamiento }}</p>
          </div>
          <p class="text-sm text-slate-600">{{ room.ubicacion }}</p>
          <p class="text-sm text-slate-600">
            <span class="font-semibold text-slate-900">{{ room.incidentCount }}</span>
            <span class="md:hidden"> incidencia{{ room.incidentCount === 1 ? '' : 's' }}</span>
          </p>
          <p class="text-sm font-semibold" :class="room.activo ? 'text-emerald-700' : 'text-slate-400'">{{ room.activo ? 'Activa' : 'Inactiva' }}</p>
          <div class="flex flex-wrap gap-2 md:justify-end">
            <button
              class="inline-flex min-h-9 items-center justify-center rounded-lg border border-isla-200 bg-isla-50 px-3 py-1.5 text-sm font-semibold text-isla-700 transition hover:border-isla-300 hover:bg-isla-100"
              type="button"
              @click="editedRoom = { ...room }"
            >
              Editar
            </button>
            <button
              class="inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              :class="room.activo
                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100'"
              type="button"
              :disabled="togglingId === room.id"
              @click="toggleRoom(room)"
            >
              {{ room.activo ? 'Desactivar' : 'Activar' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <RoomModal :room="editedRoom" @close="editedRoom = null" @save="saveRoom" />
  </main>
</template>

