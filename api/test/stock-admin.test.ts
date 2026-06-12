import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { env } from '../src/env'
import { testApp } from './helpers/app'
import { makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'
import { insertCreation } from './helpers/stock-fixtures'

function origin() {
  return { Origin: env().FRONTEND_URL }
}

describe('admin', () => {
  beforeEach(resetDb)

  it('non-admin → 403', async () => {
    await insertCreation({ slug: 'k' })
    const u = await makeUserWithSession()
    const r = await testApp()('/v1/stock/admin/k/soft-delete', {
      method: 'POST',
      headers: { Cookie: u.cookie, ...origin() },
    })
    expect(r.status).toBe(403)
  })

  it('admin soft-deletes and audits', async () => {
    const fx = await insertCreation({ slug: 'k' })
    const a = await makeUserWithSession({ isAdmin: true })
    const r = await testApp()('/v1/stock/admin/k/soft-delete', {
      method: 'POST',
      headers: { Cookie: a.cookie, ...origin() },
    })
    expect(r.status).toBe(200)
    const log = await getDb().query.stockAdminAuditLog.findMany()
    expect(log[0].action).toBe('soft-delete')
    expect(log[0].targetId).toBe(fx.id)
  })

  it('admin restore clears deletedAt and re-increments refCounts', async () => {
    const sha = 'a'.repeat(64)
    await getDb().insert(schema.stockBlob).values({
      sha256: sha,
      byteSize: 4,
      mimeType: 'application/zip',
      originalFilename: 'pack.zip',
      refCount: 1,
    })
    const fx = await insertCreation({
      slug: 'k',
      parts: [{ role: 'resourcepack', name: 'pack.zip', blobSha256: sha }],
    })
    const a = await makeUserWithSession({ isAdmin: true })
    await testApp()('/v1/stock/admin/k/soft-delete', {
      method: 'POST',
      headers: { Cookie: a.cookie, ...origin() },
    })
    await testApp()('/v1/stock/admin/k/restore', {
      method: 'POST',
      headers: { Cookie: a.cookie, ...origin() },
    })
    const blob = await getDb().query.stockBlob.findFirst({
      where: (b, { eq }) => eq(b.sha256, sha),
    })
    expect(blob?.refCount).toBe(1)
    const c = await getDb().query.stockCreation.findFirst({
      where: (cc, { eq }) => eq(cc.id, fx.id),
    })
    expect(c?.deletedAt).toBeNull()
  })

  it('ban revokes sessions and blocks subsequent auth', async () => {
    const a = await makeUserWithSession({ isAdmin: true })
    const target = await makeUserWithSession()
    const r1 = await testApp()(`/v1/stock/admin/users/${target.id}/ban`, {
      method: 'POST',
      headers: { Cookie: a.cookie, ...origin() },
    })
    expect(r1.status).toBe(200)
    const r2 = await testApp()('/v1/me', { headers: { Cookie: target.cookie } })
    expect(r2.status).toBe(401)
  })
})
