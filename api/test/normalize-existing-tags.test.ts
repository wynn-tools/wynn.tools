import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { runNormalizeExistingTags } from '../src/scripts/normalize-existing-tags'
import { resetDb } from './helpers/db'

const HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

async function seed() {
  const [u] = await getDb().insert(schema.users).values({ id: newResourceId(), discordId: 'd', username: 'u' }).returning()
  await getDb().insert(schema.builds).values([
    { id: 'clean', userId: u.id, name: 'Clean', buildString: HASH, gameVersion: '2.2', visibility: 'public', tags: ['dps'] },
    { id: 'dirty', userId: u.id, name: 'Dirty', buildString: HASH, gameVersion: '2.2', visibility: 'public', tags: ['Mage', 'dps', 'ws'] },
    { id: 'empty', userId: u.id, name: 'Empty', buildString: HASH, gameVersion: '2.2', visibility: 'public', tags: [] },
  ])
}

describe('runNormalizeExistingTags', () => {
  beforeEach(resetDb)

  it('normalizes dirty rows and leaves clean rows alone', async () => {
    await seed()
    const result = await runNormalizeExistingTags(getDb())
    expect(result.scanned).toBe(2) // empty row excluded by cardinality filter
    expect(result.updated).toBe(1)
    expect(result.unchanged).toBe(1)
    const dirty = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, 'dirty') })
    expect(dirty?.tags).toEqual(['dps', 'walk-speed'])
    const clean = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, 'clean') })
    expect(clean?.tags).toEqual(['dps'])
  })

  it('is idempotent on a clean DB', async () => {
    await seed()
    await runNormalizeExistingTags(getDb())
    const result = await runNormalizeExistingTags(getDb())
    expect(result.updated).toBe(0)
    expect(result.unchanged).toBe(2)
  })

  it('no-ops on empty table', async () => {
    const result = await runNormalizeExistingTags(getDb())
    expect(result).toEqual({ scanned: 0, updated: 0, unchanged: 0 })
  })
})
