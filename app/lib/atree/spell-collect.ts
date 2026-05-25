// app/lib/atree/spell-collect.ts
import type { Spell, SpellPart } from '../math/spells'
import type { MergedAbility } from './effect-types'
import { DEFAULT_SPELLS } from '../math/spells'

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

  return spells
}
