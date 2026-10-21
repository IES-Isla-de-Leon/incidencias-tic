<script setup>
import { computed, ref } from 'vue'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  rooms: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
const query = ref('')
const toggleButton = ref(null)

const selectedRoom = computed({
  get: () => props.rooms.find((room) => room.id === props.modelValue) ?? null,
  set: (room) => {
    emit('update:modelValue', room?.id ?? '')
    query.value = ''
  }
})

const filteredRooms = computed(() => {
  const search = normalize(query.value.trim())
  if (!search) return props.rooms

  return props.rooms.filter((room) =>
    normalize(`${room.nombre} ${room.ubicacion}`).includes(search)
  )
})

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function displayRoom(room) {
  return room?.nombre ?? ''
}

function openOptions(open) {
  if (!open && !props.loading) toggleButton.value?.click()
}
</script>

<template>
  <Combobox v-slot="{ open }" v-model="selectedRoom" by="id" nullable :disabled="loading || disabled">
    <div class="relative">
      <ComboboxInput
        id="incident-room"
        class="field pr-11"
        autocomplete="off"
        aria-required="true"
        :display-value="displayRoom"
        :placeholder="loading ? 'Cargando estancias…' : 'Busca o selecciona una estancia'"
        @click="openOptions(open)"
        @change="query = $event.target.value"
      />
      <ComboboxButton
        as="template"
      >
        <button
          ref="toggleButton"
          class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-300"
          type="button"
          aria-label="Mostrar estancias"
        >
          <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
          </svg>
        </button>
      </ComboboxButton>

      <ComboboxOptions class="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg focus:outline-none">
        <div v-if="!filteredRooms.length" class="px-4 py-3 text-sm text-slate-500">
          No hay estancias que coincidan con la búsqueda.
        </div>
        <ComboboxOption
          v-for="room in filteredRooms"
          :key="room.id"
          v-slot="{ active, selected }"
          as="template"
          :value="room"
        >
          <li
            class="flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5"
            :class="active ? 'bg-isla-50 text-isla-950' : 'text-slate-900'"
          >
            <span class="min-w-0">
              <span class="block truncate font-bold">{{ room.nombre }}</span>
              <span class="block truncate text-sm" :class="active ? 'text-isla-700' : 'text-slate-500'">
                {{ room.ubicacion }}
              </span>
            </span>
            <span v-if="selected" class="shrink-0 font-bold text-isla-700" aria-hidden="true">✓</span>
          </li>
        </ComboboxOption>
      </ComboboxOptions>
    </div>
  </Combobox>
</template>
