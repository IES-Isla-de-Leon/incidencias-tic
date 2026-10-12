import { describe, expect, it } from 'vitest'
import {
  formatDate,
  friendlyError,
  isCorporateEmail,
  oauthRedirectUrl,
  priorityLabel,
  statusLabel
} from './formatters.js'

describe('formatters', () => {
  it('formatea las etiquetas del dominio', () => {
    expect(statusLabel('EN_PROGRESO')).toBe('En progreso')
    expect(priorityLabel('URGENTE')).toBe('Urgente')
  })

  it('muestra las fechas en la zona de Madrid', () => {
    expect(formatDate('2026-01-15T12:00:00Z')).toContain('13:00')
  })

  it('elimina query y hash de la redirección OAuth sin perder la subcarpeta', () => {
    expect(oauthRedirectUrl('https://example.test/proyecto/app/?code=1#/admin'))
      .toBe('https://example.test/proyecto/app/')
  })

  it('acepta solo correos del dominio exacto', () => {
    expect(isCorporateEmail('Docente@IESISLADELEON.ES')).toBe(true)
    expect(isCorporateEmail('docente@otroiesisladeleon.es')).toBe(false)
    expect(isCorporateEmail('docente@iesisladeleon.es.example.com')).toBe(false)
  })

  it('traduce errores comunes de permisos', () => {
    expect(friendlyError({ message: 'new row violates row-level security policy' }))
      .toBe('No tienes permiso para realizar esta acción.')
  })
})

