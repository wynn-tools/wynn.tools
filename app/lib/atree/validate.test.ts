import type { AtreeData, AtreeSelection } from '../types/atree'
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/atree.sample.json'
import { getSortedClassAtree } from './build-atree'
import { validateAtree } from './validate'

const sorted = getSortedClassAtree(fixture as AtreeData, 'Archer')

function select(ids: number[]): AtreeSelection {
  const sel: AtreeSelection = new Map()
  for (const node of sorted)
    sel.set(node.ability.id, ids.includes(node.ability.id))
  return sel
}

describe('validateAtree', () => {
  it('marks head reachable and counts its AP', () => {
    const res = validateAtree(sorted, select([100]), 50)
    expect(res.reachable.has(100)).toBe(true)
    expect(res.apTotal).toBe(1)
    expect(res.hardError).toBe(false)
  })

  it('treats a node with no selected parent as not reachable', () => {
    const res = validateAtree(sorted, select([101]), 50)
    expect(res.reachable.has(101)).toBe(false)
    expect(res.errors.some(e => e.includes('Branch A'))).toBe(true)
  })

  it('gates an archetype_req node until the archetype is present', () => {
    const without = validateAtree(sorted, select([100, 103]), 50)
    expect(without.reachable.has(103)).toBe(false)
    const withArch = validateAtree(sorted, select([100, 101, 103]), 50)
    expect(withArch.reachable.has(103)).toBe(true)
  })

  it('derives AP cap from level and flags overspend', () => {
    const res = validateAtree(sorted, select([100, 101, 103]), 1)
    expect(res.apCap).toBe(1)
    expect(res.errors.some(e => e.includes('too many ability points'))).toBe(true)
  })

  it('caps at 50 for NaN level', () => {
    const res = validateAtree(sorted, select([100]), Number.NaN)
    expect(res.apCap).toBe(50)
  })
})
