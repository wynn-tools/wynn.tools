import type { MaterialCriteria, SearchMaterial } from './types'

function matches(mat: SearchMaterial, c: MaterialCriteria): boolean {
  if (c.name && !mat.displayName.toLowerCase().includes(c.name.toLowerCase()))
    return false
  if (c.subTypes.length && !c.subTypes.includes(mat.subType))
    return false
  if (mat.level < c.levelRange[0] || mat.level > c.levelRange[1])
    return false
  return true
}

export function filterMaterials(list: SearchMaterial[], c: MaterialCriteria): SearchMaterial[] {
  return list.filter(m => matches(m, c))
}
