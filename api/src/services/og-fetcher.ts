import type { Buffer } from 'node:buffer'

export interface OgFetcher {
  fetchOgImage: (path: string) => Promise<{ data: Buffer, contentType: string }>
}

export function createOgFetcher(nuxtUrl: string): OgFetcher {
  return {
    async fetchOgImage(path) {
      const url = `${nuxtUrl.replace(/\/$/, '')}/__og-image__/image.png?url=${encodeURIComponent(path)}`
      const res = await fetch(url)
      if (!res.ok)
        throw new Error(`OG image fetch failed for ${path}: HTTP ${res.status}`)
      const data = Buffer.from(await res.arrayBuffer())
      const contentType = res.headers.get('content-type') ?? 'image/png'
      return { data, contentType }
    },
  }
}
