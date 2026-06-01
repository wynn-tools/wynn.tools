import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '../src/env'
import { addGuildMember, buildAuthorizeUrl, buildJoinAuthorizeUrl, DiscordJoinError, exchangeCode, fetchProfile } from '../src/services/discord'

describe('discord oauth', () => {
  it('builds an authorize url with state', () => {
    const url = new URL(buildAuthorizeUrl('xyz'))
    expect(url.searchParams.get('state')).toBe('xyz')
    expect(url.searchParams.get('scope')).toContain('identify')
    expect(url.searchParams.get('client_id')).toBe('id')
  })

  it('exchanges a code for an access token', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 }),
    )
    expect(await exchangeCode('code', fakeFetch)).toBe('tok')
  })

  it('fetches a profile', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '42', username: 'neo', avatar: 'a' }), { status: 200 }),
    )
    expect(await fetchProfile('tok', fakeFetch)).toEqual({ id: '42', username: 'neo', avatar: 'a' })
  })
})

describe('buildJoinAuthorizeUrl', () => {
  it('requests identify and guilds.join', () => {
    const url = new URL(buildJoinAuthorizeUrl('abc'))
    expect(url.searchParams.get('scope')).toBe('identify guilds.join')
    expect(url.searchParams.get('state')).toBe('abc')
    expect(url.searchParams.get('response_type')).toBe('code')
  })
})

describe('addGuildMember', () => {
  function stubOnce(res: Response) {
    return async () => res
  }

  it('returns added:true on 201', async () => {
    const out = await addGuildMember('utok', '99', stubOnce(new Response(null, { status: 201 })))
    expect(out).toEqual({ added: true })
  })

  it('returns added:false on 204 (already a member)', async () => {
    const out = await addGuildMember('utok', '99', stubOnce(new Response(null, { status: 204 })))
    expect(out).toEqual({ added: false })
  })

  it('throws rate_limit on 429', async () => {
    await expect(addGuildMember('utok', '99', stubOnce(new Response('{}', { status: 429 }))))
      .rejects
      .toMatchObject({ kind: 'rate_limit' })
  })

  it('throws banned on 403 with banned error code', async () => {
    const body = JSON.stringify({ code: 40007, message: 'The user is banned from this guild.' })
    await expect(addGuildMember('utok', '99', stubOnce(new Response(body, { status: 403 }))))
      .rejects
      .toMatchObject({ kind: 'banned' })
  })

  it('throws forbidden on other 403', async () => {
    const body = JSON.stringify({ code: 50013, message: 'Missing Permissions' })
    await expect(addGuildMember('utok', '99', stubOnce(new Response(body, { status: 403 }))))
      .rejects
      .toMatchObject({ kind: 'forbidden' })
  })

  it('throws unknown on 500', async () => {
    await expect(addGuildMember('utok', '99', stubOnce(new Response(null, { status: 500 }))))
      .rejects
      .toMatchObject({ kind: 'unknown' })
  })

  it('throws network when fetch rejects', async () => {
    const f = async () => {
      throw new TypeError('fetch failed')
    }
    await expect(addGuildMember('utok', '99', f as unknown as typeof fetch))
      .rejects
      .toMatchObject({ kind: 'network' })
  })

  describe('with mutated env', () => {
    const originalToken = process.env.DISCORD_TOKEN
    const originalGuild = process.env.DISCORD_GUILD_ID

    afterEach(() => {
      process.env.DISCORD_TOKEN = originalToken
      process.env.DISCORD_GUILD_ID = originalGuild
      resetEnvCache()
    })

    it('sends bot token and body to the configured guild', async () => {
      let captured: { url: string, init: RequestInit } | null = null
      const f = async (url: string | URL | Request, init?: RequestInit) => {
        captured = { url: url as string, init: init! }
        return new Response(null, { status: 201 })
      }
      process.env.DISCORD_TOKEN = 'bot-tok'
      process.env.DISCORD_GUILD_ID = '12345'
      resetEnvCache()
      await addGuildMember('utok', '99', f as unknown as typeof fetch)
      expect(captured!.url).toBe('https://discord.com/api/v10/guilds/12345/members/99')
      expect(captured!.init.method).toBe('PUT')
      expect((captured!.init.headers as Record<string, string>).Authorization).toBe('Bot bot-tok')
      expect(JSON.parse(captured!.init.body as string)).toEqual({ access_token: 'utok' })
    })
  })
})

it('discordJoinError carries a kind discriminator', () => {
  const e = new DiscordJoinError('rate_limit', 'rate-limited')
  expect(e).toBeInstanceOf(Error)
  expect(e.kind).toBe('rate_limit')
})
