<script setup>
import { computed } from 'vue'
import { priorityLabel, statusLabel } from '../lib/formatters.js'

const props = defineProps({
  value: { type: String, required: true },
  type: { type: String, default: 'status' }
})

const classes = computed(() => ({
  ABIERTA: 'bg-rose-100 text-rose-800',
  EN_PROGRESO: 'bg-sky-100 text-sky-800',
  BLOQUEADA: 'bg-amber-100 text-amber-800',
  RESUELTA: 'bg-emerald-100 text-emerald-800',
  URGENTE: 'bg-red-100 text-red-800',
  ALTA: 'bg-orange-100 text-orange-800',
  NORMAL: 'bg-slate-100 text-slate-700',
  BAJA: 'bg-green-100 text-green-800'
})[props.value] ?? 'bg-slate-100 text-slate-700')

const label = computed(() => props.type === 'priority'
  ? priorityLabel(props.value)
  : statusLabel(props.value))
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" :class="classes">
    {{ label }}
  </span>
</template>

