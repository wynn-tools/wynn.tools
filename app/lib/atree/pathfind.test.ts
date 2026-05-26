import type { AtreeNode } from '../types/atree'
import { describe, expect, it } from 'vitest'
import { unlockPathTo } from './pathfind'

/** Minimal node factory. Wire `.parents` and `.children` after building all nodes. */
function makeNode(
  id: number,
  parentIds: number[] = [],
  deps: number[] = [],
  blockers: number[] = [],
  row = 0,
  col = id,
): AtreeNode {
  return {
    ability: {
      id,
      display_name: `n${id}`,
      desc: '',
      parents: parentIds,
      dependencies: deps,
      blockers,
      cost: 1,
      display: { row, col, icon: 'node_0' } as unknown as undefined,
    },
    parents: [],
    children: [],
  }
}

/** Wire parent/child references given a list of [parent, child] edges. */
function wire(nodes: AtreeNode[], edges: [number, number][]): void {
  const byId = new Map<number, AtreeNode>()
  for (const n of nodes) byId.set(n.ability.id, n)
  for (const [pid, cid] of edges) {
    const parent = byId.get(pid)!
    const child = byId.get(cid)!
    child.parents.push(parent)
    parent.children.push(child)
  }
}

describe('unlockPathTo', () => {
  // (a) Linear chain: 0(root) → 1 → 2 → 3
  it('(a) linear chain: unlocking node 3 from empty adds 0,1,2,3', () => {
    const n0 = makeNode(0, [], [], [], 0, 0)
    const n1 = makeNode(1, [0], [], [], 1, 0)
    const n2 = makeNode(2, [1], [], [], 2, 0)
    const n3 = makeNode(3, [2], [], [], 3, 0)
    const nodes = [n0, n1, n2, n3]
    wire(nodes, [[0, 1], [1, 2], [2, 3]])

    const result = unlockPathTo(nodes, [], 3, 106)
    const resultSet = new Set(result)
    expect(resultSet.has(0)).toBe(true)
    expect(resultSet.has(1)).toBe(true)
    expect(resultSet.has(2)).toBe(true)
    expect(resultSet.has(3)).toBe(true)
  })

  // (b) Dependency: node 3 has dependencies:[4], node 4 is reachable from root 0
  it('(b) dependency: unlocking node 3 also adds its dependency node 4', () => {
    // 0(root) → 1 → 3; 0(root) → 4 (dependency of 3)
    const n0 = makeNode(0, [], [], [], 0, 0)
    const n1 = makeNode(1, [0], [], [], 1, 0)
    const n4 = makeNode(4, [0], [], [], 1, 2)
    const n3 = makeNode(3, [1], [4], [], 2, 0) // depends on 4
    const nodes = [n0, n1, n4, n3]
    wire(nodes, [[0, 1], [0, 4], [1, 3]])

    const result = unlockPathTo(nodes, [], 3, 106)
    const resultSet = new Set(result)
    expect(resultSet.has(3)).toBe(true)
    expect(resultSet.has(4)).toBe(true)
    expect(resultSet.has(0)).toBe(true)
  })

  // (c) Branching: node 3 has parents [1, 2b]; chain 0→1 (depth 1) vs 0→2a→2b (depth 2).
  //     Min-depth parent (1, depth=1) should be chosen → 2a and 2b should NOT be included.
  it('(c) branching: picks the shallower parent chain', () => {
    const n0 = makeNode(0, [], [], [], 0, 0)
    const n1 = makeNode(1, [0], [], [], 1, 0) // depth 1
    const n2a = makeNode(2, [0], [], [], 1, 2) // depth 1
    const n2b = makeNode(5, [2], [], [], 2, 2) // depth 2
    const n3 = makeNode(3, [1, 5], [], [], 3, 1) // parents: 1 (depth=1) or 5 (depth=2)
    const nodes = [n0, n1, n2a, n2b, n3]
    wire(nodes, [[0, 1], [0, 2], [2, 5], [1, 3], [5, 3]])

    const result = unlockPathTo(nodes, [], 3, 106)
    const resultSet = new Set(result)
    expect(resultSet.has(3)).toBe(true)
    expect(resultSet.has(1)).toBe(true)
    // The longer branch (2a=id2, 2b=id5) should NOT be needed
    expect(resultSet.has(5)).toBe(false) // 2b
    expect(resultSet.has(2)).toBe(false) // 2a
  })

  // (d) Blocked: node 3 has blockers:[5], and 5 is in current → returns current unchanged
  it('(d) blocked: returns current unchanged when a blocker is active', () => {
    const n0 = makeNode(0, [], [], [], 0, 0)
    const n5 = makeNode(5, [0], [], [], 1, 2) // blocker node (also child of root)
    const n1 = makeNode(1, [0], [], [], 1, 0)
    const n2 = makeNode(2, [1], [], [], 2, 0)
    const n3 = makeNode(3, [2], [], [5], 3, 0) // blocked by 5
    const nodes = [n0, n5, n1, n2, n3]
    wire(nodes, [[0, 5], [0, 1], [1, 2], [2, 3]])

    const current = [0, 5, 1] // 5 is active (blocker of 3)
    const result = unlockPathTo(nodes, current, 3, 106)
    // Should return current unchanged (3 not added)
    expect(new Set(result).has(3)).toBe(false)
    expect(result).toEqual(expect.arrayContaining(current))
    expect(result.length).toBe(current.length)
  })
})
