import { describe, expect, it } from 'vitest'
import { renderMarkdown, stripMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders bold and links', () => {
    const out = renderMarkdown('**bold** [link](https://x.com)')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<a href="https://x.com"')
  })
  it('strips script tags', () => {
    const out = renderMarkdown('<script>alert(1)</script>hi')
    expect(out).not.toContain('<script')
  })
  it('strips javascript: hrefs', () => {
    const out = renderMarkdown('[x](javascript:alert(1))')
    expect(out).not.toContain('javascript:')
  })
  it('returns empty for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})

describe('stripMarkdown', () => {
  it('removes syntax and truncates', () => {
    const out = stripMarkdown('# Header\n**bold** [link](https://x)', 20)
    expect(out.length).toBeLessThanOrEqual(20)
    expect(out).not.toContain('#')
    expect(out).not.toContain('*')
  })
  it('keeps under-max strings unchanged', () => {
    expect(stripMarkdown('hi', 50)).toBe('hi')
  })
  it('appends ellipsis when over max', () => {
    const out = stripMarkdown('a'.repeat(100), 10)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBe(10)
  })
})
