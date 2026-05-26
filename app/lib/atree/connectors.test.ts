import type { AtreeNode } from '../types/atree'
import { describe, expect, it } from 'vitest'
import { computeAtreeConnectors, connectorTileName, nodeColor, nodeImageUrl } from './connectors'

function makeNode(
  id: number,
  row: number,
  col: number,
): AtreeNode {
  return {
    ability: {
      id,
      display_name: `node_${id}`,
      desc: '',
      parents: [],
      dependencies: [],
      blockers: [],
      cost: 0,
      display: { row, col, icon: '' },
    },
    parents: [],
    children: [],
  }
}

describe('computeAtreeConnectors', () => {
  /**
   * Tree layout:
   *   P  at (0,4)
   *   childA at (2,4)  — directly below P
   *   childB at (2,6)  — below-and-right of P
   *
   * Hand-derived cells:
   *
   * Edge P→childA (p=(0,4), c=(2,4)):
   *   vertical: row=1 at col=4 → (1,4) up+down
   *   horizontal: lo=4, hi=4 — no cols in (4,4) exclusive → nothing
   *   corner: p.col==c.col → no corner
   *
   * Edge P→childB (p=(0,4), c=(2,6)):
   *   vertical: row=1 at col=6 → (1,6) up+down
   *   horizontal: lo=4, hi=6, col=5 → (0,5) left+right
   *   corner: p.row≠c.row && p.col≠c.col → at (parent.row=0, child.col=6)
   *     = (0,6) down + left  (p.col=4 < c.col=6 → left)
   *
   * Total cells:
   *   "1,4"  → up+down
   *   "1,6"  → up+down
   *   "0,5"  → left+right
   *   "0,6"  → down+left
   */
  it('computes correct connector cells for a 3-node tree', () => {
    const P = makeNode(1, 0, 4)
    const childA = makeNode(2, 2, 4)
    const childB = makeNode(3, 2, 6)

    childA.parents = [P]
    childB.parents = [P]

    const nodes: AtreeNode[] = [P, childA, childB]
    const result = computeAtreeConnectors(nodes)

    // childA vertical cell (1,4): up+down, no left/right
    const cell_1_4 = result.get('1,4')
    expect(cell_1_4).toBeDefined()
    expect(cell_1_4!.up).toBe(true)
    expect(cell_1_4!.down).toBe(true)
    expect(cell_1_4!.left).toBe(false)
    expect(cell_1_4!.right).toBe(false)

    // childB vertical cell (1,6): up+down
    const cell_1_6 = result.get('1,6')
    expect(cell_1_6).toBeDefined()
    expect(cell_1_6!.up).toBe(true)
    expect(cell_1_6!.down).toBe(true)
    expect(cell_1_6!.left).toBe(false)
    expect(cell_1_6!.right).toBe(false)

    // childB horizontal cell (0,5): left+right
    const cell_0_5 = result.get('0,5')
    expect(cell_0_5).toBeDefined()
    expect(cell_0_5!.left).toBe(true)
    expect(cell_0_5!.right).toBe(true)
    expect(cell_0_5!.up).toBe(false)
    expect(cell_0_5!.down).toBe(false)

    // childB corner cell (0,6): down+left
    // (parent.row=0, child.col=6); p.col=4 < c.col=6 → left
    const cell_0_6 = result.get('0,6')
    expect(cell_0_6).toBeDefined()
    expect(cell_0_6!.down).toBe(true)
    expect(cell_0_6!.left).toBe(true)
    expect(cell_0_6!.up).toBe(false)
    expect(cell_0_6!.right).toBe(false)

    // Total: exactly 4 connector cells
    expect(result.size).toBe(4)
  })

  it('oR-merges directions for shared cells (multiple edges touching same cell)', () => {
    // A→B and A→C where C is to the left of B
    // Use: A at (0,4), B at (2,4), C at (2,2)
    // Edge A→B: vertical (1,4) up+down; no horizontal; no corner (same col)
    // Edge A→C: p=(0,4), c=(2,2)
    //   vertical: (1,2) up+down
    //   horizontal: lo=2, hi=4, col=3 → (0,3) left+right
    //   corner: p.row≠c.row && p.col≠c.col → (0,2) down + right (p.col=4 > c.col=2)
    const A = makeNode(1, 0, 4)
    const B = makeNode(2, 2, 4)
    const C = makeNode(3, 2, 2)
    B.parents = [A]
    C.parents = [A]

    const result = computeAtreeConnectors([A, B, C])

    const cell_1_4 = result.get('1,4')
    expect(cell_1_4?.up).toBe(true)
    expect(cell_1_4?.down).toBe(true)

    const cell_1_2 = result.get('1,2')
    expect(cell_1_2?.up).toBe(true)
    expect(cell_1_2?.down).toBe(true)

    const cell_0_3 = result.get('0,3')
    expect(cell_0_3?.left).toBe(true)
    expect(cell_0_3?.right).toBe(true)

    // Corner at (0,2): down + right (p.col=4 > c.col=2)
    const cell_0_2 = result.get('0,2')
    expect(cell_0_2?.down).toBe(true)
    expect(cell_0_2?.right).toBe(true)
    expect(cell_0_2?.left).toBe(false)
  })
})

describe('nodeColor', () => {
  it('maps node_0 to nodeWhite', () => {
    expect(nodeColor('node_0')).toBe('nodeWhite')
  })
  it('maps node_3 to nodeRed', () => {
    expect(nodeColor('node_3')).toBe('nodeRed')
  })
  it('maps node_shaman to nodeShaman', () => {
    expect(nodeColor('node_shaman')).toBe('nodeShaman')
  })
  it('defaults undefined to nodeWhite', () => {
    expect(nodeColor(undefined)).toBe('nodeWhite')
  })
})

describe('nodeImageUrl', () => {
  it('builds active URL ending with abilityTree.nodeYellow_active.png', () => {
    expect(nodeImageUrl('node_1', true)).toMatch(/abilityTree\.nodeYellow_active\.png$/)
  })
  it('forward-compat: passes ultimateBoltslinger directly (no _active)', () => {
    expect(nodeImageUrl('ultimateBoltslinger', false)).toMatch(/abilityTree\.ultimateBoltslinger\.png$/)
  })
  it('forward-compat: strips abilityTree. prefix and appends _active', () => {
    expect(nodeImageUrl('abilityTree.nodeArcher', true)).toMatch(/abilityTree\.nodeArcher_active\.png$/)
  })
})

describe('connectorTileName', () => {
  it('returns connector_up_down for up+down only', () => {
    expect(
      connectorTileName({ up: true, right: false, down: true, left: false }),
    ).toBe('connector_up_down')
  })

  it('returns connector_right_down_left for right+down+left', () => {
    expect(
      connectorTileName({ up: false, right: true, down: true, left: true }),
    ).toBe('connector_right_down_left')
  })

  it('returns connector_left_right for left+right (all four false except those)', () => {
    expect(
      connectorTileName({ up: false, right: true, down: false, left: true }),
    ).toBe('connector_right_left')
  })

  it('uses canonical order up→right→down→left', () => {
    expect(
      connectorTileName({ up: true, right: true, down: true, left: true }),
    ).toBe('connector_up_right_down_left')
  })
})
