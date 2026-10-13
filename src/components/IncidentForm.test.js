import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IncidentForm from './IncidentForm.vue'

const { createIncident } = vi.hoisted(() => ({
  createIncident: vi.fn()
}))

vi.mock('../composables/useAuth.js', () => ({
  useAuth: () => ({ state: { session: { user: { id: 'usuario-1' } } } })
}))

vi.mock('../composables/useIncidents.js', () => ({
  useIncidents: () => ({ createIncident })
}))

const rooms = [{ id: 'aula-1', nombre: 'Aula 1', ubicacion: 'Planta baja' }]

describe('IncidentForm', () => {
  beforeEach(() => {
    createIncident.mockReset()
    createIncident.mockResolvedValue({ codigo: 'INC-2026-0001' })
  })

  it('pide estancia para una incidencia de equipamiento', () => {
    const wrapper = mount(IncidentForm, {
      props: { type: 'EQUIPAMIENTO', rooms }
    })

    expect(wrapper.find('#incident-room').exists()).toBe(true)
    expect(wrapper.text()).toContain('Incidencias sobre equipamiento')
  })

  it('crea una incidencia de cuentas sin pedir estancia', async () => {
    const wrapper = mount(IncidentForm, {
      props: { type: 'CUENTAS_USUARIO', rooms }
    })

    expect(wrapper.find('#incident-room').exists()).toBe(false)
    await wrapper.find('#incident-description').setValue('No puedo iniciar sesión.')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createIncident).toHaveBeenCalledWith({
      userId: 'usuario-1',
      type: 'CUENTAS_USUARIO',
      roomId: '',
      description: 'No puedo iniciar sesión.',
      urgent: false
    })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Incidencia enviada correctamente')
    expect(wrapper.text()).toContain('INC-2026-0001')
    expect(wrapper.emitted('created')).toHaveLength(1)

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
