interface Deps { cdnBase: string, fetch?: typeof fetch, ttlMs?: number, now?: () => number }

export function createVersionsResolver({
  cdnBase,
  fetch: f = fetch,
  ttlMs = 60_000,
  now = Date.now,
}: Deps) {
  let cache: { value: string, at: number } | null = null
  return {
    async current(): Promise<string> {
      if (cache && now() - cache.at < ttlMs)
        return cache.value
      const res = await f(new URL('versions.json', cdnBase).toString())
      if (!res.ok)
        throw new Error(`versions ${res.status}`)
      const data = await res.json() as Array<{ gameVersion: string }>
      const head = data[data.length - 1].gameVersion
      cache = { value: head, at: now() }
      return head
    },
  }
}
