<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_SIZE,
  useIncidents
} from '../composables/useIncidents.js'
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
const cleaning = ref(false)
const submittedCode = ref('')
const error = ref('')
const fileInput = ref(null)
const draft = ref(null)
const attachments = ref([])
const form = reactive({ roomId: '', description: '', urgent: false })
const hasFailedUploads = computed(() => attachments.value.some((item) => item.status === 'failed'))
const hasPendingUploads = computed(() => attachments.value.some((item) => ['uploading', 'removing'].includes(item.status)))

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function selectFiles(event) {
  error.value = ''
  const selected = Array.from(event.target.files ?? [])
  event.target.value = ''

  if (attachments.value.length + selected.length > MAX_ATTACHMENT_COUNT) {
    error.value = `Puedes adjuntar un máximo de ${MAX_ATTACHMENT_COUNT} archivos.`
    return
  }

  const invalidType = selected.find((file) => !ALLOWED_ATTACHMENT_TYPES.includes(file.type))
  if (invalidType) {
    error.value = `${invalidType.name}: solo se admiten imágenes JPG o PNG y documentos PDF.`
    return
  }

  const invalidSize = selected.find((file) => file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE)
  if (invalidSize) {
    error.value = `${invalidSize.name}: cada archivo debe ocupar como máximo 5 MB.`
    return
  }

  attachments.value.push(...selected.map((file) => ({
    localId: crypto.randomUUID(),
    file,
    status: 'pending',
    error: '',
    uploaded: null
  })))
}

async function uploadOne(item) {
  item.status = 'uploading'
  item.error = ''
  try {
    item.uploaded = await incidents.uploadAttachment({
      incidentId: draft.value.id,
      userId: auth.state.session.user.id,
      file: item.file
    })
    item.status = 'uploaded'
  } catch (caught) {
    item.status = 'failed'
    item.error = caught.message
  }
}

async function publishDraft() {
  submitting.value = true
  error.value = ''
  try {
    await incidents.finalizeIncident(draft.value.id)
    submittedCode.value = draft.value.codigo
    draft.value = null
    form.roomId = ''
    form.description = ''
    form.urgent = false
    attachments.value = []
    emit('created')
  } catch (caught) {
    error.value = caught.message
  } finally {
    submitting.value = false
  }
}

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
    if (!draft.value) {
      draft.value = await incidents.createIncident({
        userId: auth.state.session.user.id,
        type: props.type,
        roomId: form.roomId,
        description: form.description,
        urgent: form.urgent
      })
    }

    if (props.type === 'EQUIPAMIENTO') {
      for (const item of attachments.value.filter((candidate) => candidate.status === 'pending')) {
        await uploadOne(item)
      }
    }

    if (hasFailedUploads.value) {
      error.value = 'La incidencia aún no se ha enviado. Reintenta o quita los archivos que han fallado.'
      return
    }
  } catch (caught) {
    error.value = caught.message
    return
  } finally {
    submitting.value = false
  }

  await publishDraft()
}

async function retryUpload(item) {
  if (!draft.value) return
  error.value = ''
  await uploadOne(item)
  if (hasFailedUploads.value) {
    error.value = 'La incidencia aún no se ha enviado. Reintenta o quita los archivos que han fallado.'
  }
}

async function removeFile(item) {
  item.status = 'removing'
  error.value = ''
  try {
    if (item.uploaded) await incidents.removeAttachment(item.uploaded)
    attachments.value = attachments.value.filter((candidate) => candidate.localId !== item.localId)
  } catch (caught) {
    item.status = item.uploaded ? 'uploaded' : 'failed'
    error.value = caught.message
  }
}

async function cancelDraftAndClose() {
  if (!draft.value) {
    emit('cancel')
    return
  }

  cleaning.value = true
  error.value = ''
  try {
    await incidents.cancelDraft(
      draft.value.id,
      auth.state.session.user.id
    )
    draft.value = null
    emit('cancel')
  } catch (caught) {
    error.value = `No se ha podido cancelar el borrador: ${caught.message}`
  } finally {
    cleaning.value = false
  }
}

onBeforeUnmount(() => {
  if (draft.value) {
    void incidents.cancelDraft(
      draft.value.id,
      auth.state.session.user.id
    )
  }
})
</script>

