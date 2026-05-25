import type { AtreeNode } from '../types/atree'
import type { BitVectorCursor } from './bit-vector'
import { BitVector } from './bit-vector'

/**
 * Encode the active-node selection as a pre-order DFS over head.children.
 * Port of build_encode_decode.js encodeAtree. One bit per child: 1 = active (recurse), 0 = inactive.
 */
export function encodeAtree(sorted: AtreeNode[], activeIds: Set<number>): BitVector {
  const vec = new BitVector(0, 0)
  const head = sorted[0]
  if (!head)
    return vec
  const visited = new Set<number>()
  function traverse(node: AtreeNode): void {
    for (const child of node.children) {
      const id = child.ability.id
      if (visited.has(id))
        continue
      visited.add(id)
      if (activeIds.has(id)) {
        vec.append(1, 1)
        traverse(child)
      }
      else {
        vec.append(0, 1)
      }
    }
  }
  traverse(head)
  return vec
}

/**
 * Decode the active-node selection. Port of build_encode_decode.js decodeAtree.
 * Returns the set of active ids (always includes the head).
 */
export function decodeAtree(sorted: AtreeNode[], cursor: BitVectorCursor): Set<number> {
  const active = new Set<number>()
  const head = sorted[0]
  if (!head)
    return active
  active.add(head.ability.id)
  const visited = new Set<number>()
  function traverse(node: AtreeNode): void {
    for (const child of node.children) {
      const id = child.ability.id
      if (visited.has(id))
        continue
      visited.add(id)
      if (cursor.advance() === 1) {
        active.add(id)
        traverse(child)
      }
    }
  }
  traverse(head)
  return active
}
