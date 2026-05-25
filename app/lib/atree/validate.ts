import type { AtreeNode, AtreeSelection } from '../types/atree'

/** Level → ability-point cap table (port of hppeng atree_validate). Index 0 unused. */
const AP_TABLE: number[] = [
  0,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  8,
  8,
  9,
  9,
  10,
  11,
  11,
  12,
  12,
  13,
  14,
  14,
  15,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  30,
  30,
  31,
  31,
  32,
  32,
  33,
  33,
  34,
  34,
  34,
  35,
  35,
  35,
  36,
  36,
  36,
  37,
  37,
  37,
  38,
  38,
  38,
  38,
  39,
  39,
  39,
  39,
  40,
  40,
  40,
  40,
  41,
  41,
  41,
  41,
  42,
  42,
  42,
  42,
  43,
  43,
  43,
  43,
  44,
  44,
  44,
  44,
  45,
  45,
  45,
  46,
  46,
  46,
  47,
  47,
  47,
  48,
  48,
  48,
  49,
  49,
  49,
  49,
  50,
  50,
]

export type ActivationResult = [ok: boolean, hardError: boolean, reason: string]

export function abilCanActivate(
  node: AtreeNode,
  stateById: Map<number, AtreeNode>,
  reachable: Set<number>,
  archetypeCount: Map<string, number>,
  pointsRemain: number,
): ActivationResult {
  const { parents, ability } = node
  if (parents.length === 0)
    return [true, false, '']

  const failedDeps: number[] = []
  for (const depId of ability.dependencies) {
    if (!reachable.has(depId))
      failedDeps.push(depId)
  }
  if (failedDeps.length > 0) {
    const names = failedDeps.map(i => `"${stateById.get(i)!.ability.display_name}"`)
    return [false, true, `missing dep: ${names.join(', ')}`]
  }

  const blocking: number[] = []
  for (const blockerId of ability.blockers) {
    if (reachable.has(blockerId))
      blocking.push(blockerId)
  }
  if (blocking.length > 0) {
    const names = blocking.map(i => `"${stateById.get(i)!.ability.display_name}"`)
    return [false, true, `blocked by: ${names.join(', ')}`]
  }

  let nodeReachable = false
  for (const parent of parents) {
    if (reachable.has(parent.ability.id)) {
      nodeReachable = true
      break
    }
  }
  if (!nodeReachable)
    return [false, false, 'not reachable']

  if (ability.archetype_req !== undefined && ability.archetype_req !== 0) {
    const reqArchetype = (ability.req_archetype !== undefined && ability.req_archetype !== '')
      ? ability.req_archetype
      : ability.archetype
    const others = (reqArchetype ? archetypeCount.get(reqArchetype) : 0) || 0
    if (others < ability.archetype_req)
      return [false, false, `${reqArchetype}: ${others} < ${ability.archetype_req}`]
  }

  if (ability.cost > pointsRemain)
    return [false, false, 'not enough ability points left']

  return [true, false, '']
}

export interface AtreeValidation {
  reachable: Set<number>
  apTotal: number
  apCap: number
  archetypeCount: Map<string, number>
  errors: string[]
  hardError: boolean
}

/**
 * Validate a selection against the sorted tree.
 * Port of hppeng builder/atree.js atree_validate (DOM/rendering removed).
 */
export function validateAtree(
  sorted: AtreeNode[],
  selection: AtreeSelection,
  level: number,
): AtreeValidation {
  const stateById = new Map<number, AtreeNode>()
  for (const node of sorted)
    stateById.set(node.ability.id, node)

  if (sorted.length === 0)
    return { reachable: new Set(), apTotal: 0, apCap: 50, archetypeCount: new Map(), errors: ['no atree data'], hardError: false }

  let toAdd: Array<[AtreeNode, string, boolean]> = []
  for (const node of sorted) {
    if (selection.get(node.ability.id))
      toAdd.push([node, 'not reachable', false])
  }

  const reachable = new Set<number>()
  let apTotal = 0
  const archetypeCount = new Map<string, number>()

  for (;;) {
    const next: Array<[AtreeNode, string, boolean]> = []
    for (const [node] of toAdd) {
      const { ability } = node
      const [ok, hardError, reason] = abilCanActivate(node, stateById, reachable, archetypeCount, 9999)
      if (!ok) {
        next.push([node, reason, hardError])
        continue
      }
      if (ability.archetype !== undefined && ability.archetype !== '')
        archetypeCount.set(ability.archetype, (archetypeCount.get(ability.archetype) ?? 0) + 1)

      apTotal += ability.cost
      reachable.add(ability.id)
    }
    if (toAdd.length === next.length) {
      toAdd = next
      break
    }
    toAdd = next
  }

  const apCap = Number.isNaN(level) ? 50 : (AP_TABLE[level] ?? 50)

  let hardError = false
  const errors: string[] = []
  if (apTotal > apCap)
    errors.push(`too many ability points assigned! (${apTotal} > ${apCap})`)
  for (const [node, reason, hardness] of toAdd) {
    if (hardness)
      hardError = true
    errors.push(`${node.ability.display_name}: ${reason}`)
  }

  return { reachable, apTotal, apCap, archetypeCount, errors, hardError }
}
