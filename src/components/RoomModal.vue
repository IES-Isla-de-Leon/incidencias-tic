<script setup>
import { nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { LOCATIONS } from '../lib/constants.js'

const props = defineProps({
  room: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save'])
const saving = ref(false)
const error = ref('')
const nameInput = ref(null)
const form = reactive({ id: '', nombre: '', ubicacion: '', equipamiento: '', activo: true })

watch(() => props.room, async (room) => {
  if (!room) return
  form.id = room.id ?? ''
  form.nombre = room.nombre ?? ''
  form.ubicacion = room.ubicacion ?? ''
  form.equipamiento = room.equipamiento ?? ''
  form.activo = room.activo ?? true
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  nameInput.value?.focus()
}, { immediate: true })

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

async function submit() {
  error.value = ''
  if (!form.nombre.trim() || !form.ubicacion) {
    error.value = 'Completa el nombre y la ubicación.'
    return
  }

  saving.value = true
  try {
    await new Promise((resolve, reject) => emit('save', { ...form }, resolve, reject))
    emit('close')
  } catch (caught) {
    error.value = caught.message
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="room"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6"
      @mousedown.self="$emit('close')"
    >
      <section class="max-h-[calc(100vh-24px)] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="room-dialog-title">
        <header class="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p class="eyebrow">Administración</p>
            <h2 id="room-dialog-title" class="mt-1 text-2xl font-bold">{{ form.id ? 'Editar estancia' : 'Nueva estancia' }}</h2>
          </div>
          <button class="btn-ghost text-xl" type="button" aria-label="Cerrar" @click="$emit('close')">×</button>
        </header>

        <form class="space-y-5 p-5 sm:p-6" @submit.prevent="submit">
          <div>
            <label class="label" for="room-name">Nombre</label>
            <input id="room-name" ref="nameInput" v-model="form.nombre" class="field" maxlength="150" required />
          </div>
          <div>
            <label class="label" for="room-location">Ubicación</label>
            <select id="room-location" v-model="form.ubicacion" class="field" required>
              <option value="">Selecciona</option>
              <option v-for="location in LOCATIONS" :key="location" :value="location">{{ location }}</option>
            </select>
          </div>
          <div>
            <label class="label" for="room-equipment">Equipamiento / observaciones</label>
            <textarea id="room-equipment" v-model="form.equipamiento" class="field min-h-32 resize-y" maxlength="4000"></textarea>
          </div>
          <label class="flex items-center gap-3">
            <input v-model="form.activo" type="checkbox" class="size-4 accent-isla-700" />
            <span class="font-semibold text-slate-700">Estancia activa</span>
          </label>
          <div v-if="error" class="notice-error" role="alert">{{ error }}</div>
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button class="btn-secondary" type="button" @click="$emit('close')">Cancelar</button>
            <button class="btn-primary" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar estancia' }}</button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

