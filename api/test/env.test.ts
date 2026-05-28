import { describe, expect, it } from 'vitest'
import { parseEnv } from '../src/env'

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  DISCORD_CLIENT_ID: 'id',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_REDIRECT_URI: 'https://api.wynn.tools/v1/auth/discord/callback',
  FRONTEND_URL: 'https://wynn.tools',
  COOKIE_DOMAIN: '.wynn.tools',
  SESSION_SECRET: 'x'.repeat(32),
  CDN_BASE_URL: 'https://cdn.wynn.tools/',
  PORT: '8080',
}

describe('parseEnv', () => {
  it('parses a complete env', () => {
    const env = parseEnv(base)
    expect(env.PORT).toBe(8080)
    expect(env.FRONTEND_URL).toBe('https://wynn.tools')
  })

  it('throws when SESSION_SECRET is too short', () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: 'short' })).toThrow()
  })
})
