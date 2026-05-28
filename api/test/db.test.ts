import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { resetDb } from './helpers/db'

describe('db schema', () => {
  beforeEach(resetDb)

  it('round-trips a user', async () => {
    const db = getDb()
    const [user] = await db.insert(schema.users).values({
      discordId: '123',
      username: 'tester',
      avatar: null,
    }).returning()
    expect(user.discordId).toBe('123')

    const found = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, user.id) })
    expect(found?.username).toBe('tester')
  })
})
