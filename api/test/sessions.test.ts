import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { createSession, deleteSession, getSessionUser } from '../src/services/sessions'
import { resetDb } from './helpers/db'

async function makeUser() {
  const db = getDb()
  const [u] = await db.insert(schema.users).values({ discordId: 'd1', username: 'u' }).returning()
  return u
}

describe('sessions', () => {
  beforeEach(resetDb)

  it('creates and resolves a session', async () => {
    const user = await makeUser()
    const token = await createSession(user.id)
    const resolved = await getSessionUser(token)
    expect(resolved?.id).toBe(user.id)
  })

  it('returns null for unknown token', async () => {
    expect(await getSessionUser('nope')).toBeNull()
  })

  it('deletes a session', async () => {
    const user = await makeUser()
    const token = await createSession(user.id)
    await deleteSession(token)
    expect(await getSessionUser(token)).toBeNull()
  })
})
