import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

const WYNNBUILDER_URL_RE = /https:\/\/(?:wynnbuilder(?:-beta)?|hppeng-wynn)\.github\.io\/builder\/#([\w+\-=]+)/g

export function rewriteWynnbuilderUrls(src: string): string {
  return src.replace(WYNNBUILDER_URL_RE, (_, hash) => `https://wynn.tools/builder/${hash}`)
}

export async function renderMarkdown(src: string): Promise<string> {
  if (!src)
    return ''
  if (import.meta.server)
    return ''
  const html = marked.parse(rewriteWynnbuilderUrls(src), { async: false }) as string
  const { default: DOMPurify } = await import('isomorphic-dompurify')
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

export function stripMarkdown(src: string, max: number): string {
  if (!src)
    return ''
  const plain = src
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}
