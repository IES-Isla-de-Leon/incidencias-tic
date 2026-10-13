import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import IncidentDetailModal from './IncidentDetailModal.vue'

const { loadIncidentDetail, updateIncident, deleteIncident } = vi.hoisted(() => ({
  loadIncidentDetail: vi.fn(),
  updateIncident: vi.fn(),
  deleteIncident: vi.fn()
}))

vi.mock('../composables/useAuth.js', () => ({
  useAuth: () => ({ state: { session: { user: { id: 'admin-1' } } } })
}))

vi.mock('../composables/useIncidents.js', () => ({
  useIncidents: () => ({ loadIncidentDetail, updateIncident, deleteIncident })
}))

function incident(overrides = {}) {
  return {
    id: 'incident-1',
    codigo: 'INC-2026-0001',
    fecha_creacion: '2026-10-14T10:00:00Z',
    descripcion: 'El equipo no enciende.',
    prioridad: 'NORMAL',
    estado: 'ABIERTA',
    tipo: 'EQUIPAMIENTO',
    creada_por: 'usuario-1',
    estancias: { nombre: 'Aula 1', ubicacion: 'Planta baja' },
    usuarios: { nombre: 'Usuario de prueba', email: 'usuario@iesisladeleon.es' },
    updates: [],
    ...overrides
  }
}

function mountModal() {
  return mount(IncidentDetailModal, {
    props: { incidentId: 'incident-1', admin: true },
    global: { stubs: { teleport: true } }
  })
}

describe('IncidentDetailModal', () => {
  beforeEach(() => {
    loadIncidentDetail.mockReset()
    updateIncident.mockReset()
    deleteIncident.mockReset()
    updateIncident.mockResolvedValue()
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('permite pasar rápidamente una incidencia abierta a en progreso', async () => {
    loadIncidentDetail.mockResolvedValue(incident())
    const wrapper = mountModal()
    await flushPromises()

    expect(wrapper.get('[data-test="start-progress"]').text()).toBe('Iniciar trabajo')
    expect(wrapper.find('[data-test="resolve"]').exists()).toBe(true)

    await wrapper.get('[data-test="start-progress"]').trigger('click')
    await flushPromises()

    expect(updateIncident).toHaveBeenCalledWith(expect.objectContaining({
      status: 'EN_PROGRESO',
      userId: 'admin-1'
    }))
  })

  it('mantiene resolver para una incidencia en progreso y oculta la otra acción rápida', async () => {
    loadIncidentDetail.mockResolvedValue(incident({ estado: 'EN_PROGRESO' }))
    const wrapper = mountModal()
    await flushPromises()

    expect(wrapper.find('[data-test="start-progress"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="resolve"]').text()).toBe('Resolver')

    await wrapper.get('[data-test="resolve"]').trigger('click')
    await flushPromises()

    expect(updateIncident).toHaveBeenCalledWith(expect.objectContaining({ status: 'RESUELTA' }))
  })
})
