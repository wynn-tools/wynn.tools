import { describe, expect, it, vi } from 'vitest'
import { buildAuthorizeUrl, exchangeCode, fetchProfile } from '../src/services/discord'

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
