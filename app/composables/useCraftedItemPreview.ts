import type { CraftedItem, RawCraft } from '~/lib/crafter/types'
import { useCdnClient } from '~/composables/useBuildData'
import { loadCraftData } from '~/composables/useCraftData'
import { BitVector, BitVectorCursor } from '~/lib/codec/bit-vector'
import { decodeCraft } from '~/lib/codec/craft-codec'
import { computeCraft } from '~/lib/crafter/compute-craft'

const WEAPON_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])

export interface ResolvedCraft {
  crafted: CraftedItem
  raw: RawCraft
}

export function useCraftedItemPreview() {
  const client = useCdnClient()

  async function resolve(craftHash: string): Promise<ResolvedCraft | null> {
    const { craftContext: ctx } = await loadCraftData(client)
    const vec = new BitVector(craftHash, craftHash.length * 6)
    const cursor = new BitVectorCursor(vec)
    const raw = decodeCraft(cursor, id => WEAPON_TYPES.has(ctx.recipes.get(id)?.type ?? ''))
    const crafted = computeCraft(raw, ctx)
    return { crafted, raw }
  }

  return { resolve }
}
