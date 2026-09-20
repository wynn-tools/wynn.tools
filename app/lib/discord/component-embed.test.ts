import type { BuildMeta } from '~/lib/build/build-meta'
import type { ItemMeta } from '~/lib/items/item-meta'
import type { StockCreation } from '~/lib/types/stock'
import { describe, expect, it } from 'vitest'
import { buildEmbed, itemEmbed, stockEmbed } from './component-embed'

const ALLOWED_TYPES = new Set([1, 2, 9, 10, 11, 12, 14, 17])

function walk(node: unknown, out: number[] = []): number[] {
  if (Array.isArray(node)) {
    node.forEach(n => walk(n, out))
  }
  else if (node && typeof node === 'object') {
    const rec = node as Record<string, unknown>
    if (typeof rec.type === 'number')
      out.push(rec.type)
    Object.values(rec).forEach(v => walk(v, out))
  }
  return out
}

function expectValidEmbed(embed: { type: number }) {
  expect(embed.type).toBe(17)
  const types = walk(embed)
  expect(types.length).toBeLessThanOrEqual(40)
  for (const t of types)
    expect(ALLOWED_TYPES.has(t)).toBe(true)
}

const item = {
  name: 'Warp',
  tier: 'Mythic',
  subType: 'Wand',
  combatLevel: 95,
  classReq: 'Mage',
  color: '#c80db1',
  icon: 'https://cdn.wynn.tools/nextgen/itemguide/3.3/wand.air3.webp',
  attackSpeed: 'Super Fast',
  dps: 1234,
  damageLines: [{ iconUrl: null, text: '10-20' }, { iconUrl: 'x', text: '100-200' }],
  health: null,
  defenceLines: [],
  sp: [{ skill: 'agility', active: true, value: 110 }, { skill: 'strength', active: false, value: 0 }],
  idRows: [{ label: 'Walk Speed', left: '+120%', right: '+200%', color: '' }, { label: 'Health', left: '', right: '-1000', color: '' }],
  majorIds: [{ name: 'Sorcery', text: 'Spells may cast twice' }],
} as unknown as ItemMeta

const build = {
  name: 'Glass Cannon',
  level: 106,
  className: 'Mage',
  weaponIconUrl: 'https://cdn.wynn.tools/nextgen/items/v2/sprites/wand.png',
  items: [{ slot: 'helmet', name: 'Morph-Stardust' }, { slot: 'ring', name: '—' }, { slot: 'weapon', name: 'Warp', powders: 'a6a6a6' }],
  totalHp: 12000,
  ehp: 45000.6,
  combatLines: [{ name: 'Meteor', dps: 90000.4 }],
  owner: 'Scyu',
  tags: ['glass-cannon'],
} as unknown as BuildMeta

const stock = {
  title: 'Raid HUD',
  description: 'A raid overlay',
  kind: 'infobox',
  category: 'raid',
  classes: ['mage'],
  author: { username: 'scyu', displayName: null },
  media: [{ order: 1, blobSha256: 'bbb', caption: 'second' }, { order: 0, blobSha256: 'aaa', caption: null }],
} as unknown as StockCreation

describe('itemEmbed', () => {
  it('renders the item as a thumbnail section, stat text and a link button', () => {
    const e = itemEmbed(item, 'https://wynn.tools/items/warp')
    expectValidEmbed(e)
    expect(e.accent_color).toBe(0xC80DB1)
    const section = e.components[0] as { type: number, components: { content: string }[], accessory: { media: { url: string } } }
    expect(section.type).toBe(9)
    expect(section.accessory.media.url).toBe(item.icon)
    expect(section.components[0]!.content).toContain('# Warp')
    expect(section.components[0]!.content).toContain('Req: Agility 110')
    const body = (e.components[1] as { content: string }).content
    expect(body).toContain('+120% to +200% Walk Speed')
    expect(body).toContain('-1000 Health')
    expect(body).toContain('**Sorcery:**')
    expect(e.components.at(-1)).toEqual({
      type: 1,
      components: [{ type: 2, style: 5, label: 'View on wynn.tools', url: 'https://wynn.tools/items/warp' }],
    })
  })
})

describe('buildEmbed', () => {
  it('lists equipped items, skips empty slots, and adds a fork button when given', () => {
    const e = buildEmbed(build, 'some notes', 'https://wynn.tools/b/1', 'https://wynn.tools/builder/abc')
    expectValidEmbed(e)
    expect(e.accent_color).toBe(0x4E9BE0)
    const all = JSON.stringify(e)
    expect(all).toContain('# Glass Cannon')
    expect(all).toContain('- Warp `a6a6a6`')
    expect(all).not.toContain('- —')
    expect(all).toContain('**EHP** 45001')
    expect(all).toContain('**Meteor** 90000 DPS')
    const row = e.components.at(-1) as { components: { label: string }[] }
    expect(row.components.map(b => b.label)).toEqual(['Open build', 'Fork in builder'])
  })

  it('falls back to a level/class title without a name or fork url', () => {
    const e = buildEmbed({ ...build, name: null }, '', 'https://wynn.tools/builder/abc')
    expect(JSON.stringify(e)).toContain('# Level 106 Mage')
    const row = e.components.at(-1) as { components: { label: string }[] }
    expect(row.components).toHaveLength(1)
  })
})

describe('stockEmbed', () => {
  it('adds a media gallery in display order using the blob resolver', () => {
    const e = stockEmbed(stock, 'https://wynn.tools/stock/raid-hud', sha => `https://api.wynn.tools/v1/stock/blobs/${sha}`)
    expectValidEmbed(e)
    expect(e.accent_color).toBe(0x4D9AFF)
    const gallery = e.components[1] as { type: number, items: { media: { url: string }, description?: string }[] }
    expect(gallery.type).toBe(12)
    expect(gallery.items.map(i => i.media.url)).toEqual([
      'https://api.wynn.tools/v1/stock/blobs/aaa',
      'https://api.wynn.tools/v1/stock/blobs/bbb',
    ])
    expect(gallery.items[0]).not.toHaveProperty('description')
    expect(gallery.items[1]!.description).toBe('second')
  })

  it('omits the gallery when there is no media', () => {
    const e = stockEmbed({ ...stock, media: [] }, 'u', s => s)
    expect(e.components.map(c => c.type)).toEqual([10, 14, 1])
  })
})
