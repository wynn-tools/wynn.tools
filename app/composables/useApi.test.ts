import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '~/composables/useApi'

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}
function err(code: string, status: number) {
  return new Response(JSON.stringify({ error: { code, message: 'oops' } }), { status })
}

describe('api client', () => {
  it('includes credentials on every request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ id: 'b1', name: 'x', owner: null, gameVersion: '1', visibility: 'public', buildString: 'abc', decoded: {}, createdAt: '', updatedAt: '' }))
    const api = createApiClient('https://api.test', fetchImpl)
    await api.getBuild('b1')
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/builds/b1', expect.objectContaining({ credentials: 'include' }))
  })

  it('throws ApiError with code on non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(err('not_found', 404))
    const api = createApiClient('https://api.test', fetchImpl)
    await expect(api.getBuild('x')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('listPublicBuilds passes cursor and limit as query params', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ data: [], nextCursor: null }))
    const api = createApiClient('https://api.test', fetchImpl)
    await api.listPublicBuilds(undefined, 'cur1', 10)
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/builds?cursor=cur1&limit=10', expect.any(Object))
  })

  it('createBuild POSTs JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ id: 'b2' }, 201))
    const api = createApiClient('https://api.test', fetchImpl)
    const result = await api.createBuild({ name: 'My Build', buildString: 'xyz' })
    expect(result.id).toBe('b2')
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/builds', expect.objectContaining({ method: 'POST' }))
  })

  it('updateBuild PATCHes JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ id: 'b1', name: 'New', visibility: 'public' }))
    const api = createApiClient('https://api.test', fetchImpl)
    await api.updateBuild('b1', { name: 'New' })
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/builds/b1', expect.objectContaining({ method: 'PATCH' }))
  })

  it('deleteBuild sends DELETE', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ ok: true }))
    const api = createApiClient('https://api.test', fetchImpl)
    await api.deleteBuild('b1')
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/builds/b1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('me returns user', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ id: 'u1', username: 'Alice', avatar: null }))
    const api = createApiClient('https://api.test', fetchImpl)
    const user = await api.me()
    expect(user.username).toBe('Alice')
  })

  it('createKey POSTs and returns plaintext key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ id: 'k1', plaintext: 'wt_live_abc', prefix: 'wt_live_', scopes: ['builds:read'] }, 201))
    const api = createApiClient('https://api.test', fetchImpl)
    const res = await api.createKey({ label: 'Bot', scopes: ['builds:read'] })
    expect(res.plaintext).toBe('wt_live_abc')
  })

  it('getProfile returns public profile', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ id: 'u1', name: 'Scyu_', bio: null, avatar: null, discordId: '123' }))
    const api = createApiClient('https://api.test', fetchImpl)
    const profile = await api.getProfile('u1')
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/users/u1', expect.any(Object))
    expect((profile as { id: string }).id).toBe('u1')
  })

  it('updateProfile PATCHes /v1/me/profile', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ displayName: 'Scyu_', bio: null, profileVisibility: 'public' }))
    const api = createApiClient('https://api.test', fetchImpl)
    await api.updateProfile({ displayName: 'Scyu_' })
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/me/profile', expect.objectContaining({ method: 'PATCH' }))
  })
})
