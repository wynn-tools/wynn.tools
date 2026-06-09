import type { CollectedItem } from '~/lib/market/collect-build-items'
import type { RawMarketPrice } from '~/lib/market/types'
import { ref, watch } from 'vue'
import { slotItemId } from '~/lib/codec/build-codec'
import { collectBuildItems } from '~/lib/market/collect-build-items'
import { useBuildStore } from '~/stores/build'
import { useMarket } from './useMarket'
import { useMarketMode } from './useMarketMode'

function keyFor(name: string, tier: number | null): string {
  return `${name}|${tier ?? ''}`
}

const { mode, setMode } = useMarketMode()
const priceMap = ref<Map<string, RawMarketPrice | null>>(new Map())
const collected = ref<CollectedItem[]>([])
let initialized = false

function init() {
  const store = useBuildStore()
  const market = useMarket()

  watch(
    () => [store.rawBuild?.equipment, store.rawBuild?.powders, store.ctx] as const,
    () => {
      const rb = store.rawBuild
      const ctx = store.ctx
      if (!rb || !ctx) {
        collected.value = []
        return
      }
      const gear: { label: string, name: string, crafted: boolean }[] = []
      for (let slot = 0; slot <= 8; slot++) {
        const entry = rb.equipment[slot]
        if (entry?.kind === 'crafted') {
          gear.push({ label: `Slot ${slot}`, name: `Crafted ${slot}`, crafted: true })
          continue
        }
        const id = slotItemId(entry)
        if (id == null || id >= 10000)
          continue
        const item = ctx.rawItemIndex.resolveId(id)
        const name = item?.name as string | undefined
        if (name)
          gear.push({ label: name, name, crafted: false })
      }
      const powders = rb.powders.flat()
      collected.value = collectBuildItems({ gear, powders })
    },
    { immediate: true, deep: true },
  )

  let gen = 0
  watch(
    collected,
    async (items) => {
      const g = ++gen
      const tradeable = items.filter(i => i.tradeable)
      if (tradeable.length === 0) {
        priceMap.value = new Map()
        return
      }
      try {
        const results = await market.prices(
          tradeable.map(i => ({ name: i.name, tier: i.tier ?? undefined })),
        )
        if (g !== gen)
          return
        const next = new Map<string, RawMarketPrice | null>()
        tradeable.forEach((it, idx) => next.set(keyFor(it.name, it.tier), results[idx] ?? null))
        priceMap.value = next
      }
      catch {
        if (g === gen)
          priceMap.value = new Map()
      }
    },
    { immediate: true },
  )
}

export function useBuildMarket() {
  if (!initialized) {
    initialized = true
    init()
  }
  function priceFor(name: string, tier: number | null = null): RawMarketPrice | null {
    return priceMap.value.get(keyFor(name, tier)) ?? null
  }
  return { mode, setMode, priceMap, priceFor, collected }
}
