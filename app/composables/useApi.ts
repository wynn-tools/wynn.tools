export interface ApiUser {
  id: string
  username: string
  avatar: string | null
}

export interface ApiBuild {
  id: string
  name: string
  owner: { id: string, username: string } | null
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
  owner: { id: string, username: string } | null
}

export interface ApiItem {
  id: string
  name: string
  owner: { id: string, username: string } | null
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
  owner: { id: string, username: string } | null
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

  function paginationQuery(cursor?: string, limit?: number): string {
    const params = new URLSearchParams()
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
    listPublicBuilds: (cursor?: string, limit?: number) =>
      request<PageResult<ApiBuildSummary>>(`/v1/builds${paginationQuery(cursor, limit)}`),
    listMyBuilds: (cursor?: string, limit?: number) =>
      request<PageResult<ApiBuildSummary>>(`/v1/builds/mine${paginationQuery(cursor, limit)}`),
    getUserBuilds: (userId: string, cursor?: string, limit?: number) =>
      request<PageResult<ApiBuildSummary>>(`/v1/users/${userId}/builds${paginationQuery(cursor, limit)}`),
    createBuild: (body: { name: string, buildString: string, visibility?: string }) =>
      request<{ id: string }>('/v1/builds', jsonInit('POST', body)),
    updateBuild: (id: string, body: { name?: string, buildString?: string, visibility?: string }) =>
      request<{ id: string, name: string, visibility: string }>(`/v1/builds/${id}`, jsonInit('PATCH', body)),
    deleteBuild: (id: string) => request<{ ok: boolean }>(`/v1/builds/${id}`, { method: 'DELETE' }),

    // Items
    getItem: (id: string) => request<ApiItem>(`/v1/items/${id}`),
    listPublicItems: (cursor?: string, limit?: number) =>
      request<PageResult<ApiItemSummary>>(`/v1/items${paginationQuery(cursor, limit)}`),
    listMyItems: (cursor?: string, limit?: number) =>
      request<PageResult<ApiItemSummary>>(`/v1/items/mine${paginationQuery(cursor, limit)}`),
    getUserItems: (userId: string, cursor?: string, limit?: number) =>
      request<PageResult<ApiItemSummary>>(`/v1/users/${userId}/items${paginationQuery(cursor, limit)}`),
    createItem: (body: { name: string, itemData: Record<string, unknown>, gameVersion: string, visibility?: string }) =>
      request<{ id: string }>('/v1/items', jsonInit('POST', body)),
    updateItem: (id: string, body: { name?: string, itemData?: Record<string, unknown>, visibility?: string }) =>
      request<{ id: string, name: string, visibility: string }>(`/v1/items/${id}`, jsonInit('PATCH', body)),
    deleteItem: (id: string) => request<{ ok: boolean }>(`/v1/items/${id}`, { method: 'DELETE' }),

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
