import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { createApiKey, revokeApiKey, verifyApiKey } from '../src/services/api-keys'
import { resetDb } from './helpers/db'

async function user() {
  const [u] = await getDb().insert(schema.users).values({ id: newResourceId(), discordId: 'k', username: 'kuser' }).returning()
  return u
}

describe('api keys', () => {
  beforeEach(resetDb)

  it('creates, verifies, and revokes a key', async () => {
    const u = await user()
    const { plaintext, record } = await createApiKey(u.id, 'bot', ['builds:read'])
    expect(plaintext.startsWith('wt_live_')).toBe(true)

    const verified = await verifyApiKey(plaintext)
    expect(verified?.user.id).toBe(u.id)
    expect(verified?.scopes).toEqual(['builds:read'])

    await revokeApiKey(u.id, record.id)
    expect(await verifyApiKey(plaintext)).toBeNull()
  })

  it('rejects unknown keys', async () => {
    expect(await verifyApiKey('wt_live_nope')).toBeNull()
  })
})
