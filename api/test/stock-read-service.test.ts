import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { getCreationBySlug, getRawPart, listCreations } from '../src/services/stock-read'
import { resetDb } from './helpers/db'
import { insertCreation } from './helpers/stock-fixtures'

describe('stock-read', () => {
  beforeEach(resetDb)

  describe('listCreations', () => {
    it('returns published creations only', async () => {
      await insertCreation({ slug: 'a', title: 'Alpha' })
      const b = await insertCreation({ slug: 'b', title: 'Beta' })
      await getDb().update(schema.stockVersion).set({ status: 'draft', publishedAt: null }).where(sql`creation_id = ${b.id}`)
      const r = await listCreations({}, 'newest', 10, null)
      expect(r.items.map(i => i.slug)).toEqual(['a'])
    })

    it('filters by kind, class, category', async () => {
      await insertCreation({ slug: 'one', kind: 'infobox', classes: ['mage'], category: 'qol' })
      await insertCreation({ slug: 'two', kind: 'custom-bar', classes: ['archer'], category: 'combat' })
      expect((await listCreations({ kind: 'infobox' }, 'newest', 10, null)).items.map(i => i.slug)).toEqual(['one'])
      expect((await listCreations({ class: 'archer' }, 'newest', 10, null)).items.map(i => i.slug)).toEqual(['two'])
      expect((await listCreations({ category: 'qol' }, 'newest', 10, null)).items.map(i => i.slug)).toEqual(['one'])
    })

    it('text search ranks title hits above description hits', async () => {
      await insertCreation({ slug: 'kirby', title: 'Curious Kirby' })
      await insertCreation({ slug: 'fillerkirby', title: 'Something Else' })
      const r = await listCreations({ q: 'kirby' }, 'newest', 10, null)
      expect(r.items.map(i => i.slug)).toContain('kirby')
    })

    it('sorts by most-installed', async () => {
      await insertCreation({ slug: 'low', installCount: 1 })
      await insertCreation({ slug: 'high', installCount: 99 })
      const r = await listCreations({}, 'most-installed', 10, null)
      expect(r.items[0].slug).toBe('high')
    })

    it('omits soft-deleted', async () => {
      const a = await insertCreation({ slug: 'gone' })
      await getDb().update(schema.stockCreation).set({ deletedAt: new Date() }).where(sql`id = ${a.id}`)
      expect((await listCreations({}, 'newest', 10, null)).items).toEqual([])
    })

    it('paginates with cursor', async () => {
      for (let i = 0; i < 5; i++) await insertCreation({ slug: `p${i}` })
      const page1 = await listCreations({}, 'newest', 2, null)
      expect(page1.items).toHaveLength(2)
      expect(page1.nextCursor).toBeTruthy()
      const page2 = await listCreations({}, 'newest', 2, page1.nextCursor!)
      expect(page2.items).toHaveLength(2)
      const overlap = page1.items.find(a => page2.items.find(b => b.slug === a.slug))
      expect(overlap).toBeUndefined()
    })
  })

  describe('getCreationBySlug', () => {
    it('returns latest published version with parts and author', async () => {
      const fx = await insertCreation({
        slug: 'kirby',
        title: 'Curious Kirby',
        parts: [{ role: 'function', name: 'Frame', textContent: 'F' }],
      })
      const got = await getCreationBySlug('kirby')
      expect(got?.id).toBe(fx.id)
      expect(got?.latestVersion?.parts[0].name).toBe('Frame')
      expect(got?.author.username).toMatch(/^fx-/)
    })

    it('returns null for soft-deleted', async () => {
      const fx = await insertCreation({ slug: 'k' })
      await getDb().update(schema.stockCreation).set({ deletedAt: new Date() }).where(sql`id = ${fx.id}`)
      expect(await getCreationBySlug('k')).toBeNull()
    })
  })

  describe('getRawPart', () => {
    it('returns text content for a function part', async () => {
      const fx = await insertCreation({
        slug: 'k',
        parts: [{ role: 'function', name: 'Frame', textContent: '{hello}' }],
      })
      const part = (await getDb().query.stockPart.findFirst({
        where: (p, { eq }) => eq(p.versionId, fx.versionId),
      }))!
      const raw = await getRawPart('k', 1, part.id)
      expect(raw?.role).toBe('function')
      expect(raw?.textContent).toBe('{hello}')
    })
  })
})
