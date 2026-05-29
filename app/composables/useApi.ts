export interface ApiUser {
  id: string
  discordId: string
  username: string
  avatar: string | null
  displayName: string | null
  bio: string | null
  profileVisibility: 'public' | 'private'
}

export interface ApiOwner {
  id: string
  name: string
  discordId: string
  avatar: string | null
}

export interface ApiBuild {
  id: string
  name: string
  owner: ApiOwner | null
  gameVersion: string
  visibility: 'public' | 'unlisted' | 'private'
  buildString: string
  decoded: unknown
  createdAt: string
  updatedAt: string
}

export interface ApiBuildSummary {
  id: string
  name: string
  gameVersion: string
  visibility?: 'public' | 'unlisted' | 'private'
  owner?: ApiOwner | null
}

export interface ApiItem {
  id: string
  name: string
  owner: ApiOwner | null
  gameVersion: string
  visibility: 'public' | 'unlisted' | 'private'
  itemData: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ApiItemSummary {
  id: string
  name: string
  gameVersion: string
  visibility?: 'public' | 'unlisted' | 'private'
  owner?: ApiOwner | null
  craftHash?: string | null
}

export interface ApiProfile {
  id: string
  name: string
  bio: string | null
  avatar: string | null
  discordId: string
}

export interface ApiProfilePrivate {
  private: true
}

export interface ApiKey {
  id: string
  label: string
  prefix: string
  scopes: string[]
  lastUsedAt: string | null
  createdAt: string
}

export interface PageResult<T> {
  data: T[]
  nextCursor: string | null
}

export interface BuildListFilters {
  q?: string
  sort?: 'newest' | 'oldest' | 'name'
  class?: 'Assassin' | 'Warrior' | 'Mage' | 'Archer' | 'Shaman'
  itemId?: number
}

export interface ItemListFilters {
  q?: string
  sort?: 'newest' | 'oldest' | 'name'
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchImpl(`${baseUrl}${path}`, { credentials: 'include', ...init })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const code = (json as { error?: { code?: string } })?.error?.code ?? `http_${res.status}`
      const msg = (json as { error?: { message?: string } })?.error?.message ?? res.statusText
      throw new ApiError(code, msg)
    }
    return json as T
  }

  function jsonInit(method: string, body: unknown): RequestInit {
    return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
  }

  function paginationQuery(filters?: Record<string, string | number | undefined>, cursor?: string, limit?: number): string {
    const params = new URLSearchParams()
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined)
          params.set(k, String(v))
      }
    }
    if (cursor)
      params.set('cursor', cursor)
    if (limit)
      params.set('limit', String(limit))
    const q = params.toString()
    return q ? `?${q}` : ''
  }

  return {
    // Auth
    me: () => request<ApiUser>('/v1/me'),
    logout: () => request<{ ok: boolean }>('/v1/auth/logout', { method: 'POST' }),

    // Builds
    getBuild: (id: string) => request<ApiBuild>(`/v1/builds/${id}`),
    listPublicBuilds: (filters?: BuildListFilters, cursor?: string, limit?: number) =>
      request<PageResult<ApiBuildSummary>>(`/v1/builds${paginationQuery(filters, cursor, limit)}`),
    listMyBuilds: (filters?: Pick<BuildListFilters, 'q' | 'sort'>, cursor?: string, limit?: number) =>
      request<PageResult<ApiBuildSummary>>(`/v1/builds/mine${paginationQuery(filters, cursor, limit)}`),
    getUserBuilds: (userId: string, filters?: BuildListFilters, cursor?: string, limit?: number) =>
      request<PageResult<ApiBuildSummary>>(`/v1/users/${userId}/builds${paginationQuery(filters, cursor, limit)}`),
    createBuild: (body: { name: string, buildString: string, visibility?: string }) =>
      request<{ id: string }>('/v1/builds', jsonInit('POST', body)),
    updateBuild: (id: string, body: { name?: string, buildString?: string, visibility?: string }) =>
      request<{ id: string, name: string, visibility: string }>(`/v1/builds/${id}`, jsonInit('PATCH', body)),
    deleteBuild: (id: string) => request<{ ok: boolean }>(`/v1/builds/${id}`, { method: 'DELETE' }),

    // Items
    getItem: (id: string) => request<ApiItem>(`/v1/items/${id}`),
    listPublicItems: (filters?: ItemListFilters, cursor?: string, limit?: number) =>
      request<PageResult<ApiItemSummary>>(`/v1/items${paginationQuery(filters, cursor, limit)}`),
    listMyItems: (filters?: ItemListFilters, cursor?: string, limit?: number) =>
      request<PageResult<ApiItemSummary>>(`/v1/items/mine${paginationQuery(filters, cursor, limit)}`),
    getUserItems: (userId: string, filters?: ItemListFilters, cursor?: string, limit?: number) =>
      request<PageResult<ApiItemSummary>>(`/v1/users/${userId}/items${paginationQuery(filters, cursor, limit)}`),
    createItem: (body: { name: string, itemData: Record<string, unknown>, gameVersion: string, visibility?: string }) =>
      request<{ id: string }>('/v1/items', jsonInit('POST', body)),
    updateItem: (id: string, body: { name?: string, itemData?: Record<string, unknown>, visibility?: string }) =>
      request<{ id: string, name: string, visibility: string }>(`/v1/items/${id}`, jsonInit('PATCH', body)),
    deleteItem: (id: string) => request<{ ok: boolean }>(`/v1/items/${id}`, { method: 'DELETE' }),

    // Profile
    getProfile: (id: string) => request<ApiProfile | ApiProfilePrivate>(`/v1/users/${id}`),
    updateProfile: (body: { displayName?: string | null, bio?: string | null, profileVisibility?: 'public' | 'private' }) =>
      request<{ displayName: string | null, bio: string | null, profileVisibility: 'public' | 'private' }>('/v1/me/profile', jsonInit('PATCH', body)),

    // Keys
    listKeys: () => request<ApiKey[]>('/v1/me/keys'),
    createKey: (body: { label: string, scopes: string[] }) =>
      request<{ id: string, plaintext: string, prefix: string, scopes: string[] }>('/v1/me/keys', jsonInit('POST', body)),
    revokeKey: (id: string) => request<{ ok: boolean }>(`/v1/me/keys/${id}`, { method: 'DELETE' }),
  }
}

export function useApi() {
  const config = useRuntimeConfig()
  return createApiClient(config.public.apiBaseUrl as string)
}
