import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Haywire Defender')).toBe('haywire-defender')
  })
  it('strips apostrophes', () => {
    expect(slugify('Spider Cave\'s Den')).toBe('spider-caves-den')
  })
  it('collapses repeated separators', () => {
    expect(slugify('  Prelude  to   Annihilation ')).toBe('prelude-to-annihilation')
  })
  it('removes other punctuation', () => {
    expect(slugify('Corrupted Spring!')).toBe('corrupted-spring')
  })
})
