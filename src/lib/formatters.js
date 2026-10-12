import { INCIDENT_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from './constants.js'

export function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid'
  }).format(new Date(value))
}

export function statusLabel(value) {
  return STATUS_LABELS[value] ?? value ?? ''
}

export function priorityLabel(value) {
  return PRIORITY_LABELS[value] ?? value ?? ''
}

export function incidentTypeLabel(value) {
  return INCIDENT_TYPE_LABELS[value] ?? value ?? ''
}

export function friendlyError(error) {
  const message = error?.message ?? String(error ?? '')
  const normalized = message.toLowerCase()

  if (normalized.includes('duplicate key') || normalized.includes('unique constraint')) {
    return 'Ya existe un registro con esos datos.'
  }
  if (normalized.includes('row-level security') || normalized.includes('permission denied')) {
    return 'No tienes permiso para realizar esta acción.'
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.'
  }
  return message || 'Ha ocurrido un error inesperado.'
}

export function oauthRedirectUrl(currentUrl = window.location.href) {
  const url = new URL(currentUrl)
  url.search = ''
  url.hash = ''
  return url.href
}

export function isCorporateEmail(email, domain = 'iesisladeleon.es') {
  return String(email ?? '').toLowerCase().endsWith(`@${domain.toLowerCase()}`)
}

