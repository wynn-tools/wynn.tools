import type { Aspect, RawAspectData } from '../types/aspect'

export const NONE_ASPECT: Aspect = {
  displayName: 'No Aspect',
  id: 256,
  tier: 'Normal',
  tiers: [],
  NONE: true,
}

export interface AspectDb {
  /** class name -> (aspect id -> aspect). */
  byClass: Map<string, Map<number, Aspect>>
}

export function buildAspectDb(data: RawAspectData): AspectDb {
  const byClass = new Map<string, Map<number, Aspect>>()
  for (const className of Object.keys(data)) {
    const idMap = new Map<number, Aspect>()
    idMap.set(NONE_ASPECT.id, NONE_ASPECT)
    for (const aspect of data[className]!) {
      aspect.NONE = false
      idMap.set(aspect.id, aspect)
    }
    byClass.set(className, idMap)
  }
  return { byClass }
}
