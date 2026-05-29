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

export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchImpl(`${baseUrl}${path}`, { credentials: 'include', ...init })
    const json = await res.json().catch(() => null)
    if (!res.ok)
      throw new Error((json as { error?: { code?: string } })?.error?.code ?? `http_${res.status}`)
    return json as T
  }
  return {
    getBuild: (id: string) => request<ApiBuild>(`/v1/builds/${id}`),
    listMyBuilds: () => request<Array<{ id: string, name: string }>>(`/v1/builds/mine`),
    createBuild: (body: { name: string, buildString: string, visibility?: string }) =>
      request<{ id: string }>(`/v1/builds`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
  }
}

export function useApi() {
  const config = useRuntimeConfig()
  return createApiClient(config.public.apiBaseUrl as string)
}
