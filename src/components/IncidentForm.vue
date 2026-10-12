<script setup>
import { reactive, ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { useIncidents } from '../composables/useIncidents.js'

defineProps({
  rooms: { type: Array, required: true },
  loadingRooms: { type: Boolean, default: false }
})

const emit = defineEmits(['created'])
const auth = useAuth()
const incidents = useIncidents()
const submitting = ref(false)
const message = ref('')
const error = ref('')
const form = reactive({ roomId: '', description: '', urgent: false })

async function submit() {
  message.value = ''
  error.value = ''

  if (!form.roomId || !form.description.trim()) {
    error.value = 'Selecciona una estancia y describe el problema.'
    return
  }

  submitting.value = true
  try {
    const result = await incidents.createIncident({
      userId: auth.state.session.user.id,
      roomId: form.roomId,
      description: form.description,
      urgent: form.urgent
    })
    form.roomId = ''
    form.description = ''
    form.urgent = false
    message.value = `Incidencia ${result.codigo} enviada correctamente.`
    emit('created')
  } catch (caught) {
    error.value = caught.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="card overflow-hidden" aria-labelledby="new-incident-title">
    <div class="border-b border-slate-200 px-5 py-4 sm:px-6">
      <h2 id="new-incident-title" class="text-xl font-bold">Nueva incidencia</h2>
      <p class="mt-1 text-slate-600">Indica la estancia y describe el problema con claridad.</p>
    </div>

    <form class="space-y-5 p-5 sm:p-6" @submit.prevent="submit">
      <div>
        <label class="label" for="incident-room">Estancia</label>
        <select id="incident-room" v-model="form.roomId" class="field" required :disabled="loadingRooms">
          <option value="">{{ loadingRooms ? 'Cargando estancias…' : 'Selecciona una estancia' }}</option>
          <option v-for="room in rooms" :key="room.id" :value="room.id">
            {{ room.nombre }} · {{ room.ubicacion }}
          </option>
        </select>
      </div>

      <div>
        <label class="label" for="incident-description">Descripción</label>
        <textarea
          id="incident-description"
          v-model="form.description"
          class="field min-h-36 resize-y"
          maxlength="4000"
          required
          placeholder="Ej.: El ordenador del profesor no enciende."
        ></textarea>
        <p class="mt-1 text-right text-xs text-slate-400">{{ form.description.length }}/4000</p>
      </div>

      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <input v-model="form.urgent" type="checkbox" class="mt-1 size-4 accent-red-700" />
        <span>
          <span class="block font-semibold text-slate-900">¿La incidencia es urgente?</span>
          <span class="mt-0.5 block text-sm text-slate-600">
            Márcala solo si impide continuar una actividad importante.
          </span>
        </span>
      </label>

      <div v-if="message" class="notice-success" role="status">{{ message }}</div>
      <div v-if="error" class="notice-error" role="alert">{{ error }}</div>

      <div class="flex justify-end">
        <button class="btn-primary w-full sm:w-auto" type="submit" :disabled="submitting || loadingRooms">
          {{ submitting ? 'Enviando…' : 'Enviar incidencia' }}
        </button>
      </div>
    </form>
  </section>
</template>

