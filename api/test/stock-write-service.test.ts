import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { AppError } from '../src/lib/errors'
import { newResourceId } from '../src/lib/ids'
import {
  createDraftCreation,
  createDraftVersion,
  patchCreationMeta,
  publishVersion,
  replaceDraftParts,
  softDeleteCreation,
} from '../src/services/stock-write'
import { resetDb } from './helpers/db'

async function makeUser(): Promise<string> {
  const id = newResourceId()
  await getDb().insert(schema.users).values({ id, discordId: id, username: `u-${id}` })
  return id
}

async function makeBlob(suffix: number): Promise<string> {
  const sha = String(suffix).padStart(64, 'a')
  await getDb().insert(schema.stockBlob).values({
    sha256: sha,
    byteSize: 10,
    mimeType: 'application/zip',
    originalFilename: 'x.zip',
    refCount: 0,
  })
  return sha
}

describe('stock-write', () => {
  beforeEach(resetDb)

  it('createDraftCreation inserts creation + draft v1 with unique slug', async () => {
    const userId = await makeUser()
    const a = await createDraftCreation({ userId, title: 'Curious Kirby', kind: 'infobox', category: 'qol', classes: [] })
    expect(a.slug).toBe('curious-kirby')
    const b = await createDraftCreation({ userId, title: 'Curious Kirby', kind: 'infobox', category: 'qol', classes: [] })
    expect(b.slug).toBe('curious-kirby-2')
    const versions = await getDb().query.stockVersion.findMany({
      where: (v, { eq }) => eq(v.creationId, a.id),
    })
    expect(versions).toHaveLength(1)
    expect(versions[0].status).toBe('draft')
    expect(versions[0].number).toBe(1)
  })

  it('patchCreationMeta updates and rejects title change after publish', async () => {
    const userId = await makeUser()
    const a = await createDraftCreation({ userId, title: 'A', kind: 'infobox', category: 'qol', classes: [] })
    await patchCreationMeta(a.id, { description: 'hi' })
    let row = await getDb().query.stockCreation.findFirst({ where: (c, { eq }) => eq(c.id, a.id) })
    expect(row?.description).toBe('hi')

    const version = (await getDb().query.stockVersion.findFirst({ where: (v, { eq }) => eq(v.creationId, a.id) }))!
    await publishVersion(version.id)

    await expect(patchCreationMeta(a.id, { title: 'B' })).rejects.toThrow(AppError)
    await patchCreationMeta(a.id, { description: 'after' })
    row = await getDb().query.stockCreation.findFirst({ where: (c, { eq }) => eq(c.id, a.id) })
    expect(row?.description).toBe('after')
  })

  it('createDraftVersion rejects double-draft and wrong author', async () => {
    const userId = await makeUser()
    const otherId = await makeUser()
    const a = await createDraftCreation({ userId, title: 'A', kind: 'infobox', category: 'qol', classes: [] })

    await expect(createDraftVersion(a.id, userId, 'v2')).rejects.toThrow(AppError)

    const v1 = (await getDb().query.stockVersion.findFirst({ where: (v, { eq }) => eq(v.creationId, a.id) }))!
    await publishVersion(v1.id)

    await expect(createDraftVersion(a.id, otherId, 'v2')).rejects.toThrow(AppError)
    const v2 = await createDraftVersion(a.id, userId, 'v2')
    expect(v2.number).toBe(2)
  })

  it('replaceDraftParts validates roles and group cardinality', async () => {
    const userId = await makeUser()
    const a = await createDraftCreation({ userId, title: 'A', kind: 'bundle', category: 'qol', classes: [] })
    const v = (await getDb().query.stockVersion.findFirst({ where: (vv, { eq }) => eq(vv.creationId, a.id) }))!

    await expect(replaceDraftParts(v.id, [{ role: 'function', name: 'F' } as never])).rejects.toThrow(/textContent/)
    await expect(replaceDraftParts(v.id, [{ role: 'resourcepack', name: 'P' } as never])).rejects.toThrow(/blobSha256/)
    await expect(replaceDraftParts(v.id, [
      { role: 'function', name: 'F', textContent: 'x', group: 'pick' },
    ])).rejects.toThrow(/group/)

    await replaceDraftParts(v.id, [
      { role: 'function', name: 'A', textContent: 'a', group: 'pick' },
      { role: 'function', name: 'B', textContent: 'b', group: 'pick' },
      { role: 'function', name: 'Required', textContent: 'r' },
    ])
    const parts = await getDb().query.stockPart.findMany({ where: (p, { eq }) => eq(p.versionId, v.id) })
    expect(parts).toHaveLength(3)
  })

  it('publishVersion bumps refCounts once per distinct sha', async () => {
    const userId = await makeUser()
    const a = await createDraftCreation({ userId, title: 'A', kind: 'bundle', category: 'qol', classes: [] })
    const v = (await getDb().query.stockVersion.findFirst({ where: (vv, { eq }) => eq(vv.creationId, a.id) }))!
    const sha = await makeBlob(1)
    await replaceDraftParts(v.id, [
      { role: 'resourcepack', name: 'P1', blobSha256: sha, blobFilename: 'p.zip' },
      { role: 'resourcepack', name: 'P2', blobSha256: sha, blobFilename: 'p.zip' },
    ])
    await publishVersion(v.id)
    const blob = (await getDb().query.stockBlob.findFirst({ where: (b, { eq }) => eq(b.sha256, sha) }))!
    expect(blob.refCount).toBe(1)
  })

  it('publishVersion bumps lastActivityAt to now', async () => {
    const userId = await makeUser()
    const a = await createDraftCreation({ userId, title: 'A', kind: 'infobox', category: 'qol', classes: [] })
    await getDb().update(schema.stockCreation).set({ lastActivityAt: new Date('2000-01-01') }).where(sql`id = ${a.id}`)
    const v = (await getDb().query.stockVersion.findFirst({ where: (vv, { eq }) => eq(vv.creationId, a.id) }))!
    await publishVersion(v.id)
    const c = (await getDb().query.stockCreation.findFirst({ where: (cc, { eq }) => eq(cc.id, a.id) }))!
    expect(c.lastActivityAt.getTime()).toBeGreaterThan(new Date('2020-01-01').getTime())
  })

  it('softDeleteCreation decrements refCount once per distinct sha', async () => {
    const userId = await makeUser()
    const a = await createDraftCreation({ userId, title: 'A', kind: 'bundle', category: 'qol', classes: [] })
    const v = (await getDb().query.stockVersion.findFirst({ where: (vv, { eq }) => eq(vv.creationId, a.id) }))!
    const sha = await makeBlob(1)
    await replaceDraftParts(v.id, [
      { role: 'resourcepack', name: 'P1', blobSha256: sha, blobFilename: 'p.zip' },
      { role: 'resourcepack', name: 'P2', blobSha256: sha, blobFilename: 'p.zip' },
    ])
    await publishVersion(v.id)
    await softDeleteCreation(a.id, userId)
    const blob = (await getDb().query.stockBlob.findFirst({ where: (b, { eq }) => eq(b.sha256, sha) }))!
    expect(blob.refCount).toBe(0)
  })
})
