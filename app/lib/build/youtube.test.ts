import { describe, expect, it } from 'vitest'
import { parseYouTubeUrl } from './youtube'

describe('parseYouTubeUrl', () => {
  const ID = 'abcDEF123_-'

  it('parses youtube.com/watch?v=ID', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}`)?.id).toBe(ID)
  })
  it('parses youtu.be/ID', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}`)?.canonical).toBe(`https://www.youtube.com/watch?v=${ID}`)
  })
  it('parses shorts and embed', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/shorts/${ID}`)?.id).toBe(ID)
    expect(parseYouTubeUrl(`https://www.youtube.com/embed/${ID}`)?.id).toBe(ID)
  })
  it('rejects non-https, non-youtube, missing id, empty, too long', () => {
    expect(parseYouTubeUrl(`http://www.youtube.com/watch?v=${ID}`)).toBeNull()
    expect(parseYouTubeUrl('https://vimeo.com/abc')).toBeNull()
    expect(parseYouTubeUrl('https://www.youtube.com/watch')).toBeNull()
    expect(parseYouTubeUrl('')).toBeNull()
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${'x'.repeat(600)}`)).toBeNull()
  })
})
