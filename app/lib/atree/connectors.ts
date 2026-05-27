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
const NODE_CDN = 'https://cdn.wynn.tools/nextgen/abilities/2.1/nodes'

// Detect rich official asset values (future enriched data):
// - starts with "abilityTree." (strip it, use remainder as base)
// - matches ^(node|ultimate)[A-Z] e.g. "nodeWhite", "ultimateBoltslinger"
const RICH_ASSET_RE = /^(?:node|ultimate)[A-Z]/

export type NodeVariant = 'base' | 'active' | 'pulse'

const VARIANT_SUFFIX: Record<NodeVariant, string> = {
  base: '',
  active: '_active',
  pulse: '_pulse',
}

export function nodeImageUrl(icon: string | undefined, variant: NodeVariant = 'base'): string {
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
  return `${NODE_CDN}/abilityTree.${base}${VARIANT_SUFFIX[variant]}.png`
}

export interface ConnectorDirs { up: boolean, right: boolean, down: boolean, left: boolean }
export interface ConnectorCell { dirs: ConnectorDirs, activeDirs: ConnectorDirs }

function emptyDirs(): ConnectorDirs {
  return { up: false, right: false, down: false, left: false }
}

export function anyDir(d: ConnectorDirs): boolean {
  return d.up || d.right || d.down || d.left
}

export function dirsEqual(a: ConnectorDirs, b: ConnectorDirs): boolean {
  return a.up === b.up && a.right === b.right && a.down === b.down && a.left === b.left
}

export function computeAtreeConnectors(nodes: AtreeNode[], activeIds?: Set<number>): Map<string, ConnectorCell> {
  const map = new Map<string, ConnectorCell>()
  const mark = (row: number, col: number, dir: keyof ConnectorDirs, pathActive: boolean) => {
    const key = `${row},${col}`
    let cell = map.get(key)
    if (!cell) {
      cell = { dirs: emptyDirs(), activeDirs: emptyDirs() }
      map.set(key, cell)
    }
    cell.dirs[dir] = true
    if (pathActive)
      cell.activeDirs[dir] = true
  }
  for (const node of nodes) {
    const c = node.ability.display as { row: number, col: number }
    for (const parent of node.parents) {
      const p = parent.ability.display as { row: number, col: number }
      const pathActive = activeIds != null
        && activeIds.has(node.ability.id)
        && activeIds.has((parent as AtreeNode).ability.id)
      // vertical (in child column, between parent.row and child.row, exclusive)
      for (let row = c.row - 1; row > p.row; row--) {
        mark(row, c.col, 'up', pathActive)
        mark(row, c.col, 'down', pathActive)
      }
      // horizontal (in parent row, between the columns, exclusive)
      const lo = Math.min(p.col, c.col)
      const hi = Math.max(p.col, c.col)
      for (let col = lo + 1; col < hi; col++) {
        mark(p.row, col, 'left', pathActive)
        mark(p.row, col, 'right', pathActive)
      }
      // corner
      if (p.row !== c.row && p.col !== c.col) {
        mark(p.row, c.col, 'down', pathActive)
        mark(p.row, c.col, p.col > c.col ? 'right' : 'left', pathActive)
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
