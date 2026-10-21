<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { PRIORITIES, STATUSES } from '../lib/constants.js'
import { formatDate, incidentTypeLabel, priorityLabel, statusLabel } from '../lib/formatters.js'
import { useAuth } from '../composables/useAuth.js'
import { useIncidents } from '../composables/useIncidents.js'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  incidentId: { type: String, default: '' },
  admin: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'saved'])
const auth = useAuth()
const incidents = useIncidents()
const detail = ref(null)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const attachmentAction = ref('')
const attachmentError = ref('')
const confirmingAttachmentDelete = ref('')
const quickStatus = ref('')
const confirmingDelete = ref(false)
const error = ref('')
const deleteError = ref('')
const message = ref('')
const priority = ref('NORMAL')
const status = ref('ABIERTA')
const observation = ref('')
const closeButton = ref(null)

async function load() {
  if (!props.incidentId) return
  loading.value = true
  error.value = ''

  try {
    detail.value = await incidents.loadIncidentDetail(props.incidentId)
    priority.value = detail.value.prioridad
    status.value = detail.value.estado
    observation.value = ''
    confirmingDelete.value = false
    confirmingAttachmentDelete.value = ''
    deleteError.value = ''
    await nextTick()
    closeButton.value?.focus()
  } catch (caught) {
    error.value = caught.message
  } finally {
    loading.value = false
  }
}

async function removeIncident() {
  deleting.value = true
  deleteError.value = ''

  try {
    await incidents.deleteIncident(detail.value)
    emit('saved')
    emit('close')
  } catch (caught) {
    deleteError.value = caught.message
  } finally {
    deleting.value = false
  }
}

function formatFileSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function downloadAttachment(attachment) {
  attachmentAction.value = `download-${attachment.id}`
  attachmentError.value = ''
  try {
    await incidents.downloadAttachment(attachment)
  } catch (caught) {
    attachmentError.value = caught.message
  } finally {
    attachmentAction.value = ''
  }
}

async function removeAttachment(attachment) {
  attachmentAction.value = `delete-${attachment.id}`
  attachmentError.value = ''
  try {
    await incidents.removeAdminAttachment(attachment)
    detail.value.adjuntos_incidencia = detail.value.adjuntos_incidencia.filter((item) => item.id !== attachment.id)
    confirmingAttachmentDelete.value = ''
  } catch (caught) {
    attachmentError.value = caught.message
  } finally {
    attachmentAction.value = ''
  }
}

async function save() {
  return saveWithStatus(status.value)
}

