import { beforeEach, describe, expect, it } from 'vitest'
import { testApp } from './helpers/app'
import { resetDb } from './helpers/db'
import { insertCreation } from './helpers/stock-fixtures'

describe('gET /v1/stock', () => {
  beforeEach(resetDb)

  it('lists creations', async () => {
    await insertCreation({ slug: 'a' })
    await insertCreation({ slug: 'b' })
    const r = await testApp()('/v1/stock')
    expect(r.status).toBe(200)
    const body = await r.json() as { items: { slug: string }[] }
    expect(body.items.map(i => i.slug).sort()).toEqual(['a', 'b'])
  })

  it('filters by kind', async () => {
    await insertCreation({ slug: 'i', kind: 'infobox' })
    await insertCreation({ slug: 'c', kind: 'custom-bar' })
    const r = await testApp()('/v1/stock?kind=infobox')
    const body = await r.json() as { items: { slug: string }[] }
    expect(body.items.map(i => i.slug)).toEqual(['i'])
  })

  it('400 on invalid sort', async () => {
    const r = await testApp()('/v1/stock?sort=wrong')
    expect(r.status).toBe(400)
  })

  it('400 on limit > 50', async () => {
    const r = await testApp()('/v1/stock?limit=100')
    expect(r.status).toBe(400)
  })
})

describe('gET /v1/stock/:slug', () => {
  beforeEach(resetDb)

  it('returns the creation', async () => {
    await insertCreation({
      slug: 'kirby',
      title: 'Curious Kirby',
      parts: [{ role: 'function', name: 'Frame', textContent: 'F' }],
    })
    const r = await testApp()('/v1/stock/kirby')
    expect(r.status).toBe(200)
    const body = await r.json() as { slug: string, latestVersion: { parts: { name: string }[] } }
    expect(body.slug).toBe('kirby')
    expect(body.latestVersion.parts[0].name).toBe('Frame')
  })

  it('404 on missing', async () => {
    expect((await testApp()('/v1/stock/nope')).status).toBe(404)
  })
})

describe('gET /v1/stock/:slug/versions/:n', () => {
  beforeEach(resetDb)

  it('returns the version with parts', async () => {
    await insertCreation({
      slug: 'k',
      parts: [{ role: 'function', name: 'F', textContent: 'x' }],
    })
    const r = await testApp()('/v1/stock/k/versions/1')
    expect(r.status).toBe(200)
    const body = await r.json() as { number: number, parts: { name: string }[] }
    expect(body.number).toBe(1)
    expect(body.parts[0].name).toBe('F')
  })

  it('404 on missing version', async () => {
    await insertCreation({ slug: 'k' })
    expect((await testApp()('/v1/stock/k/versions/99')).status).toBe(404)
  })
})
