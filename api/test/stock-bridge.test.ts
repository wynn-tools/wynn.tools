import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb } from '../src/db/client'
import { resetEnvCache } from '../src/env'
import {
  createCreationThread,
  postVersionReply,
} from '../src/services/stock-discord-bridge'
import { resetDb } from './helpers/db'
import { insertCreation } from './helpers/stock-fixtures'

describe('discord bridge', () => {
  beforeEach(async () => {
    process.env.DISCORD_FUNCTION_STOCK_CHANNEL_ID = '1257262198510850069'
    resetEnvCache()
    await resetDb()
  })

  it('returns null and does not throw when channel id is unset', async () => {
    delete process.env.DISCORD_FUNCTION_STOCK_CHANNEL_ID
    resetEnvCache()
    const fx = await insertCreation({ slug: 'k', title: 'K' })
    const fetchMock = vi.fn()
    const id = await createCreationThread(fx.id, { fetch: fetchMock as never })
    expect(id).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates a thread, writes discordThreadId, returns id', async () => {
    const fx = await insertCreation({ slug: 'k', title: 'K' })
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: '9999' }), { status: 201 }))
    const id = await createCreationThread(fx.id, { fetch: fetchMock as never })
    expect(id).toBe('9999')
    const row = await getDb().query.stockCreation.findFirst({
      where: (c, { eq }) => eq(c.id, fx.id),
    })
    expect(row?.discordThreadId).toBe('9999')
  })

  it('returns null on Discord 4xx', async () => {
    const fx = await insertCreation({ slug: 'k' })
    const fetchMock = vi.fn(async () => new Response('missing perms', { status: 403 }))
    const id = await createCreationThread(fx.id, { fetch: fetchMock as never })
    expect(id).toBeNull()
  })

  it('postVersionReply is a no-op when discordThreadId is null', async () => {
    const fx = await insertCreation({ slug: 'k' })
    const fetchMock = vi.fn()
    await postVersionReply(fx.id, 1, { fetch: fetchMock as never })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
