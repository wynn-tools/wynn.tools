// app/lib/codec/roll-overrides.test.ts
import { describe, expect, it } from 'vitest'
import {
  decodeRollOverrides,
  encodeRollOverrides,
  ITEM_SLOT_KEYS,
  TOME_SLOT_KEYS,
} from './roll-overrides'

describe('roll-overrides codec', () => {
  it('emits empty string when both maps are empty', () => {
    expect(encodeRollOverrides(new Map(), new Map())).toBe('')
  })

  it('encodes a single item override', () => {
    const items = new Map([[0, new Map([['hpBonus', 250]])]])
    expect(encodeRollOverrides(items, new Map())).toBe('h:hpBonus=250')
  })

  it('round-trips multiple slots and ids', () => {
    const items = new Map<number, Map<string, number>>([
      [
        0,
        new Map([
          ['hpBonus', 250],
          ['sdPct', 12],
        ]),
      ],
      [8, new Map([['sdRaw', 87]])],
    ])
    const tomes = new Map<number, Map<string, number>>([
      [0, new Map([['mr', 1]])],
    ])
    const encoded = encodeRollOverrides(items, tomes)
    const decoded = decodeRollOverrides(encoded)
    expect(decoded.itemOverrides).toEqual(items)
    expect(decoded.tomeOverrides).toEqual(tomes)
  })

  it('drops unknown slot keys', () => {
    const { itemOverrides, tomeOverrides } = decodeRollOverrides(
      'zz:hp=1500;h:sdPct=10',
    )
    expect(itemOverrides.has(0)).toBe(true)
    expect(itemOverrides.size).toBe(1)
    expect(tomeOverrides.size).toBe(0)
  })

  it('drops unknown id names', () => {
    const { itemOverrides } = decodeRollOverrides('h:notAnId=5,sdPct=10')
    expect(itemOverrides.get(0)?.has('notAnId')).toBe(false)
    expect(itemOverrides.get(0)?.get('sdPct')).toBe(10)
  })

  it('drops non-integer values', () => {
    const { itemOverrides } = decodeRollOverrides(
      'h:sdPct=abc,mdPct=12.5,hpBonus=7',
    )
    expect(itemOverrides.get(0)?.has('sdPct')).toBe(false)
    expect(itemOverrides.get(0)?.has('mdPct')).toBe(false)
    expect(itemOverrides.get(0)?.get('hpBonus')).toBe(7)
  })

  it('accepts negative integers', () => {
    const { itemOverrides } = decodeRollOverrides('h:spd=-4')
    expect(itemOverrides.get(0)?.get('spd')).toBe(-4)
  })

  it('drops unknown ids on encode (symmetric with decode)', () => {
    const items = new Map([[0, new Map([['notAnId', 5], ['sdPct', 3]])]])
    expect(encodeRollOverrides(items, new Map())).toBe('h:sdPct=3')
  })

  it('emits ids in ROLLED_IDS order regardless of insertion order', () => {
    // sdPct comes before mdPct in ROLLED_IDS
    const items = new Map([
      [
        0,
        new Map([
          ['mdPct', 5],
          ['sdPct', 3],
        ]),
      ],
    ])
    expect(encodeRollOverrides(items, new Map())).toBe('h:sdPct=3,mdPct=5')
  })

  it('exposes slot key tables for callers', () => {
    expect(ITEM_SLOT_KEYS).toEqual([
      'h',
      'c',
      'l',
      'b',
      'r1',
      'r2',
      'br',
      'n',
      'w',
    ])
    expect(TOME_SLOT_KEYS).toEqual(['t0', 't1', 't2', 't3', 't4', 't5', 't6'])
  })
})
