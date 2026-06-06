import type { RawMarketPrice } from '~/lib/market/types'

export interface ApiUser {
  id: string
  discordId: string
  username: string
  avatar: string | null
  displayName: string | null
  bio: string | null
  profileVisibility: 'public' | 'private'
  discordJoinStatus: 'unset' | 'joined' | 'declined'
}

export interface ApiOwner {
  id: string
  username: string
  name: string
  discordId: string
  avatar: string | null
}

export interface ApiBuildCredit {
  id: string
  username: string
  displayName: string
  avatar: string | null
}

export interface ApiBuild {
  id: string
  name: string
  owner: ApiOwner | null
  gameVersion: string
  visibility: 'public' | 'unlisted' | 'private'
  playerClass: string | null
  level: number
  equipNames: ({ name: string, tier: string } | null)[]
  buildString: string
  decoded: unknown
  tags: string[]
  notes: string | null
  tutorialUrl: string | null
  credits: ApiBuildCredit[]
  createdAt: string
  updatedAt: string
}

export interface ApiBuildSummary {
  id: string
  name: string
  gameVersion: string
  visibility?: 'public' | 'unlisted' | 'private'
  owner?: ApiOwner | null
  tags?: string[]
  hasTutorial?: boolean
  isCredit?: boolean
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
  username: string
  name: string
  bio: string | null
  avatar: string | null
  discordId: string
  kind: 'real' | 'person' | 'community' | 'anonymous'
  profileUrl: string | null
  canonicalSlug: string
  resolvedVia: 'username' | 'id'
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
  gameVersion?: string
  /** User id; matches builds where the user is owner OR a credited co-author. */
  creator?: string
  tag?: string[]
}

export interface ApiUserSearchResult {
  id: string
  username: string
  name: string
  avatar: string | null
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

  function paginationQuery(filters?: Record<string, string | number | string[] | undefined>, cursor?: string, limit?: number): string {
    const params = new URLSearchParams()
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v === undefined)
          continue
        if (Array.isArray(v)) {
          for (const x of v) params.append(k, String(x))
        }
        else {
          params.set(k, String(v))
        }
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
    updateBuild: (id: string, body: { name?: string, buildString?: string, visibility?: string, tags?: string[], notes?: string | null, tutorialUrl?: string | null }) =>
      request<{ id: string, name: string, visibility: string, tags: string[], notes: string | null, tutorialUrl: string | null }>(`/v1/builds/${id}`, jsonInit('PATCH', body)),
    deleteBuild: (id: string) => request<{ ok: boolean }>(`/v1/builds/${id}`, { method: 'DELETE' }),
    replaceBuildCredits: (id: string, credits: { userId: string }[]) =>
      request<{ credits: ApiBuildCredit[] }>(`/v1/builds/${id}/credits`, jsonInit('PUT', { credits })),
    removeMyCreditFromBuild: (id: string) =>
      request<{ ok: boolean }>(`/v1/builds/${id}/credits/me`, { method: 'DELETE' }),

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
    searchUsers: (q: string) =>
      request<{ data: ApiUserSearchResult[] }>(`/v1/users/search?q=${encodeURIComponent(q)}`),
    updateProfile: (body: { displayName?: string | null, bio?: string | null, profileVisibility?: 'public' | 'private' }) =>
      request<{ displayName: string | null, bio: string | null, profileVisibility: 'public' | 'private' }>('/v1/me/profile', jsonInit('PATCH', body)),
    setDiscordPrompt: (action: 'declined') =>
      request<{ ok: boolean }>('/v1/me/discord-prompt', jsonInit('POST', { action })),

    // Keys
    listKeys: () => request<ApiKey[]>('/v1/me/keys'),
    createKey: (body: { label: string, scopes: string[] }) =>
      request<{ id: string, plaintext: string, prefix: string, scopes: string[] }>('/v1/me/keys', jsonInit('POST', body)),
    revokeKey: (id: string) => request<{ ok: boolean }>(`/v1/me/keys/${id}`, { method: 'DELETE' }),

    // Market (same-origin proxy; never exposes the WynnVentory key)
    getPrice: (name: string, opts?: { tier?: number, shiny?: boolean }) => {
      const params = new URLSearchParams()
      if (opts?.tier != null)
        params.set('tier', String(opts.tier))
      if (opts?.shiny != null)
        params.set('shiny', String(opts.shiny))
      const qs = params.toString()
      return request<RawMarketPrice | null>(`/v1/market/price/${encodeURIComponent(name)}${qs ? `?${qs}` : ''}`)
    },
    getBuildPrices: (items: { name: string, tier?: number }[]) =>
      request<{ results: (RawMarketPrice | null)[] }>('/v1/market/prices', jsonInit('POST', { items })),
  }
}

export function useApi() {
  const config = useRuntimeConfig()
  return createApiClient(config.public.apiBaseUrl as string)
}
