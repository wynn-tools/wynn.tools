import { beforeEach, describe, expect, it } from 'vitest'
import { env } from '../src/env'
import { testApp } from './helpers/app'
import { makeBearer, makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'

function origin() {
  return { Origin: env().FRONTEND_URL }
}

describe('write routes', () => {
  beforeEach(resetDb)

  it('pOST /v1/stock requires auth', async () => {
    const r = await testApp()('/v1/stock', {
      method: 'POST',
      body: JSON.stringify({ title: 'A', kind: 'infobox', category: 'qol' }),
      headers: { 'Content-Type': 'application/json', ...origin() },
    })
    expect(r.status).toBe(401)
  })

  it('pOST /v1/stock creates a draft creation', async () => {
    const u = await makeUserWithSession()
    const r = await testApp()('/v1/stock', {
      method: 'POST',
      body: JSON.stringify({ title: 'Curious Kirby', kind: 'infobox', category: 'qol', classes: [] }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    expect(r.status).toBe(200)
    const body = await r.json() as { id: string, slug: string }
    expect(body.slug).toBe('curious-kirby')
  })

  it('pATCH /v1/stock/:slug rejects non-author', async () => {
    const u = await makeUserWithSession()
    const them = await makeUserWithSession()
    const created = await testApp()('/v1/stock', {
      method: 'POST',
      body: JSON.stringify({ title: 'A', kind: 'infobox', category: 'qol', classes: [] }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    const { slug } = await created.json() as { slug: string }
    const r = await testApp()(`/v1/stock/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'x' }),
      headers: { 'Content-Type': 'application/json', 'Cookie': them.cookie, ...origin() },
    })
    expect(r.status).toBe(403)
  })

  it('publish flow end-to-end with cookie session', async () => {
    const u = await makeUserWithSession()
    const created = await testApp()('/v1/stock', {
      method: 'POST',
      body: JSON.stringify({ title: 'A', kind: 'infobox', category: 'qol', classes: [] }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    const { slug } = await created.json() as { slug: string }

    const patch = await testApp()(`/v1/stock/${slug}/versions/1`, {
      method: 'PATCH',
      body: JSON.stringify({ parts: [{ role: 'function', name: 'F', textContent: '{x}' }] }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    expect(patch.status).toBe(200)

    const pub = await testApp()(`/v1/stock/${slug}/versions/1/publish`, {
      method: 'POST',
      headers: { Cookie: u.cookie, ...origin() },
    })
    expect(pub.status).toBe(200)

    const list = await testApp()(`/v1/stock`)
    const body = await list.json() as { items: { slug: string }[] }
    expect(body.items.map(i => i.slug)).toContain(slug)
  })

  it('bearer without stock:write is forbidden', async () => {
    const { header } = await makeBearer({ scopes: ['stock:read'] })
    const r = await testApp()('/v1/stock', {
      method: 'POST',
      body: JSON.stringify({ title: 'A', kind: 'infobox', category: 'qol' }),
      headers: { 'Content-Type': 'application/json', 'Authorization': header },
    })
    expect(r.status).toBe(403)
  })

  it('dELETE soft-deletes', async () => {
    const u = await makeUserWithSession()
    const c = await testApp()('/v1/stock', {
      method: 'POST',
      body: JSON.stringify({ title: 'D', kind: 'infobox', category: 'qol' }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    const { slug } = await c.json() as { slug: string }
    const r = await testApp()(`/v1/stock/${slug}`, {
      method: 'DELETE',
      headers: { Cookie: u.cookie, ...origin() },
    })
    expect(r.status).toBe(204)
    const g = await testApp()(`/v1/stock/${slug}`)
    expect(g.status).toBe(404)
  })
})
