// app/lib/math/spell-calc.ts
import type { StatMap } from './merge-stat'
import type { Spell, SpellPart } from './spells'
import { calculateSpellDamage } from './spell-damage'
import { isDamagePart, isTotalPart } from './spells'

/** A fully-evaluated damage part. "total" parts collapse into this same shape. */
export interface DamagePartResult {
  type: 'damage'
  name: string
  display: boolean
  normalMin: number[]
  normalMax: number[]
  normalTotal: [number, number]
  critMin: number[]
  critMax: number[]
  critTotal: [number, number]
  isSpell: boolean
  multipliers: number[]
}

const COMBINE_KEYS = [
  'normalMin',
  'normalMax',
  'normalTotal',
  'critMin',
  'critMax',
  'critTotal',
  'multipliers',
] as const

/**
 * Evaluate every part of a spell into damage results.
 * Pure port of builder_graph.js SpellDamageCalcNode.compute_func (damage + total parts only).
 */
export function computeSpellParts(spell: Spell, stats: StatMap, weapon: Map<string, unknown>): DamagePartResult[] {
  const useSpeed = spell.useAtkspd ?? true
  const useSpell = spell.scaling ? spell.scaling === 'spell' : true

  const byName = new Map<string, SpellPart>()
  for (const part of spell.parts)
    byName.set(part.name, part)
  const evaluated = new Map<string, DamagePartResult>()

  function evalPart(name: string): DamagePartResult | undefined {
    const cached = evaluated.get(name)
    if (cached)
      return cached
    const part = byName.get(name)
    if (!part)
      return undefined

    let result: DamagePartResult
    if (isDamagePart(part)) {
      const partId = `${spell.baseSpell}.${part.name}`
      const res = calculateSpellDamage(stats, weapon, part.multipliers, useSpell, {
        ignoreSpeed: !useSpeed,
        partFilter: partId,
        ignoreStr: !(part.useStr ?? true),
        ignoredMults: part.ignoredMults ?? [],
      })
      result = {
        type: 'damage',
        name: part.name,
        display: part.display ?? true,
        normalMin: res.perElement.map(x => x[0]!),
        normalMax: res.perElement.map(x => x[1]!),
        normalTotal: res.normalTotal,
        critMin: res.perElement.map(x => x[2]!),
        critMax: res.perElement.map(x => x[3]!),
        critTotal: res.critTotal,
        isSpell: useSpell,
        multipliers: res.multipliedConversions,
      }
    }
    else if (isTotalPart(part)) {
      result = {
        type: 'damage',
        name: part.name,
        display: part.display ?? true,
        normalMin: [0, 0, 0, 0, 0, 0],
        normalMax: [0, 0, 0, 0, 0, 0],
        normalTotal: [0, 0],
        critMin: [0, 0, 0, 0, 0, 0],
        critMax: [0, 0, 0, 0, 0, 0],
        critTotal: [0, 0],
        isSpell: useSpell,
        multipliers: [0, 0, 0, 0, 0, 0],
      }
      for (const [subName, hits] of Object.entries(part.hits)) {
        const sub = evalPart(subName)
        if (!sub)
          continue
        for (const key of COMBINE_KEYS) {
          const target = result[key] as number[]
          const source = sub[key] as number[]
          for (let i = 0; i < target.length; ++i)
            target[i]! += source[i]! * hits
        }
      }
    }
    else {
      throw new Error(`Unsupported spell part "${part.name}": heal parts are not supported (deferred to a later milestone)`)
    }

    evaluated.set(name, result)
    return result
  }

  return spell.parts.map(part => evalPart(part.name)!)
}
