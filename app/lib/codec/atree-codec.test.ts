import type { AtreeData } from '../types/atree'
import { describe, expect, it } from 'vitest'
import fixture from '../atree/__fixtures__/atree.sample.json'
import { getSortedClassAtree } from '../atree/build-atree'
import { decodeAtree, encodeAtree } from './atree-codec'
import { BitVectorCursor } from './bit-vector'

const sorted = getSortedClassAtree(fixture as AtreeData, 'Archer')

function roundTrip(activeIds: number[]): number[] {
  const active = new Set(activeIds)
  const vec = encodeAtree(sorted, active)
  const out = decodeAtree(sorted, new BitVectorCursor(vec))
  return [...out].sort((a, b) => a - b)
}

describe('atree codec', () => {
  it('round-trips an empty selection (head only)', () => {
    expect(roundTrip([100])).toEqual([100])
  })

  it('round-trips a selection along a branch', () => {
    expect(roundTrip([100, 101, 103])).toEqual([100, 101, 103])
  })

  it('round-trips selecting the other branch', () => {
    expect(roundTrip([100, 102])).toEqual([100, 102])
  })
})
