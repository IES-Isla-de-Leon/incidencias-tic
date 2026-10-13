<script setup>
import { reactive, ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { useIncidents } from '../composables/useIncidents.js'
import RoomCombobox from './RoomCombobox.vue'

const props = defineProps({
  type: { type: String, required: true },
  rooms: { type: Array, required: true },
  loadingRooms: { type: Boolean, default: false }
})

const emit = defineEmits(['created', 'cancel'])
const auth = useAuth()
const incidents = useIncidents()
const submitting = ref(false)
const submittedCode = ref('')
const error = ref('')
const form = reactive({ roomId: '', description: '', urgent: false })

async function submit() {
  error.value = ''

  if (!form.description.trim()) {
    error.value = 'Describe el problema.'
    return
  }

  if (props.type === 'EQUIPAMIENTO' && !form.roomId) {
    error.value = 'Selecciona una estancia y describe el problema.'
    return
  }

  submitting.value = true
  try {
    const result = await incidents.createIncident({
      userId: auth.state.session.user.id,
      type: props.type,
      roomId: form.roomId,
      description: form.description,
      urgent: form.urgent
    })
    form.roomId = ''
    form.description = ''
    form.urgent = false
    submittedCode.value = result.codigo
    emit('created')
  } catch (caught) {
    error.value = caught.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="card overflow-hidden" :aria-labelledby="submittedCode ? 'incident-success-title' : 'new-incident-title'">
    <div v-if="submittedCode" class="flex min-h-96 flex-col items-center justify-center px-5 py-12 text-center sm:px-10">
      <span class="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-4xl font-bold text-emerald-700" aria-hidden="true">✓</span>
      <h2 id="incident-success-title" class="mt-6 text-2xl font-bold text-slate-950">Incidencia enviada correctamente</h2>
      <p class="mt-2 text-lg text-slate-600">El código de seguimiento es <strong>{{ submittedCode }}</strong>.</p>
      <button class="btn-primary mt-7 w-full sm:w-auto" type="button" @click="emit('cancel')">
        Comunicar otra incidencia
      </button>
    </div>

    <template v-else>
      <div class="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="eyebrow">Nueva incidencia</p>
            <h2 id="new-incident-title" class="mt-1 text-xl font-bold">
              {{ type === 'CUENTAS_USUARIO' ? 'Gestión de cuentas de usuario' : 'Incidencias sobre equipamiento' }}
            </h2>
          </div>
          <button class="btn-ghost shrink-0 self-start" type="button" @click="emit('cancel')">Cambiar tipo</button>
        </div>
      </div>

      <form class="space-y-5 p-5 sm:p-6" @submit.prevent="submit">
        <div v-if="type === 'EQUIPAMIENTO'">
          <label class="label" for="incident-room">Estancia</label>
          <RoomCombobox v-model="form.roomId" :rooms="rooms" :loading="loadingRooms" />
        </div>

        <div>
          <label class="label" for="incident-description">Descripción</label>
          <textarea
            id="incident-description"
            v-model="form.description"
            class="field min-h-36 resize-y"
            maxlength="4000"
            required
            :placeholder="type === 'CUENTAS_USUARIO' ? 'Explica el problema con la cuenta de usuario.' : 'Ej.: El ordenador del profesor no enciende.'"
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

        <div v-if="error" class="notice-error" role="alert">{{ error }}</div>

        <div class="flex justify-end">
          <button class="btn-primary w-full sm:w-auto" type="submit" :disabled="submitting || (type === 'EQUIPAMIENTO' && loadingRooms)">
            {{ submitting ? 'Enviando…' : 'Enviar incidencia' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

