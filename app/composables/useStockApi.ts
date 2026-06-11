import type {
  StockCategory,
  StockClass,
  StockCreation,
  StockEmoji,
  StockKind,
  StockListItem,
  StockPart,
  StockReactionCounts,
  StockSort,
  StockVersion,
} from '~/lib/types/stock'
import { ApiError } from '~/composables/useApi'

export interface ListFilters {
  kind?: StockKind
  class?: StockClass
  category?: StockCategory
  q?: string
  creator?: string
  sort?: StockSort
  limit?: number
  cursor?: string
}

export interface CreateInput {
  title: string
  kind: StockKind
  category: StockCategory
  classes?: StockClass[]
  description?: string
}

export interface PartInput {
  role: StockPart['role']
  name: string
  description?: string | null
  group?: string | null
  textContent?: string | null
  blobSha256?: string | null
  blobFilename?: string | null
}

export interface UploadResult {
  sha256: string
  byteSize: number
  mimeType: string
}

function buildQuery(filters: ListFilters): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === '' || v === null)
      continue
    p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function useStockApi() {
  const baseUrl = useRuntimeConfig().public.apiBaseUrl as string

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, { credentials: 'include', ...init })
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

  return {
    list: (f: ListFilters = {}) =>
      request<{ items: StockListItem[], nextCursor: string | null }>(`/v1/stock${buildQuery(f)}`),
    get: (slug: string) => request<StockCreation>(`/v1/stock/${slug}`),
    getVersion: (slug: string, n: number) =>
      request<StockVersion>(`/v1/stock/${slug}/versions/${n}`),
    create: (body: CreateInput) =>
      request<{ id: string, slug: string }>('/v1/stock', jsonInit('POST', body)),
    patch: (slug: string, body: Partial<CreateInput & { creditsNote: string }>) =>
      request<{ ok: true }>(`/v1/stock/${slug}`, jsonInit('PATCH', body)),
    createVersion: (slug: string, label: string) =>
      request<{ id: string, number: number }>(`/v1/stock/${slug}/versions`, jsonInit('POST', { label })),
    patchVersion: (
      slug: string,
      n: number,
      body: { label?: string, changelog?: string, parts?: PartInput[] },
    ) => request<{ ok: true }>(`/v1/stock/${slug}/versions/${n}`, jsonInit('PATCH', body)),
    publish: (slug: string, n: number) =>
      request<{ ok: true }>(`/v1/stock/${slug}/versions/${n}/publish`, { method: 'POST' }),
    del: (slug: string) =>
      request<unknown>(`/v1/stock/${slug}`, { method: 'DELETE' }),
    react: (slug: string, emoji: StockEmoji) =>
      request<StockReactionCounts>(`/v1/stock/${slug}/reactions`, jsonInit('POST', { emoji })),
    upload: async (file: File): Promise<UploadResult> => {
      const form = new FormData()
      form.append('file', file)
      return request<UploadResult>('/v1/stock/uploads', { method: 'POST', body: form })
    },
    rawUrl: (slug: string, n: number, partId: string) =>
      `${baseUrl}/v1/stock/${slug}/versions/${n}/parts/${partId}/raw`,
    blobUrl: (sha: string) => `${baseUrl}/v1/stock/blobs/${sha}`,
  }
}