async function saveWithStatus(nextStatus, quickAction = '') {
  saving.value = true
  quickStatus.value = quickAction
  message.value = ''
  error.value = ''
  status.value = nextStatus

  try {
    await incidents.updateIncident({
      incident: detail.value,
      priority: priority.value,
      status: status.value,
      observation: observation.value,
      userId: auth.state.session.user.id
    })
    message.value = 'Cambios guardados.'
    emit('saved')
    await load()
  } catch (caught) {
    error.value = caught.message
  } finally {
    saving.value = false
    quickStatus.value = ''
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

watch(() => props.incidentId, (id) => {
  document.body.style.overflow = id ? 'hidden' : ''
  window.removeEventListener('keydown', onKeydown)
  if (id) {
    window.addEventListener('keydown', onKeydown)
    load()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="incidentId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6"
      role="presentation"
      @mousedown.self="$emit('close')"
    >
      <section
        class="max-h-[calc(100vh-24px)] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="detail ? 'incident-dialog-title' : undefined"
      >
        <header class="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p class="eyebrow">Detalle</p>
            <h2 id="incident-dialog-title" class="mt-1 text-2xl font-bold">
              {{ detail?.codigo || 'Incidencia' }}
            </h2>
          </div>
          <button ref="closeButton" class="btn-ghost text-xl" type="button" aria-label="Cerrar" @click="$emit('close')">
            ×
          </button>
        </header>

        <div v-if="loading" class="p-10 text-center text-slate-500" role="status">Cargando detalle…</div>
        <div v-else-if="error && !detail" class="p-6"><div class="notice-error">{{ error }}</div></div>

        <template v-else-if="detail">
          <section class="p-5 sm:p-6">
            <div class="flex flex-wrap gap-2">
              <StatusBadge :value="detail.prioridad" type="priority" />
              <StatusBadge :value="detail.estado" />
            </div>
            <p class="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-slate-800">{{ detail.descripcion }}</p>
            <dl class="mt-5 grid gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
              <div><dt class="font-semibold text-slate-800">Tipo</dt><dd class="text-slate-600">{{ incidentTypeLabel(detail.tipo) }}</dd></div>
              <div v-if="detail.estancias"><dt class="font-semibold text-slate-800">Estancia</dt><dd class="text-slate-600">{{ detail.estancias.nombre }}</dd></div>
              <div v-if="detail.estancias"><dt class="font-semibold text-slate-800">Ubicación</dt><dd class="text-slate-600">{{ detail.estancias.ubicacion }}</dd></div>
              <div><dt class="font-semibold text-slate-800">Creada</dt><dd class="text-slate-600">{{ formatDate(detail.fecha_creacion) }}</dd></div>
              <div v-if="admin && detail.usuarios"><dt class="font-semibold text-slate-800">Comunicada por</dt><dd class="text-slate-600">{{ detail.usuarios.nombre }}</dd></div>
            </dl>
          </section>

          <section v-if="detail.adjuntos_incidencia?.length" class="border-t border-slate-200 p-5 sm:p-6">
            <h3 class="text-lg font-bold">Archivos adjuntos</h3>
            <p class="mt-1 text-sm text-slate-600">{{ detail.adjuntos_incidencia.length }} {{ detail.adjuntos_incidencia.length === 1 ? 'archivo' : 'archivos' }}</p>
            <div v-if="attachmentError" class="mt-4 notice-error" role="alert">{{ attachmentError }}</div>
            <ul class="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
              <li v-for="attachment in detail.adjuntos_incidencia" :key="attachment.id" class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-800">{{ attachment.nombre_original }}</p>
                  <p class="text-sm text-slate-500">{{ formatFileSize(attachment.tamano_bytes) }}</p>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button class="btn-secondary" type="button" :disabled="Boolean(attachmentAction)" data-test="download-attachment" @click="downloadAttachment(attachment)">
                    {{ attachmentAction === `download-${attachment.id}` ? 'Descargando…' : 'Descargar' }}
                  </button>
                  <template v-if="admin">
                    <button v-if="confirmingAttachmentDelete !== attachment.id" class="btn-ghost text-rose-700" type="button" :disabled="Boolean(attachmentAction)" data-test="delete-attachment" @click="confirmingAttachmentDelete = attachment.id">Eliminar</button>
                    <template v-else>
                      <button class="btn-ghost" type="button" :disabled="Boolean(attachmentAction)" @click="confirmingAttachmentDelete = ''">Cancelar</button>
                      <button class="inline-flex min-h-10 items-center justify-center rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" type="button" :disabled="Boolean(attachmentAction)" data-test="confirm-delete-attachment" @click="removeAttachment(attachment)">
                        {{ attachmentAction === `delete-${attachment.id}` ? 'Eliminando…' : 'Confirmar' }}
                      </button>
                    </template>
                  </template>
                </div>
              </li>
            </ul>
          </section>

          <section class="border-t border-slate-200 p-5 sm:p-6">
            <h3 class="text-lg font-bold">Seguimiento</h3>
            <div v-if="detail.updates.length" class="mt-5 space-y-5">
              <article v-for="update in detail.updates" :key="update.id" class="border-l-2 border-isla-600 pl-4">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold">{{ update.estado ? statusLabel(update.estado) : 'Actualización' }}</p>
                  <time class="text-sm text-slate-500">{{ formatDate(update.fecha) }}</time>
                </div>
                <p v-if="update.observacion" class="mt-1 whitespace-pre-wrap text-slate-700">{{ update.observacion }}</p>
                <p v-if="update.usuarios?.nombre" class="mt-1 text-sm text-slate-500">{{ update.usuarios.nombre }}</p>
              </article>
            </div>
            <p v-else class="mt-4 text-slate-500">Todavía no hay actualizaciones.</p>
          </section>

          <section v-if="admin" class="border-t border-slate-200 p-5 sm:p-6">
            <h3 class="text-lg font-bold">Actualizar incidencia</h3>
            <form class="mt-4 space-y-4" @submit.prevent="save">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="detail-priority">Prioridad</label>
                  <select id="detail-priority" v-model="priority" class="field">
                    <option v-for="item in PRIORITIES" :key="item" :value="item">{{ priorityLabel(item) }}</option>
                  </select>
                </div>
                <div>
                  <label class="label" for="detail-status">Estado</label>
                  <select id="detail-status" v-model="status" class="field">
                    <option v-for="item in STATUSES" :key="item" :value="item">{{ statusLabel(item) }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="label" for="detail-observation">Observación</label>
                <textarea id="detail-observation" v-model="observation" class="field min-h-28 resize-y" maxlength="4000" placeholder="Opcional"></textarea>
              </div>
              <p class="text-sm text-slate-500">Los cambios de estado quedan registrados en el seguimiento.</p>
              <div v-if="message" class="notice-success" role="status">{{ message }}</div>
              <div v-if="error" class="notice-error" role="alert">{{ error }}</div>
              <div class="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex flex-col gap-2 sm:flex-row sm:border-r sm:border-slate-200 sm:pr-4">
                  <button
                    v-if="detail.estado === 'ABIERTA'"
                    class="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-isla-300 bg-isla-100 px-4 py-2.5 font-semibold text-isla-800 transition hover:bg-isla-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    type="button"
                    :disabled="saving || deleting"
                    data-test="start-progress"
                    @click="saveWithStatus('EN_PROGRESO', 'EN_PROGRESO')"
                  >
                    {{ quickStatus === 'EN_PROGRESO' ? 'Iniciando…' : 'Iniciar trabajo' }}
                  </button>
                  <button
                    class="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    type="button"
                    :disabled="saving || deleting || detail.estado === 'RESUELTA'"
                    data-test="resolve"
                    @click="saveWithStatus('RESUELTA', 'RESUELTA')"
                  >
                    {{ quickStatus === 'RESUELTA' ? 'Resolviendo…' : detail.estado === 'RESUELTA' ? 'Resuelta' : 'Resolver' }}
                  </button>
                </div>
                <button class="btn-primary w-full sm:w-auto" type="submit" :disabled="saving || deleting" data-test="save-update">
                  {{ saving && !quickStatus ? 'Guardando…' : 'Guardar actualización' }}
                </button>
              </div>
            </form>
          </section>

          <section v-if="admin" class="border-t border-slate-200 p-5 sm:p-6">
            <div v-if="!confirmingDelete" class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="font-bold text-slate-900">Eliminar incidencia</h3>
                <p class="mt-1 text-sm text-slate-600">Esta acción elimina también todo su historial y sus archivos adjuntos.</p>
              </div>
              <button
                class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="saving"
                @click="confirmingDelete = true; deleteError = ''"
              >
                Eliminar incidencia
              </button>
            </div>

            <div v-else class="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <h3 class="font-bold text-rose-950">¿Eliminar {{ detail.codigo }} definitivamente?</h3>
              <p class="mt-1 text-sm text-rose-800">No se podrá recuperar la incidencia, su historial ni sus archivos.</p>
              <div v-if="deleteError" class="mt-4 notice-error" role="alert">{{ deleteError }}</div>
              <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button class="btn-secondary" type="button" :disabled="deleting" @click="confirmingDelete = false">Cancelar</button>
                <button
                  class="inline-flex min-h-11 items-center justify-center rounded-lg bg-rose-700 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  :disabled="deleting"
                  @click="removeIncident"
                >
                  {{ deleting ? 'Eliminando…' : 'Sí, eliminar definitivamente' }}
                </button>
              </div>
            </div>
          </section>
        </template>
      </section>
    </div>
  </Teleport>
</template>

