import type { AtreeNode } from '../types/atree'

export interface ConnectorDirs { up: boolean, right: boolean, down: boolean, left: boolean }

export function computeAtreeConnectors(nodes: AtreeNode[]): Map<string, ConnectorDirs> {
  const map = new Map<string, ConnectorDirs>()
  const mark = (row: number, col: number, dir: keyof ConnectorDirs) => {
    const key = `${row},${col}`
    let d = map.get(key)
    if (!d) {
      d = { up: false, right: false, down: false, left: false }
      map.set(key, d)
    }
    d[dir] = true
  }
  for (const node of nodes) {
    const c = node.ability.display as { row: number, col: number }
    for (const parent of node.parents) {
      const p = parent.ability.display as { row: number, col: number }
      // vertical (in child column, between parent.row and child.row, exclusive)
      for (let row = c.row - 1; row > p.row; row--) {
        mark(row, c.col, 'up')
        mark(row, c.col, 'down')
      }
      // horizontal (in parent row, between the columns, exclusive)
      const lo = Math.min(p.col, c.col)
      const hi = Math.max(p.col, c.col)
      for (let col = lo + 1; col < hi; col++) {
        mark(p.row, col, 'left')
        mark(p.row, col, 'right')
      }
      // corner
      if (p.row !== c.row && p.col !== c.col) {
        mark(p.row, c.col, 'down')
        mark(p.row, c.col, p.col > c.col ? 'right' : 'left')
      }
    }
  }
  return map
}

export function connectorTileName(d: ConnectorDirs): string {
  const parts: string[] = []
  if (d.up)
    parts.push('up')
  if (d.right)
    parts.push('right')
  if (d.down)
    parts.push('down')
  if (d.left)
    parts.push('left')
  return `connector_${parts.join('_')}`
}
