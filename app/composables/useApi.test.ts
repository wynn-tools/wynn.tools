import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '~/composables/useApi'

describe('api client', () => {
  it('gets a build with credentials', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'b1', name: 'x' }), { status: 200 }),
    )
    const api = createApiClient('https://api.test', fetchImpl)
    const build = await api.getBuild('b1')
    expect(build.id).toBe('b1')
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/v1/builds/b1',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('throws the envelope code on error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'not_found', message: 'nope' } }), { status: 404 }),
    )
    const api = createApiClient('https://api.test', fetchImpl)
    await expect(api.getBuild('x')).rejects.toThrow('not_found')
  })
})
