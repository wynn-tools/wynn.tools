import type { RawItemData } from '../types/item'
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/items.sample.json'
import { buildItemDb } from './item-db'

describe('buildItemDb', () => {
  const db = buildItemDb(fixture as RawItemData)

  it('indexes items by name and id', () => {
    expect(db.byName.get('Adherence')?.id).toBe(4056)
    expect(db.byId.get(4056)?.name).toBe('Adherence')
  })

  it('injects the 9 none items', () => {
    expect(db.byId.get(10000)?.name).toBe('No Helmet')
    expect(db.byId.get(10008)?.name).toBe('No Weapon')
  })

  it('attaches set names to member items', () => {
    expect(db.byName.get('Boundless Lance')?.set).toBe('Boundless')
    expect(db.byName.get('Boundless Helm')?.set).toBe('Boundless')
  })

  it('resolves ids, following redirects', () => {
    expect(db.resolveId(4056)?.name).toBe('Adherence')
    expect(db.resolveId(999999)).toBeUndefined()
  })

  it('follows a redirect chain', () => {
    const data: RawItemData = {
      items: [
        { name: 'Old', id: 1, category: 'armor', type: 'helmet', remapID: 2 },
        { name: 'Mid', id: 2, category: 'armor', type: 'helmet', remapID: 3 },
        { name: 'New', id: 3, category: 'armor', type: 'helmet' },
      ],
      sets: {},
    }
    const redirDb = buildItemDb(data)
    expect(redirDb.resolveId(1)?.name).toBe('New')
    expect(redirDb.resolveId(2)?.name).toBe('New')
  })
})
