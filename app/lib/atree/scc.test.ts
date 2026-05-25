import type { SccNode } from './scc'
import { describe, expect, it } from 'vitest'
import { makeSccGraph } from './scc'

function node(id: number): SccNode {
  return { id, children: [], parents: [] }
}
function link(parent: SccNode, child: SccNode) {
  parent.children.push(child)
  child.parents.push(parent)
}

describe('makeSccGraph', () => {
  it('orders an acyclic chain topologically, one node per SCC', () => {
    const head = node(1)
    const a = node(2)
    const b = node(3)
    link(head, a)
    link(a, b)
    const sccs = makeSccGraph(head, [head, a, b])
    expect(sccs.map(s => s.nodes.map(n => (n as SccNode).id))).toEqual([[1], [2], [3]])
  })

  it('collapses a 2-cycle into a single SCC', () => {
    const head = node(1)
    const a = node(2)
    const b = node(3)
    link(head, a)
    link(a, b)
    link(b, a) // a <-> b cycle
    const sccs = makeSccGraph(head, [head, a, b])
    const cycleScc = sccs.find(s => s.nodes.length > 1)
    expect(cycleScc).toBeDefined()
    expect(new Set(cycleScc!.nodes.map(n => (n as SccNode).id))).toEqual(new Set([2, 3]))
  })
})
