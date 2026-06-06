import { describe, expect, it } from 'vitest'
import { parseYouTubeUrl } from '../src/lib/youtube'

describe('parseYouTubeUrl', () => {
  const ID = 'abcDEF123_-'

  it('parses youtube.com/watch?v=ID', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}`)).toEqual({
      id: ID,
      canonical: `https://www.youtube.com/watch?v=${ID}`,
    })
  })

  it('parses youtu.be/ID', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}`)).toEqual({
      id: ID,
      canonical: `https://www.youtube.com/watch?v=${ID}`,
    })
  })

  it('parses m.youtube.com/watch?v=ID', () => {
    expect(parseYouTubeUrl(`https://m.youtube.com/watch?v=${ID}`)?.id).toBe(ID)
  })

  it('parses youtube.com/shorts/ID', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/shorts/${ID}`)?.id).toBe(ID)
  })

  it('parses youtube.com/embed/ID', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/embed/${ID}`)?.id).toBe(ID)
  })

  it('preserves id with extra query params', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&t=30s`)?.id).toBe(ID)
  })

  it('rejects non-https', () => {
    expect(parseYouTubeUrl(`http://www.youtube.com/watch?v=${ID}`)).toBeNull()
  })

  it('rejects vimeo or other hosts', () => {
    expect(parseYouTubeUrl(`https://vimeo.com/${ID}`)).toBeNull()
  })

  it('rejects plain text', () => {
    expect(parseYouTubeUrl('not a url')).toBeNull()
  })

  it('rejects missing id', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch')).toBeNull()
  })

  it('rejects empty input', () => {
    expect(parseYouTubeUrl('')).toBeNull()
  })

  it('rejects over-long input', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${'x'.repeat(600)}`)).toBeNull()
  })
})
