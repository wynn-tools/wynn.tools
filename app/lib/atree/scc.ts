/** Minimal graph-node shape the SCC algorithm needs. */
export interface SccNode {
  children: this[]
  parents: this[]
  visited?: boolean
  assigned?: boolean
  scc?: Scc | null
  [key: string]: unknown
}

export interface Scc {
  index: number
  nodes: SccNode[]
  children: Set<Scc>
  parents: Set<Scc>
}

/**
 * Kosaraju's SCC algorithm. Port of hppeng utils.js make_SCC_graph.
 * Returns SCCs; for a DAG this is a valid reverse-topological grouping where
 * the root's SCC is first.
 */
export function makeSccGraph(root: SccNode, nodes: Iterable<SccNode>): Scc[] {
  for (const node of nodes) {
    node.visited = false
    node.assigned = false
    node.scc = null
  }
  const res: SccNode[] = []
  function visit(u: SccNode) {
    if (u.visited)
      return
    u.visited = true
    for (const child of u.children) {
      if (!child.visited)
        visit(child)
    }
    res.push(u)
  }
  visit(root)
  res.reverse()

  const sccs: Scc[] = []
  function assign(node: SccNode, curScc: Scc) {
    if (node.assigned)
      return
    curScc.nodes.push(node)
    node.scc = curScc
    node.assigned = true
    for (const parent of node.parents)
      assign(parent, curScc)
  }
  let idx = 0
  for (const node of res) {
    if (node.assigned)
      continue
    const curScc: Scc = { index: idx, nodes: [], children: new Set(), parents: new Set() }
    assign(node, curScc)
    sccs.push(curScc)
    idx += 1
  }
  for (const scc of sccs) {
    for (const node of scc.nodes) {
      for (const child of node.children)
        scc.children.add(child.scc!)
      for (const parent of node.parents)
        scc.parents.add(parent.scc!)
    }
  }
  return sccs
}
