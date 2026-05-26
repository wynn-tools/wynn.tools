import type { AtreeNode } from '../types/atree'

const NODE_COLOR_BY_ICON: Record<string, string> = {
  node_0: 'nodeWhite',
  node_1: 'nodeYellow',
  node_2: 'nodePurple',
  node_3: 'nodeRed',
  node_4: 'nodeBlue',
  node_archer: 'nodeArcher',
  node_warrior: 'nodeWarrior',
  node_mage: 'nodeMage',
  node_assassin: 'nodeAssassin',
  node_shaman: 'nodeShaman',
}
export function nodeColor(icon: string | undefined): string {
  return (icon && NODE_COLOR_BY_ICON[icon]) || 'nodeWhite'
}
const NODE_CDN = 'https://cdn.wynncraft.com/nextgen/abilities/2.1/nodes'

// Detect rich official asset values (future enriched data):
// - starts with "abilityTree." (strip it, use remainder as base)
// - matches ^(node|ultimate)[A-Z] e.g. "nodeWhite", "ultimateBoltslinger"
const RICH_ASSET_RE = /^(?:node|ultimate)[A-Z]/

export function nodeImageUrl(icon: string | undefined, active: boolean): string {
  let base: string
  if (icon && icon.startsWith('abilityTree.')) {
    // strip prefix, use remainder directly
    base = icon.slice('abilityTree.'.length)
  }
  else if (icon && RICH_ASSET_RE.test(icon)) {
    // already a rich name like "nodeWhite" or "ultimateBoltslinger"
    base = icon
  }
  else {
    base = nodeColor(icon)
  }
  return `${NODE_CDN}/abilityTree.${base}${active ? '_active' : ''}.png`
}

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
