import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoomCombobox from './RoomCombobox.vue'

const rooms = [
  { id: 'aula-1', nombre: 'Aula 1', ubicacion: 'Edif. principal, pl. baja' },
  { id: 'direccion', nombre: 'Dirección', ubicacion: 'Edif. principal, pl. 1' }
]

describe('RoomCombobox', () => {
  it('muestra el nombre y la ubicación y permite buscar sin tildes', async () => {
    const wrapper = mount(RoomCombobox, {
      attachTo: document.body,
      props: { modelValue: '', rooms }
    })

    await wrapper.find('#incident-room').trigger('click')
    expect(wrapper.text()).toContain('Aula 1')
    expect(wrapper.text()).toContain('Edif. principal, pl. baja')

    const input = wrapper.find('#incident-room')
    await input.setValue('direccion')
    await input.trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('Dirección')
    expect(wrapper.text()).not.toContain('Aula 1')
    wrapper.unmount()
  })

  it('emite el identificador de la estancia seleccionada', async () => {
    const wrapper = mount(RoomCombobox, {
      attachTo: document.body,
      props: { modelValue: '', rooms }
    })

    const input = wrapper.find('#incident-room')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['aula-1'])
    wrapper.unmount()
  })
})
