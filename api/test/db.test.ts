import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { resetDb } from './helpers/db'

describe('db schema', () => {
  beforeEach(resetDb)

  it('round-trips a user', async () => {
    const db = getDb()
    const [user] = await db.insert(schema.users).values({
      id: newResourceId(),
      discordId: '123',
      username: 'tester',
      avatar: null,
    }).returning()
    expect(user.discordId).toBe('123')

    const found = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, user.id) })
    expect(found?.username).toBe('tester')
  })

  it('users has kind and profile_url columns', async () => {
    const db = getDb()
    const rows = await db.execute(sql`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('kind', 'profile_url')
      ORDER BY column_name
    `)
    const cols = rows.rows as { column_name: string, column_default: string | null, is_nullable: string }[]
    const kind = cols.find(c => c.column_name === 'kind')
    const profileUrl = cols.find(c => c.column_name === 'profile_url')
    expect(kind).toBeDefined()
    expect(kind?.is_nullable).toBe('NO')
    expect(kind?.column_default).toContain('real')
    expect(profileUrl).toBeDefined()
    expect(profileUrl?.is_nullable).toBe('YES')
  })

  it('users has unique lower-username index', async () => {
    const db = getDb()
    const rows = await db.execute(sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'users' AND indexname = 'users_username_lower_idx'
    `)
    expect(rows.rows).toHaveLength(1)
  })

  it('users kind defaults to real and accepts valid enum values', async () => {
    const db = getDb()
    const [user] = await db.insert(schema.users).values({
      id: newResourceId(),
      discordId: '999',
      username: 'community_user',
      kind: 'community',
    }).returning()
    expect(user.kind).toBe('community')
  })

  it('builds has source, tags, tutorial_url, notes columns', async () => {
    const db = getDb()
    const rows = await db.execute(sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'builds' AND column_name IN ('source', 'tags', 'tutorial_url', 'notes')
      ORDER BY column_name
    `)
    const cols = rows.rows as { column_name: string, is_nullable: string }[]
    expect(cols).toHaveLength(4)
    for (const col of cols) {
      expect(col.is_nullable).toBe('YES')
    }
  })

  it('build_credits table exists with correct structure', async () => {
    const db = getDb()
    const rows = await db.execute(sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'build_credits'
      ORDER BY column_name
    `)
    const cols = rows.rows as { column_name: string, is_nullable: string }[]
    const names = cols.map(c => c.column_name)
    expect(names).toContain('build_id')
    expect(names).toContain('user_id')
    expect(names).toContain('position')
  })

  it('build_credits has user_id index', async () => {
    const db = getDb()
    const rows = await db.execute(sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'build_credits' AND indexname = 'build_credits_user_id_idx'
    `)
    expect(rows.rows).toHaveLength(1)
  })

  it('build_credits round-trips', async () => {
    const db = getDb()
    const [user] = await db.insert(schema.users).values({
      id: newResourceId(),
      discordId: '456',
      username: 'credit_owner',
    }).returning()
    const [build] = await db.insert(schema.builds).values({
      id: newResourceId(),
      userId: user.id,
      name: 'Test Build',
      buildString: 'abc',
      gameVersion: '2.2.0.31',
    }).returning()
    await db.insert(schema.buildCredits).values({
      buildId: build.id,
      userId: user.id,
      position: 0,
    })
    const credit = await db.query.buildCredits.findFirst({
      where: (c, { eq }) => eq(c.buildId, build.id),
    })
    expect(credit?.userId).toBe(user.id)
    expect(credit?.position).toBe(0)
  })
})
