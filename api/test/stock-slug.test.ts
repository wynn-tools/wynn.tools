import { describe, expect, it } from 'vitest'
import { slugForTitle } from '../src/lib/slug'

describe('slugForTitle', () => {
  it('kebab-cases and lowercases', async () => {
    expect(await slugForTitle('Curious Kirby', async () => false)).toBe('curious-kirby')
  })

  it('strips diacritics and punctuation', async () => {
    expect(await slugForTitle('Crème Brûlée!?', async () => false)).toBe('creme-brulee')
  })

  it('collapses repeated separators', async () => {
    expect(await slugForTitle('hello   --   world', async () => false)).toBe('hello-world')
  })

  it('falls back to "creation" for empty', async () => {
    expect(await slugForTitle('   ', async () => false)).toBe('creation')
  })

  it('appends disambiguator on collision', async () => {
    const taken = new Set(['kirby', 'kirby-2'])
    expect(await slugForTitle('Kirby', async s => taken.has(s))).toBe('kirby-3')
  })
})