<template>
  <section class="card overflow-hidden" :aria-labelledby="submittedCode ? 'incident-success-title' : 'new-incident-title'">
    <div v-if="submittedCode" class="flex min-h-96 flex-col items-center justify-center px-5 py-12 text-center sm:px-10">
      <span class="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-4xl font-bold text-emerald-700" aria-hidden="true">✓</span>
      <h2 id="incident-success-title" class="mt-6 text-2xl font-bold text-slate-950">Incidencia enviada correctamente</h2>
      <p class="mt-2 text-lg text-slate-600">El código de seguimiento es <strong>{{ submittedCode }}</strong>.</p>
      <button class="btn-primary mt-7 w-full sm:w-auto" type="button" @click="emit('cancel')">Comunicar otra incidencia</button>
    </div>

    <template v-else>
      <div class="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="eyebrow">Nueva incidencia</p>
            <h2 id="new-incident-title" class="mt-1 text-xl font-bold">{{ type === 'CUENTAS_USUARIO' ? 'Gestión de cuentas de usuario' : 'Incidencias sobre equipamiento' }}</h2>
          </div>
          <button class="btn-ghost shrink-0 self-start" type="button" :disabled="submitting || cleaning" @click="cancelDraftAndClose">{{ cleaning ? 'Cancelando…' : 'Cambiar tipo' }}</button>
        </div>
      </div>

      <form class="space-y-5 p-5 sm:p-6" @submit.prevent="submit">
        <div v-if="type === 'EQUIPAMIENTO'">
          <label class="label" for="incident-room">Estancia</label>
          <RoomCombobox v-model="form.roomId" :rooms="rooms" :loading="loadingRooms" :disabled="Boolean(draft)" />
        </div>

        <div>
          <label class="label" for="incident-description">Descripción</label>
          <textarea id="incident-description" v-model="form.description" class="field min-h-36 resize-y" maxlength="4000" required :disabled="Boolean(draft)" :placeholder="type === 'CUENTAS_USUARIO' ? 'Explica el problema con la cuenta de usuario.' : 'Ej.: El ordenador del profesor no enciende.'"></textarea>
          <p class="mt-1 text-right text-xs text-slate-400">{{ form.description.length }}/4000</p>
        </div>

        <section v-if="type === 'EQUIPAMIENTO'" aria-labelledby="attachments-title">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="attachments-title" class="font-semibold text-slate-900">Archivos adjuntos <span class="font-normal text-slate-500">(opcional)</span></h3>
              <p class="mt-1 text-sm text-slate-600">Hasta 3 archivos JPG, PNG o PDF de 5 MB cada uno.</p>
            </div>
            <button class="btn-secondary" type="button" :disabled="attachments.length >= MAX_ATTACHMENT_COUNT || submitting || Boolean(draft)" @click="fileInput.click()">Añadir archivos</button>
            <input ref="fileInput" class="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" multiple @change="selectFiles" />
          </div>

          <ul v-if="attachments.length" class="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
            <li v-for="item in attachments" :key="item.localId" class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-800">{{ item.file.name }}</p>
                <p class="text-sm text-slate-500">
                  {{ formatSize(item.file.size) }}
                  <span v-if="item.status === 'uploading'"> · Subiendo…</span>
                  <span v-else-if="item.status === 'uploaded'" class="text-emerald-700"> · Subido</span>
                  <span v-else-if="item.status === 'failed'" class="text-rose-700"> · Error al subir</span>
                </p>
                <p v-if="item.error" class="mt-1 text-sm text-rose-700">{{ item.error }}</p>
              </div>
              <div class="flex shrink-0 gap-2">
                <button v-if="item.status === 'failed'" class="btn-secondary" type="button" :disabled="submitting" @click="retryUpload(item)">Reintentar</button>
                <button class="btn-ghost text-rose-700" type="button" :disabled="['uploading', 'removing'].includes(item.status) || submitting" @click="removeFile(item)">{{ item.status === 'removing' ? 'Quitando…' : 'Quitar' }}</button>
              </div>
            </li>
          </ul>
        </section>

        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <input v-model="form.urgent" type="checkbox" class="mt-1 size-4 accent-red-700" :disabled="Boolean(draft)" />
          <span><span class="block font-semibold text-slate-900">¿La incidencia es urgente?</span><span class="mt-0.5 block text-sm text-slate-600">Márcala solo si impide continuar una actividad importante.</span></span>
        </label>

        <div v-if="error" class="notice-error" role="alert">{{ error }}</div>

        <div class="flex justify-end">
          <button class="btn-primary w-full sm:w-auto" type="submit" :disabled="submitting || cleaning || hasPendingUploads || hasFailedUploads || (type === 'EQUIPAMIENTO' && loadingRooms)">{{ submitting ? 'Enviando…' : draft ? 'Finalizar incidencia' : 'Enviar incidencia' }}</button>
        </div>
      </form>
    </template>
  </section>
</template>
