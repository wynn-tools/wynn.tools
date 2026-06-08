import { describe, expect, it, vi } from 'vitest'
import { createPoolService } from '../src/services/wynndle-pool'

const ITEMS = {
  items: [
    {
      id: 1,
      name: 'PlainHelmet',
      displayName: 'Plain Helmet',
      type: 'armour',
      subType: 'helmet',
      tier: 'Common',
      elements: [],
      requirements: { level: 1 },
      base: { health: 5 },
      powderSlots: 0,
    },
    {
      id: 2,
      name: 'GreatHelmet',
      displayName: 'Great Helmet',
      type: 'armour',
      subType: 'helmet',
      tier: 'Legendary',
      elements: ['fire'],
      requirements: { level: 80, strength: 20 },
      base: { health: 1000, fireDefence: 50 },
      powderSlots: 2,
    },
    {
      id: 3,
      name: 'Fission',
      displayName: 'Fission',
      type: 'weapon',
      subType: 'bow',
      attackSpeed: 'fast',
      tier: 'Mythic',
      elements: ['fire'],
      requirements: { level: 95, classRequirement: 'archer' },
      base: {
        damage: { min: 10, max: 20, raw: 15 },
        fireDamage: { min: 100, max: 200, raw: 150 },
      },
      averageDps: 9000,
      powderSlots: 3,
    },
    {
      id: 4,
      name: 'CharmIgnored',
      displayName: 'Charm Ignored',
      type: 'accessory',
      subType: 'ring',
      tier: 'Legendary',
      requirements: { level: 90 },
      base: {},
    },
  ],
}

describe('wynndle pool service', () => {
  it('excludes common, splits by mode, adapts shapes', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ITEMS), { status: 200 }))
    const svc = createPoolService({ cdnBase: 'https://cdn.test/', fetch: fetchMock as unknown as typeof fetch })
    const weapons = await svc.getPool('weapon', '2.2.0.31')
    const armor = await svc.getPool('armor', '2.2.0.31')
    expect(weapons.map(i => i.name)).toEqual(['Fission'])
    expect(weapons[0].class).toBe('Archer')
    expect(weapons[0].speed).toBe('Fast')
    expect(weapons[0].rarity).toBe('Mythic')
    expect(weapons[0].dps).toBe(9000)
    expect(weapons[0].elements).toContain('fire')
    expect(armor.map(i => i.name)).toEqual(['GreatHelmet'])
    expect(armor[0].armorType).toBe('helmet')
    expect(armor[0].health).toBe(1000)
    expect(armor[0].skillReqs).toContain('strength')
    expect(armor[0].elements).toContain('fire')
  })
  it('caches by version', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ITEMS), { status: 200 }))
    const svc = createPoolService({ cdnBase: 'https://cdn.test/', fetch: fetchMock as unknown as typeof fetch })
    await svc.getPool('weapon', '2.2.0.31')
    await svc.getPool('armor', '2.2.0.31')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
