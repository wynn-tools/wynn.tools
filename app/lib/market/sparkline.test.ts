import { describe, expect, it } from 'vitest'
import { sparklinePoints } from './sparkline'

describe('sparklinePoints', () => {
  it('maps a flat series to the vertical middle', () => {
    const pts = sparklinePoints([5, 5, 5], 100, 20)
    expect(pts).toEqual([[0, 10], [50, 10], [100, 10]])
  })
  it('scales min to bottom and max to top (Y flipped)', () => {
    const pts = sparklinePoints([0, 10], 10, 10)
    expect(pts[0]).toEqual([0, 10]) // min → bottom
    expect(pts[1]).toEqual([10, 0]) // max → top
  })
  it('returns empty for fewer than two points', () => {
    expect(sparklinePoints([1], 10, 10)).toEqual([])
  })
})
