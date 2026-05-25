import type { AtreeData } from '../types/atree'
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/atree.sample.json'
import { getSortedClassAtree } from './build-atree'

describe('getSortedClassAtree', () => {
  const sorted = getSortedClassAtree(fixture as AtreeData, 'Archer')

  it('returns the head node first', () => {
    expect(sorted[0]!.ability.id).toBe(100)
  })

  it('wires children as node references in raw array order', () => {
    const head = sorted[0]!
    expect(head.children.map(c => c.ability.id)).toEqual([101, 102])
  })

  it('wires parents as node references', () => {
    const archGate = sorted.find(n => n.ability.id === 103)!
    expect(archGate.parents.map(p => p.ability.id)).toEqual([101])
  })

  it('returns empty array for unknown class', () => {
    expect(getSortedClassAtree(fixture as AtreeData, 'Mage')).toEqual([])
  })

  it('strips bookkeeping fields', () => {
    for (const node of sorted) {
      expect('visited' in node).toBe(false)
      expect('assigned' in node).toBe(false)
      expect('scc' in node).toBe(false)
    }
  })
})
