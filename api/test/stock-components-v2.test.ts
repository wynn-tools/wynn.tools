import { describe, expect, it } from 'vitest'
import {
  buildCreationCard,
  buildVersionReply,
} from '../src/services/discord-components-v2'

describe('components V2 builder', () => {
  it('builds a creation card', () => {
    const p = buildCreationCard({
      title: 'Curious Kirby',
      description: 'Cute Kirby peeking out',
      kindBadge: 'INFOBOX',
      classes: ['Mage'],
      categoryBadge: 'QOL',
      authorMention: '<@123>',
      linkUrl: 'https://wynn.tools/stock/curious-kirby',
      accentColor: 0x4D9AFF,
    })
    expect(p.flags).toBe(1 << 15)
    const container = p.components[0]
    expect(container.type).toBe(17)
    expect(container.accent_color).toBe(0x4D9AFF)
    expect(JSON.stringify(container)).toContain('Curious Kirby')
    expect(JSON.stringify(container)).toContain(
      'https://wynn.tools/stock/curious-kirby',
    )
  })

  it('builds a version reply', () => {
    const p = buildVersionReply({
      versionLabel: 'v1.2',
      changelog: 'Smaller pack',
      linkUrl: 'https://wynn.tools/stock/k/v/2',
      accentColor: 0x4D9AFF,
    })
    expect(JSON.stringify(p)).toContain('v1.2')
    expect(JSON.stringify(p)).toContain('Smaller pack')
  })
})
