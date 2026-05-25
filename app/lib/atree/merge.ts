// app/lib/atree/merge.ts
import type { AtreeAbility, AtreeNode, AtreeSelection } from '../types/atree'
import type { AtreeEffect, MergedAbility } from './effect-types'
import { DEFAULT_ABILITIES } from './effect-types'

function abilityEffects(ability: AtreeAbility): AtreeEffect[] {
  return (ability.effects as AtreeEffect[] | undefined) ?? []
}
function abilityProperties(ability: AtreeAbility): Record<string, number> {
  return (ability.properties as Record<string, number> | undefined) ?? {}
}

/**
 * Merge active ability-tree selections + per-class default abilities into one map.
 * Port of atree.js atree_merge (selected nodes + default_abils only; major-IDs/aspects deferred).
 */
export function mergeAtree(
  sortedNodes: AtreeNode[],
  selection: AtreeSelection,
  className: string,
): Map<number, MergedAbility> {
  const merged = new Map<number, MergedAbility>()
  for (const def of DEFAULT_ABILITIES[className] ?? [])
    merged.set(def.id, structuredClone(def))

  function mergeAbil(ability: AtreeAbility): void {
    if (ability.base_abil !== undefined) {
      const base = merged.get(ability.base_abil)
      if (!base)
        return // base missing → no-op, matching hppeng
      base.effects = base.effects.concat(structuredClone(abilityEffects(ability)))
      const props = abilityProperties(ability)
      for (const propName in props) {
        if (propName in base.properties)
          base.properties[propName]! += props[propName]!
        else
          base.properties[propName] = props[propName]!
      }
      return
    }
    merged.set(ability.id, {
      id: ability.id,
      effects: structuredClone(abilityEffects(ability)),
      properties: { ...abilityProperties(ability) },
    })
  }

  for (const node of sortedNodes) {
    if (!selection.get(node.ability.id))
      continue
    mergeAbil(node.ability)
  }

  return merged
}
