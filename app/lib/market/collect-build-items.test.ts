import { describe, expect, it } from 'vitest'
import { POWDER_ID_BY_NAME } from '~/lib/data/powder-constants'
import { collectBuildItems } from './collect-build-items'

describe('collectBuildItems', () => {
  it('emits tradeable gear entries keyed by item name', () => {
    const out = collectBuildItems({
      gear: [{ label: 'Helmet', name: 'Cumulonimbus', crafted: false }, { label: 'Weapon', name: 'Divzer', crafted: false }],
      powders: [],
    })
    expect(out).toEqual([
      { label: 'Helmet', name: 'Cumulonimbus', tier: null, count: 1, tradeable: true },
      { label: 'Weapon', name: 'Divzer', tier: null, count: 1, tradeable: true },
    ])
  })

  it('flags crafted gear as untradeable', () => {
    const out = collectBuildItems({ gear: [{ label: 'Weapon', name: 'My Craft', crafted: true }], powders: [] })
    expect(out[0]!.tradeable).toBe(false)
  })

  it('groups powders by element+tier with counts', () => {
    const t6 = POWDER_ID_BY_NAME.get('t6')!
    const out = collectBuildItems({ gear: [], powders: [t6, t6] })
    expect(out).toEqual([
      { label: 'Thunder Powder VI', name: 'Thunder Powder', tier: 6, count: 2, tradeable: true },
    ])
  })
})
