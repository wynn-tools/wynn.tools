export interface ClusterPoint { id: string, x: number, y: number, cat: string }
export interface ClusterGroup {
  cat: string
  cx: number
  cy: number
  members: ClusterPoint[]
}

export function clusterByScreenDistance(
  pts: ClusterPoint[],
  radius: number,
): ClusterGroup[] {
  const out: ClusterGroup[] = []
  const claimed = new Uint8Array(pts.length)
  const r2 = radius * radius
  for (let i = 0; i < pts.length; i++) {
    if (claimed[i])
      continue
    const p = pts[i]
    const group: ClusterGroup = { cat: p.cat, cx: p.x, cy: p.y, members: [p] }
    claimed[i] = 1
    for (let j = i + 1; j < pts.length; j++) {
      if (claimed[j])
        continue
      const q = pts[j]
      if (q.cat !== p.cat)
        continue
      const dx = q.x - group.cx
      const dy = q.y - group.cy
      if (dx * dx + dy * dy <= r2) {
        group.members.push(q)
        claimed[j] = 1
        group.cx = (group.cx * (group.members.length - 1) + q.x) / group.members.length
        group.cy = (group.cy * (group.members.length - 1) + q.y) / group.members.length
      }
    }
    out.push(group)
  }
  return out
}
