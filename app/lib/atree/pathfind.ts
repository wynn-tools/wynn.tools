import type { AtreeNode } from '../types/atree'
import { validateAtree } from './validate'

/** Convert a Set<number> into the AtreeSelection map validateAtree expects. */
function mapOf(s: Set<number>): Map<number, boolean> {
  return new Map([...s].map(id => [id, true] as [number, boolean]))
}

/**
 * Compute the minimum-edge depth of every node from a root
 * (BFS from parentless nodes over `.children`).
 */
function computeDepths(sorted: AtreeNode[]): Map<number, number> {
  const depth = new Map<number, number>()
  const queue: number[] = []

  for (const node of sorted) {
    if (node.ability.parents.length === 0) {
      depth.set(node.ability.id, 0)
      queue.push(node.ability.id)
    }
  }

  const byId = new Map<number, AtreeNode>()
  for (const node of sorted)
    byId.set(node.ability.id, node)

  let head = 0
  while (head < queue.length) {
    const id = queue[head++]!
    const node = byId.get(id)!
    const d = depth.get(id)!
    for (const child of node.children) {
      if (!depth.has(child.ability.id)) {
        depth.set(child.ability.id, d + 1)
        queue.push(child.ability.id)
      }
    }
  }

  return depth
}

/**
 * Auto-select the minimal prerequisite chain needed to make `targetId` reachable,
 * then return the new active-node-id set (as validated by `validateAtree`).
 *
 * Returns `[...current]` unchanged if:
 *  - an active blocker prevents reaching the target, or
 *  - the target simply cannot become reachable (no progress toward roots).
 */
export function unlockPathTo(
  sorted: AtreeNode[],
  current: Iterable<number>,
  targetId: number,
  level: number,
): number[] {
  const byId = new Map<number, AtreeNode>()
  for (const node of sorted)
    byId.set(node.ability.id, node)

  const depth = computeDepths(sorted)

  const currentArr = [...current]
  const sel = new Set<number>(currentArr)
  sel.add(targetId)

  for (let iter = 0; iter < 200; iter++) {
    const reachable = validateAtree(sorted, mapOf(sel), level).reachable
    if (reachable.has(targetId))
      break

    let progress = false
    for (const node of sorted) {
      if (!sel.has(node.ability.id) || reachable.has(node.ability.id))
        continue

      // If any active blocker is in sel, abort — the target's branch is blocked
      for (const blockerId of node.ability.blockers) {
        if (sel.has(blockerId))
          return currentArr
      }

      // Add any missing dependencies
      for (const depId of node.ability.dependencies) {
        if (!sel.has(depId)) {
          sel.add(depId)
          progress = true
        }
      }

      // If node has parents and none are in sel, pick the shallowest one
      if (node.ability.parents.length > 0) {
        const hasParentInSel = node.ability.parents.some(pid => sel.has(pid))
        if (!hasParentInSel) {
          // Pick the parent with smallest depth, tie-break by smallest id
          let bestParent: number | null = null
          let bestDepth = Infinity
          for (const pid of node.ability.parents) {
            const d = depth.get(pid) ?? Infinity
            if (
              d < bestDepth
              || (d === bestDepth && bestParent !== null && pid < bestParent)
            ) {
              bestDepth = d
              bestParent = pid
            }
          }
          if (bestParent !== null) {
            sel.add(bestParent)
            progress = true
          }
        }
      }
    }

    if (!progress)
      break
  }

  const finalReach = validateAtree(sorted, mapOf(sel), level).reachable
  if (finalReach.has(targetId))
    return [...finalReach]
  return currentArr
}
