export class CdnError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'CdnError'
  }
}

export interface CdnClient {
  fetchJson: <T>(path: string) => Promise<T>
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export function createCdnClient(baseUrl: string): CdnClient {
  const cache = new Map<string, Promise<unknown>>()

  function fetchJson<T>(path: string): Promise<T> {
    const url = joinUrl(baseUrl, path)
    const existing = cache.get(url)
    if (existing)
      return existing as Promise<T>

    const promise = (async () => {
      let response: Response
      try {
        response = await fetch(url)
      }
      catch (err) {
        throw new CdnError(`CDN request failed for ${path}`, err)
      }
      if (!response.ok) {
        throw new CdnError(`CDN returned ${response.status} for ${path}`)
      }
      return response.json() as Promise<T>
    })()

    // Cache the promise; evict on failure so a transient error can be retried.
    cache.set(url, promise)
    promise.catch(() => cache.delete(url))
    return promise
  }

  return { fetchJson }
}
