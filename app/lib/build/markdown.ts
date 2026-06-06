import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

export function renderMarkdown(src: string): string {
  if (!src)
    return ''
  const html = marked.parse(src, { async: false }) as string
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
