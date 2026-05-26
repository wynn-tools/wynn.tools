import type { ShareView, WorldPosition } from '~/types/map'
import { describe, expectTypeOf, it } from 'vitest'

describe('map types', () => {
  it('worldPosition has x/y/z', () => {
    const p: WorldPosition = { x: 0, y: 0, z: 0 }
    expectTypeOf(p).toEqualTypeOf<WorldPosition>()
  })

  it('shareView roundtrips a default view', () => {
    const v: ShareView = {
      world: 'main',
      layer: '2d',
      center: { x: 477, z: -1590 },
      zoom: 4,
      cats: [],
      focus: null,
      fs: false,
    }
    expectTypeOf(v).toEqualTypeOf<ShareView>()
  })
})
