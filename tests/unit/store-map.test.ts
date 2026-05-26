import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMapStore } from '~/stores/map'

describe('useMapStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('defaults to Detlas main 2d', () => {
    const s = useMapStore()
    expect(s.world).toBe('main')
    expect(s.center).toEqual({ x: 477, z: -1590 })
    expect(s.zoom).toBe(4)
    expect(s.focus).toBeNull()
    expect(s.fs).toBe(false)
    expect(s.lootrun).toBeNull()
    expect(s.enabledCategories.length).toBeGreaterThan(0)
  })

  it('toggleCategory adds/removes', () => {
    const s = useMapStore()
    const id = 'wynntils:service:blacksmith'
    expect(s.enabledCategories).not.toContain(id)
    s.toggleCategory(id)
    expect(s.enabledCategories).toContain(id)
    s.toggleCategory(id)
    expect(s.enabledCategories).not.toContain(id)
  })

  it('hydrate replaces state', () => {
    const s = useMapStore()
    s.hydrate({
      world: 'void',
      center: { x: 13900, z: -4000 },
      zoom: 2,
      cats: ['wynntils:content:cave'],
      focus: 'outer-void',
      fs: true,
    })
    expect(s.world).toBe('void')
    expect(s.center.x).toBe(13900)
    expect(s.focus).toBe('outer-void')
    expect(s.fs).toBe(true)
  })
})
