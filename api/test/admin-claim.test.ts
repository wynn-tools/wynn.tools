import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { performClaim } from '../scripts/admin/claim'
import { getDb, schema } from '../src/db/client'
import { resetDb } from './helpers/db'

const ORACLE_HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

async function insertUser(id: string, kind: 'real' | 'person' | 'community' | 'anonymous' = 'real') {
  const [u] = await getDb()
    .insert(schema.users)
    .values({ id, discordId: `discord_${id}`, username: `user_${id}`, kind })
    .returning()
  return u
}

async function insertBuild(id: string, userId: string) {
  const [b] = await getDb()
    .insert(schema.builds)
    .values({
      id,
      userId,
      name: `Build ${id}`,
      buildString: ORACLE_HASH,
      gameVersion: '2.2.0.31',
      visibility: 'public',
    })
    .returning()
  return b
}

describe('performClaim', () => {
  beforeEach(resetDb)

  it('transfers primary ownership of builds from synth to real', async () => {
    const synth = await insertUser('synth1', 'person')
    const real = await insertUser('real1', 'real')
    await insertBuild('build1', synth.id)
    await insertBuild('build2', synth.id)

    await performClaim({ syntheticId: synth.id, realId: real.id, confirm: true })

    const db = getDb()
    const builds = await db.execute(sql`SELECT user_id FROM builds WHERE id IN ('build1','build2')`)
    expect(builds.rows).toHaveLength(2)
    for (const row of builds.rows) {
      expect(row.user_id).toBe(real.id)
    }

    const synthRow = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, synth.id) })
    expect(synthRow).toBeUndefined()
  })

  it('aborts when synthetic is kind=real', async () => {
    const synth = await insertUser('synth2', 'real')
    const real = await insertUser('real2', 'real')

    await expect(
      performClaim({ syntheticId: synth.id, realId: real.id, confirm: true }),
    ).rejects.toThrow(/kind=real|synthetic.*real/i)
  })

  it('aborts when real is not kind=real', async () => {
    const synth = await insertUser('synth3', 'person')
    const real = await insertUser('real3', 'community')

    await expect(
      performClaim({ syntheticId: synth.id, realId: real.id, confirm: true }),
    ).rejects.toThrow(/expected real/i)
  })

  it('dry-run does not mutate', async () => {
    const synth = await insertUser('synth4', 'person')
    const real = await insertUser('real4', 'real')
    await insertBuild('build4', synth.id)

    await performClaim({ syntheticId: synth.id, realId: real.id, confirm: false })

    const db = getDb()
    const [build] = (await db.execute(sql`SELECT user_id FROM builds WHERE id='build4'`)).rows
    expect(build.user_id).toBe(synth.id)

    const synthRow = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, synth.id) })
    expect(synthRow).toBeDefined()
  })

  it('dedupes build_credits when real is already credited on a synth-owned build after transfer', async () => {
    const synth = await insertUser('synth5', 'person')
    const real = await insertUser('real5', 'real')
    // synth owns build5; real is a co-credit on it
    await insertBuild('build5', synth.id)
    await getDb().insert(schema.buildCredits).values({ buildId: 'build5', userId: real.id, position: 0 })
    // synth also has a build_credit on a build owned by real
    await insertBuild('build6', real.id)
    await getDb().insert(schema.buildCredits).values({ buildId: 'build6', userId: synth.id, position: 0 })

    await performClaim({ syntheticId: synth.id, realId: real.id, confirm: true })

    const db = getDb()
    // build5 is now owned by real; real co-credit on own build is fine (or gone) — no PK collision
    const credits = (await db.execute(
      sql`SELECT build_id, user_id FROM build_credits WHERE build_id IN ('build5','build6')`,
    )).rows

    // For each build_id+user_id combination there should be at most 1 row (PK constraint would have caught it)
    const seen = new Set<string>()
    for (const row of credits) {
      const key = `${row.build_id}:${row.user_id}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }

    // synth should be deleted
    const synthRow = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, synth.id) })
    expect(synthRow).toBeUndefined()
  })
})
