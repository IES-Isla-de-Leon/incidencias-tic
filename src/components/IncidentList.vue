<script setup>
import IncidentRow from './IncidentRow.vue'

defineProps({
  incidents: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: 'No hay incidencias.' },
  showReporter: { type: Boolean, default: false }
})

defineEmits(['open'])
</script>

<template>
  <div v-if="loading" class="px-6 py-10 text-center text-slate-500" role="status">
    Cargando incidencias…
  </div>
  <div v-else-if="!incidents.length" class="px-6 py-10 text-center text-slate-500">
    {{ emptyText }}
  </div>
  <div v-else>
    <IncidentRow
      v-for="incident in incidents"
      :key="incident.id"
      :incident="incident"
      :show-reporter="showReporter"
      @open="$emit('open', $event)"
    />
  </div>
</template>

