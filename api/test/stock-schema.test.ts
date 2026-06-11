import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { resetDb } from './helpers/db'

async function makeUser(id = newResourceId()) {
  await getDb().insert(schema.users).values({
    id,
    discordId: id,
    username: `user-${id}`,
  })
  return id
}

describe('stock schema', () => {
  beforeEach(resetDb)

  it('inserts and reads a creation + version + text part', async () => {
    const userId = await makeUser()
    const cid = newResourceId()
    const vid = newResourceId()
    const pid = newResourceId()

    await getDb().insert(schema.stockCreation).values({
      id: cid,
      slug: 'rune-display',
      title: 'Rune Display',
      authorUserId: userId,
      kind: 'infobox',
      category: 'resource-tracker',
    })
    await getDb().insert(schema.stockVersion).values({
      id: vid,
      creationId: cid,
      number: 1,
      label: 'v1.0',
      status: 'published',
      publishedAt: new Date(),
    })
    await getDb().insert(schema.stockPart).values({
      id: pid,
      versionId: vid,
      order: 0,
      role: 'function',
      name: 'Function',
      textContent: '{display_runes()}',
    })

    const got = await getDb().query.stockCreation.findFirst({
      where: (c, { eq }) => eq(c.id, cid),
      with: { versions: { with: { parts: true } } },
    })
    expect(got?.versions[0].parts[0].textContent).toBe('{display_runes()}')
  })

  it('rejects two drafts for the same creation', async () => {
    const userId = await makeUser()
    const cid = newResourceId()
    await getDb().insert(schema.stockCreation).values({
      id: cid,
      slug: 'x',
      title: 'X',
      authorUserId: userId,
      kind: 'infobox',
      category: 'qol',
    })
    await getDb().insert(schema.stockVersion).values({
      id: newResourceId(),
      creationId: cid,
      number: 1,
      label: 'v1',
      status: 'draft',
    })
    await expect(
      getDb().insert(schema.stockVersion).values({
        id: newResourceId(),
        creationId: cid,
        number: 2,
        label: 'v2',
        status: 'draft',
      }),
    ).rejects.toThrow()
  })

  it('round-trips a blob ref-counted resourcepack part', async () => {
    const userId = await makeUser()
    const cid = newResourceId()
    await getDb().insert(schema.stockBlob).values({
      sha256: 'a'.repeat(64),
      byteSize: 100,
      mimeType: 'application/zip',
      originalFilename: 'pack.zip',
      refCount: 0,
    })
    await getDb().insert(schema.stockCreation).values({
      id: cid,
      slug: 'k',
      title: 'K',
      authorUserId: userId,
      kind: 'bundle',
      category: 'qol',
    })
    const vid = newResourceId()
    await getDb().insert(schema.stockVersion).values({
      id: vid,
      creationId: cid,
      number: 1,
      label: 'v1',
      status: 'draft',
    })
    await getDb().insert(schema.stockPart).values({
      id: newResourceId(),
      versionId: vid,
      order: 0,
      role: 'resourcepack',
      name: 'Pack',
      blobSha256: 'a'.repeat(64),
      blobFilename: 'pack.zip',
    })
    const parts = await getDb().query.stockPart.findMany({
      where: (p, { eq }) => eq(p.versionId, vid),
    })
    expect(parts[0].blobSha256).toHaveLength(64)
  })
})
