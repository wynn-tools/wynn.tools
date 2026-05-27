import type { RawAspectData } from '~/lib/types/aspect'
import { describe, expect, it } from 'vitest'
import archerFile from '~/lib/data/__fixtures__/cdn/aspects/archer.json'
import mageFile from '~/lib/data/__fixtures__/cdn/aspects/mage.json'
import { buildAspectDb } from '~/lib/data/aspect-db'
import { adaptCdnAspects, mergeClassAspects } from './aspect-adapter'

describe('adaptCdnAspects', () => {
  const aspects = adaptCdnAspects(archerFile)
  const first = aspects[0]!

  it('maps name to displayName', () => {
    expect(first.displayName).toBe('Aspect of Chaotic Demolition')
  })

  it('passes id through', () => {
    expect(first.id).toBe(0)
  })

  it('passes tier through', () => {
    expect(first.tier).toBe('Fabled')
  })

  it('sets NONE to false', () => {
    expect(first.NONE).toBe(false)
  })

  it('preserves tier threshold', () => {
    expect(first.tiers[0]!.threshold).toBe(1)
  })

  it('description is a string (not an array)', () => {
    expect(typeof first.tiers[0]!.description).toBe('string')
  })

  it('description equals joined NormalizedText[].text', () => {
    expect(first.tiers[0]!.description).toBe('Increase your maximum Traps by +2.')
  })

  it('adapts all aspects in the file', () => {
    expect(aspects.length).toBe(archerFile.aspects.length)
  })
})

describe('buildAspectDb integration', () => {
  const db = buildAspectDb({ Archer: adaptCdnAspects(archerFile) } as RawAspectData)
  const archerMap = db.byClass.get('Archer')!

  it('returns a Map for Archer', () => {
    expect(archerMap).toBeInstanceOf(Map)
  })

  it('contains the NONE aspect (id 256)', () => {
    const none = archerMap.get(256)!
    expect(none).toBeDefined()
    expect(none.NONE).toBe(true)
  })

  it('contains every adapted aspect by id', () => {
    for (const aspect of adaptCdnAspects(archerFile)) {
      expect(archerMap.has(aspect.id)).toBe(true)
    }
  })
})

describe('mergeClassAspects', () => {
  const merged = mergeClassAspects({ Archer: archerFile, Mage: mageFile })

  it('produces keys Archer and Mage', () => {
    expect(Object.keys(merged).sort()).toEqual(['Archer', 'Mage'])
  })

  it('archer array is non-empty', () => {
    expect(merged.Archer!.length).toBeGreaterThan(0)
  })

  it('mage array is non-empty', () => {
    expect(merged.Mage!.length).toBeGreaterThan(0)
  })
})
