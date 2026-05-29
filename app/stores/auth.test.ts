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
})
