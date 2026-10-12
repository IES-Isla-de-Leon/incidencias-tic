import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('presenta un estado con texto legible', () => {
    const wrapper = mount(StatusBadge, { props: { value: 'EN_PROGRESO' } })
    expect(wrapper.text()).toBe('En progreso')
    expect(wrapper.classes()).toContain('bg-sky-100')
  })

  it('presenta una prioridad', () => {
    const wrapper = mount(StatusBadge, { props: { value: 'URGENTE', type: 'priority' } })
    expect(wrapper.text()).toBe('Urgente')
  })
})

