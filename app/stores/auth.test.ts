import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    me: vi.fn(),
    logout: vi.fn(),
  })),
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string) { super(message) }
  },
}))

// Stub Nuxt auto-imports used by the store
vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBaseUrl: 'https://api.test' } }))
vi.stubGlobal('navigateTo', vi.fn())

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('initializes with null user and pending true', async () => {
    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.pending).toBe(true)
  })

  it('setUser populates user and clears pending', async () => {
    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    store.setUser({ id: 'u1', username: 'Alice', avatar: null })
    expect(store.user).toEqual({ id: 'u1', username: 'Alice', avatar: null })
    expect(store.pending).toBe(false)
  })

  it('clearUser sets user null and clears pending', async () => {
    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    store.setUser({ id: 'u1', username: 'Alice', avatar: null })
    store.clearUser()
    expect(store.user).toBeNull()
    expect(store.pending).toBe(false)
  })

  it('logout calls api.logout, clears user, and navigates to /', async () => {
    const { useAuthStore } = await import('~/stores/auth')
    const { useApi } = await import('~/composables/useApi')
    const mockLogout = vi.fn().mockResolvedValue({ ok: true })
    vi.mocked(useApi).mockReturnValue({ logout: mockLogout } as ReturnType<typeof useApi>)
    const navigateTo = vi.fn()
    vi.stubGlobal('navigateTo', navigateTo)

    const store = useAuthStore()
    store.setUser({ id: 'u1', username: 'Alice', avatar: null })
    await store.logout()

    expect(mockLogout).toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(navigateTo).toHaveBeenCalledWith('/')
  })

  // login() uses import.meta.client which is false in Vitest's node environment,
  // so the function early-returns without touching window. This test confirms
  // it does not throw in a non-client context.
  it('login() is a no-op in non-client (SSR/test) environment', async () => {
    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    expect(() => store.login()).not.toThrow()
  })
})
