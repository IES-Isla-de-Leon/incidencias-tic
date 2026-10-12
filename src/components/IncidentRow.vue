<script setup>
import { formatDate } from '../lib/formatters.js'
import StatusBadge from './StatusBadge.vue'

defineProps({
  incident: { type: Object, required: true },
  showReporter: { type: Boolean, default: false }
})

defineEmits(['open'])
</script>

<template>
  <button
    type="button"
    class="grid w-full grid-cols-1 gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-0 hover:bg-slate-50 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
    :aria-label="`Abrir ${incident.codigo}`"
    @click="$emit('open', incident.id)"
  >
    <span>
      <span class="block font-bold text-isla-800">{{ incident.codigo }}</span>
      <span class="mt-0.5 block text-sm text-slate-500">{{ formatDate(incident.fecha_creacion) }}</span>
    </span>

    <span class="min-w-0">
      <span class="block truncate font-semibold text-slate-900">{{ incident.descripcion }}</span>
      <span class="mt-0.5 block text-sm text-slate-500">{{ incident.estancias?.nombre || 'Sin estancia' }}</span>
      <span v-if="showReporter && incident.usuarios" class="mt-0.5 block text-sm text-slate-500">
        {{ incident.usuarios.nombre }} · {{ incident.usuarios.email }}
      </span>
    </span>

    <span class="flex flex-wrap gap-2 sm:justify-end">
      <StatusBadge :value="incident.prioridad" type="priority" />
      <StatusBadge :value="incident.estado" />
    </span>
  </button>
</template>

