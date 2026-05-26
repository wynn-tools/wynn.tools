import type { Lootrun, WorldPosition } from '~/types/map'

const MAX_POINTS = 50000
const COORD_LIMIT = 25000

export function parseLootrun(
  raw: string,
): Required<Pick<Lootrun, 'points' | 'chests' | 'bbox' | 'blockDistance'>> {
  let data: any
  try {
    data = JSON.parse(raw)
  }
  catch {
    throw new Error('Invalid JSON')
  }
  if (!data || !Array.isArray(data.points))
    throw new Error('Expected { points: [...] }')
  if (data.points.length < 2)
    throw new Error('Lootrun needs at least 2 points')

  const points: WorldPosition[] = []
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of data.points) {
    if (typeof p?.x !== 'number' || typeof p?.y !== 'number' || typeof p?.z !== 'number')
      throw new Error('Each point must have numeric x/y/z')
    if (Math.abs(p.x) > COORD_LIMIT || Math.abs(p.z) > COORD_LIMIT)
      throw new Error('Point coordinates out of range')
    points.push({ x: p.x, y: p.y, z: p.z })
    if (p.x < minX)
      minX = p.x
    if (p.x > maxX)
      maxX = p.x
    if (p.z < minZ)
      minZ = p.z
    if (p.z > maxZ)
      maxZ = p.z
  }

  const decimated
    = points.length > MAX_POINTS
      ? Array.from(
          { length: MAX_POINTS },
          (_, i) => points[Math.floor((i * points.length) / MAX_POINTS)],
        )
      : points

  let dist = 0
  for (let i = 1; i < decimated.length; i++) {
    const dx = decimated[i].x - decimated[i - 1].x
    const dz = decimated[i].z - decimated[i - 1].z
    dist += Math.sqrt(dx * dx + dz * dz)
  }

  const chests: WorldPosition[] = []
  if (Array.isArray(data.chests)) {
    for (const c of data.chests) {
      if (typeof c?.x !== 'number' || typeof c?.y !== 'number' || typeof c?.z !== 'number')
        throw new Error('Each chest must have numeric x/y/z')
      if (Math.abs(c.x) > COORD_LIMIT || Math.abs(c.z) > COORD_LIMIT)
        throw new Error('Chest coordinates out of range')
      chests.push({ x: c.x, y: c.y, z: c.z })
    }
  }

  return {
    points: decimated,
    chests,
    bbox: { x1: minX, x2: maxX, z1: minZ, z2: maxZ },
    blockDistance: dist,
  }
}
