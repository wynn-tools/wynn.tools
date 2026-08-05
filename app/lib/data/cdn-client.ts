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

/**
 * How long the root index may be served from cache.
 *
 * Snapshots under `data/{gameVersion}/` never change, so they are cached for the
 * process lifetime. `versions.json` grows with every release — caching it
 * forever means a long-lived process (the API, the SSR server) keeps rejecting
 * builds encoded against a snapshot published after it booted.
 */
const VERSIONS_TTL_MS = 60_000

function isMutable(path: string): boolean {
  return path.replace(/^\/+/, '') === 'versions.json'
}

export function createCdnClient(baseUrl: string): CdnClient {
  const cache = new Map<string, { promise: Promise<unknown>, expiresAt: number }>()

  function fetchJson<T>(path: string): Promise<T> {
    const url = joinUrl(baseUrl, path)
    const existing = cache.get(url)
    if (existing && existing.expiresAt > Date.now())
      return existing.promise as Promise<T>

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

    const entry = { promise, expiresAt: isMutable(path) ? Date.now() + VERSIONS_TTL_MS : Number.POSITIVE_INFINITY }
    cache.set(url, entry)
    // Evict on failure so a transient error can be retried — but only if this
    // entry is still the current one.
    promise.catch(() => {
      if (cache.get(url) === entry)
        cache.delete(url)
    })
    return promise
  }

  return { fetchJson }
}
