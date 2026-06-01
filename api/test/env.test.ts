import { describe, expect, it } from 'vitest'
import { parseEnv } from '../src/env'

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  DISCORD_CLIENT_ID: 'id',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_REDIRECT_URI: 'https://api.wynn.tools/v1/auth/discord/callback',
  DISCORD_TOKEN: 'bot-token',
  DISCORD_GUILD_ID: '111',
  DISCORD_INVITE_URL: 'https://discord.gg/test',
  FRONTEND_URL: 'https://wynn.tools',
  COOKIE_DOMAIN: '.wynn.tools',
  CDN_BASE_URL: 'https://cdn.wynn.tools/',
  WYNNVENTORY_API_KEY: 'test-key',
  PORT: '8080',
}

describe('parseEnv', () => {
  it('parses a complete env', () => {
    const env = parseEnv(base)
    expect(env.PORT).toBe(8080)
    expect(env.FRONTEND_URL).toBe('https://wynn.tools')
  })

  it('defaults WYNNVENTORY_BASE_URL when not set', () => {
    const { WYNNVENTORY_BASE_URL: _omit, ...withoutBaseUrl } = { ...base, WYNNVENTORY_BASE_URL: undefined }
    const env = parseEnv(withoutBaseUrl)
    expect(env.WYNNVENTORY_BASE_URL).toBe('https://wynnventory.com')
  })
})
