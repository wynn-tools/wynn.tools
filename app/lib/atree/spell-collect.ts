// app/lib/atree/spell-collect.ts
import type { Spell, SpellPart } from '../math/spells'
import type { MergedAbility } from './effect-types'
import { DAMAGE_CLASSES } from '../math/constants'
import { DEFAULT_SPELLS, isDamagePart, isTotalPart } from '../math/spells'

type Raw = Record<string, unknown>

/** Resolve a hit/scaling value: number passes through; "id.prop" reads a merged ability property. */
export function atreeTranslate(merged: Map<number, MergedAbility>, v: number | string): number {
  if (typeof v === 'string') {
    const [idStr, propName] = v.split('.')
    const id = Number.parseInt(idStr!, 10)
    return merged.get(id)!.properties[propName!]!
  }
  return v
}

function resolveHits(rawHits: Record<string, number | string>, merged: Map<number, MergedAbility>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(rawHits))
    out[k] = atreeTranslate(merged, v)
  return out
}

/** Convert one raw spell part (snake_case) into a typed SpellPart, resolving hit references. */
function convertPart(raw: Raw, merged: Map<number, MergedAbility>): SpellPart {
  const name = raw.name as string
  const display = raw.display as boolean | undefined
  if ('multipliers' in raw) {
    return {
      name,
      multipliers: [...(raw.multipliers as number[])],
      useStr: raw.use_str as boolean | undefined,
      ignoredMults: raw.ignored_mults as string[] | undefined,
      display,
    }
  }
  if ('hits' in raw) {
    return { name, hits: resolveHits(raw.hits as Record<string, number | string>, merged), display }
  }
  // heal part — carried, not computed
  return { name, power: raw.power as number, ignoredMults: raw.ignored_mults as string[] | undefined, display }
}

/** Convert a raw replace_spell effect into a typed Spell. */
function convertReplaceSpell(effect: Raw, merged: Map<number, MergedAbility>): Spell {
  return {
    name: effect.name as string,
    baseSpell: effect.base_spell as number,
    scaling: effect.scaling as Spell['scaling'],
    useAtkspd: effect.use_atkspd as boolean | undefined,
    display: effect.display as string | undefined,
    cost: effect.cost as number | undefined,
    parts: (effect.parts as Raw[]).map(p => convertPart(p, merged)),
  }
}

/**
 * Assemble the build's spell map from the merged ability tree.
 * Port of atree.js atree_collect_spells — replace_spell pass (Task 1).
 * The default melee spell (baseSpell 0) is seeded from DEFAULT_SPELLS.
 */
export function collectAtreeSpells(merged: Map<number, MergedAbility>, weaponType: string): Map<number, Spell> {
  const spells = new Map<number, Spell>()
  const defaultMelee = DEFAULT_SPELLS.get(weaponType)
  if (defaultMelee)
    spells.set(0, structuredClone(defaultMelee))

  // Pass 1: replace_spell — replace/define whole spells.
  for (const ability of merged.values()) {
    for (const effect of ability.effects) {
      if (effect.type !== 'replace_spell')
        continue
      const converted = convertReplaceSpell(effect as Raw, merged)
      const existing = spells.get(converted.baseSpell)
      if (existing)
        Object.assign(existing, converted)
      else
        spells.set(converted.baseSpell, converted)
    }
  }

  // Pass 2: add_spell_prop + convert_spell_conv — modify existing spells.
  for (const ability of merged.values()) {
    for (const effect of ability.effects) {
      const raw = effect as Raw
      if (raw.type === 'add_spell_prop') {
        const baseSpell = raw.base_spell as number
        const spell = spells.get(baseSpell)
        if (!spell)
          continue
        const cost = (raw.cost as number) ?? 0
        if (typeof spell.cost === 'number')
          spell.cost += cost
        const targetPart = (raw.target_part as string | null | undefined) ?? null
        if (targetPart !== null) {
          const behavior = (raw.behavior as string) ?? 'merge'
          let found = false
          for (const part of spell.parts) {
            if (part.name !== targetPart)
              continue
            if ('multipliers' in raw && isDamagePart(part)) {
              const mults = raw.multipliers as number[]
              for (let i = 0; i < mults.length; ++i)
                part.multipliers[i] = behavior === 'overwrite' ? mults[i]! : part.multipliers[i]! + mults[i]!
            }
            else if ('power' in raw && 'power' in part) {
              const p = part as { power: number }
              p.power = behavior === 'overwrite' ? (raw.power as number) : p.power + (raw.power as number)
            }
            else if ('hits' in raw && isTotalPart(part)) {
              for (const [idx, v] of Object.entries(raw.hits as Record<string, number | string>)) {
                const val = atreeTranslate(merged, v)
                part.hits[idx] = behavior === 'overwrite' ? val : (part.hits[idx] ?? 0) + val
              }
            }
            if (raw.hide)
              part.display = false
            if ('ignored_mults' in raw && (isDamagePart(part) || 'power' in part)) {
              const p = part as { ignoredMults?: string[] }
              const add = raw.ignored_mults as string[]
              p.ignoredMults = p.ignoredMults ? p.ignoredMults.concat(add) : add
            }
            found = true
            break
          }
          if (!found && behavior === 'merge') {
            const newPart = convertPart({ ...raw, name: targetPart }, merged)
            if (raw.hide)
              newPart.display = false
            spell.parts.push(newPart)
          }
        }
        if ('display' in raw)
          spell.display = raw.display as string
      }
      else if (raw.type === 'convert_spell_conv') {
        const spell = spells.get(raw.base_spell as number)
        if (!spell)
          continue
        const targetPart = raw.target_part as string
        const elemIdx = DAMAGE_CLASSES.indexOf(raw.conversion as typeof DAMAGE_CLASSES[number])
        const all = targetPart === 'all'
        for (const part of spell.parts) {
          if ((all || part.name === targetPart) && isDamagePart(part)) {
            let totalConv = 0
            for (let i = 1; i < 6; ++i)
              totalConv += part.multipliers[i]!
            const newConv = [part.multipliers[0]!, 0, 0, 0, 0, 0]
            newConv[elemIdx] = totalConv
            part.multipliers = newConv
          }
        }
      }
    }
  }

  return spells
}
