import type { ChangelogView } from '~/lib/data/changelog/types'
import { describe, expect, it } from 'vitest'
import { itemHistory } from './history'

function view(to: string, items: ChangelogView['items']): ChangelogView {
  return { to, note: null, items, tomes: null, aspects: null, atree: null, isEmpty: false }
}

describe('itemHistory', () => {
  it('detects added / removed / modified across versions newest-first', () => {
    const logs: ChangelogView[] = [
      view('2.2.0', { added: [], removed: [], changed: [{ name: 'Idol', fields: [{ label: 'Spell Damage', unit: '%', from: 10, to: 20, direction: 'up', good: true }] }] }),
      view('2.1.0', { added: ['Idol'], removed: [], changed: [] }),
      view('2.0.5', { added: [], removed: [], changed: [] }),
    ]
    const h = itemHistory('Idol', logs)
    expect(h.map(e => [e.version, e.kind])).toEqual([['2.2.0', 'modified'], ['2.1.0', 'added']])
    expect(h[0]!.fields![0]!.to).toBe(20)
  })

  it('returns empty when item never appears', () => {
    expect(itemHistory('Ghost', [view('2.2.0', { added: [], removed: [], changed: [] })])).toEqual([])
  })
})
