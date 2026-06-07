import type { Buffer } from 'node:buffer'

export interface OgFetcher {
  fetchOgImage: (path: string) => Promise<{ data: Buffer, contentType: string }>
}

export function createOgFetcher(nuxtUrl: string): OgFetcher {
  return {
    async fetchOgImage(path) {
      const url = `${nuxtUrl.replace(/\/$/, '')}${path}`
      const res = await fetch(url)
      if (!res.ok)
        throw new Error(`OG image fetch failed for ${path}: HTTP ${res.status}`)
      const contentType = res.headers.get('content-type') ?? 'image/png'
      if (!contentType.startsWith('image/'))
        throw new Error(`OG image fetch returned non-image content-type for ${path}: ${contentType}`)
      const data = Buffer.from(await res.arrayBuffer())
      return { data, contentType }
    },
  }
}
