import { describe, expect, it } from 'vitest'

;

(globalThis as unknown as { useRuntimeConfig: () => unknown }).useRuntimeConfig = () => ({
  public: {
    apiBaseUrl: 'https://api.test',
    discordInviteUrl: 'https://discord.gg/x',
  },
})

const mod = await import('./useDiscordJoin')
const { buildJoinUrl, useDiscordJoin } = mod

describe('buildJoinUrl', () => {
  it('encodes path, search, and hash into return_to', () => {
    const out = buildJoinUrl('https://api.test', '/builder?x=1#foo')
    expect(out).toBe('https://api.test/v1/auth/discord/join?return_to=%2Fbuilder%3Fx%3D1%23foo')
  })
})

describe('useDiscordJoin', () => {
  it('exposes the runtime invite url', () => {
    const { inviteUrl } = useDiscordJoin()
    expect(inviteUrl).toBe('https://discord.gg/x')
  })
})
