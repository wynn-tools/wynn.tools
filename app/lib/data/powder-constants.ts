import type { PowderElement } from '../types/powder'

export const SKP_ELEMENTS: PowderElement[] = ['e', 't', 'w', 'f', 'a']
export const POWDER_TIERS = 7

export const POWDER_ID_BY_NAME = new Map<string, number>()
export const POWDER_NAME_BY_ID = new Map<number, string>()

let _powderId = 0
for (const element of SKP_ELEMENTS) {
  for (let tier = 1; tier <= POWDER_TIERS; tier++) {
    const name = `${element}${tier}`
    POWDER_ID_BY_NAME.set(name, _powderId)
    POWDER_NAME_BY_ID.set(_powderId, name)
    _powderId++
  }
}
