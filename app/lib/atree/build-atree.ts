import type { AtreeData, AtreeNode } from '../types/atree'
import type { SccNode } from './scc'
import { makeSccGraph } from './scc'

/**
 * Build and topologically sort a class's ability tree.
 * Port of hppeng builder/atree.js get_sorted_class_atree.
 * The output ordering and per-node `children` order are load-bearing: the codec
 * encodes node selections as a pre-order DFS over `head.children`.
 */
export function getSortedClassAtree(data: AtreeData, className: string): AtreeNode[] {
  const raw = data[className]
  if (!raw || raw.length === 0)
    return []

  const nodeMap = new Map<number, AtreeNode>()
  let head: AtreeNode | undefined
  for (const ability of raw) {
    nodeMap.set(ability.id, { ability, parents: [], children: [] })
    if (ability.parents.length === 0)
      head = nodeMap.get(ability.id)
  }
  if (!head)
    return []

  // Wire parents/children in raw array order.
  for (const ability of raw) {
    const node = nodeMap.get(ability.id)!
    const parents: AtreeNode[] = []
    for (const parentId of ability.parents) {
      const parentNode = nodeMap.get(parentId)!
      parentNode.children.push(node)
      parents.push(parentNode)
    }
    node.parents = parents
  }

  const sccs = makeSccGraph(head as unknown as SccNode, nodeMap.values() as unknown as Iterable<SccNode>)
  const sorted: AtreeNode[] = []
  for (const scc of sccs) {
    for (const sccNode of scc.nodes) {
      const node = sccNode as unknown as AtreeNode & SccNode
      delete node.visited
      delete node.assigned
      delete node.scc
      sorted.push(node)
    }
  }
  return sorted
}
