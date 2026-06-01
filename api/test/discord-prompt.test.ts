import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { createSession } from '../src/services/sessions'
import { resetDb } from './helpers/db'

function app() {
  const a = createApp()
  return (path: string, init?: RequestInit) => a.request(`http://test${path}`, init)
}

describe('pOST /v1/me/discord-prompt', () => {
  beforeEach(resetDb)

  it('returns 401 without a session', async () => {
    const res = await app()('/v1/me/discord-prompt', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://wynn.tools',
      },
      body: JSON.stringify({ action: 'declined' }),
    })
    expect(res.status).toBe(401)
  })

  it('flips discord_join_status to declined for the session user', async () => {
    const db = getDb()
    const [u] = await db
      .insert(schema.users)
      .values({ id: newResourceId(), discordId: 'd1', username: 'u', discordJoinStatus: 'unset' })
      .returning()
    const token = await createSession(u.id)
    const res = await app()('/v1/me/discord-prompt', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://wynn.tools',
        'cookie': `session=${token}`,
      },
      body: JSON.stringify({ action: 'declined' }),
    })
    expect(res.status).toBe(200)
    const updated = await db.query.users.findFirst({ where: (x, { eq }) => eq(x.id, u.id) })
    expect(updated?.discordJoinStatus).toBe('declined')
  })
})
