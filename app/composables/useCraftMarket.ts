import type { CollectedItem } from '~/lib/market/collect-build-items'
import type { RawMarketPrice } from '~/lib/market/types'
import { ref, watch } from 'vue'
import { powderMarket } from '~/lib/market/powder-name'
import { useCraftStore } from '~/stores/craft'
import { useMarket } from './useMarket'
import { useMarketMode } from './useMarketMode'

function keyFor(name: string, tier: number | null): string {
  return `${name}|${tier ?? ''}`
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

const { mode, setMode } = useMarketMode()
const priceMap = ref<Map<string, RawMarketPrice | null>>(new Map())
const collected = ref<CollectedItem[]>([])
let initialized = false

function init() {
  const store = useCraftStore()
  const market = useMarket()

  watch(
    () => [store.raw.ingredientIds, store.raw.powders, store.ctx] as const,
    () => {
      const ctx = store.ctx
      if (!ctx) {
        collected.value = []
        return
      }
      const grouped = new Map<string, CollectedItem>()

      for (const id of store.raw.ingredientIds) {
        if (id == null)
          continue
        const ing = ctx.ingredients.get(id)
        if (!ing)
          continue
        const tier = typeof ing.tier === 'number' ? ing.tier : null
        const key = keyFor(ing.name, tier)
        const existing = grouped.get(key)
        if (existing) {
          existing.count++
        }
        else {
          grouped.set(key, {
            label: ing.displayName ?? ing.name,
            name: ing.name,
            tier,
            count: 1,
            tradeable: true,
          })
        }
      }

      for (const id of store.raw.powders) {
        const m = powderMarket(id)
        if (!m)
          continue
        const key = keyFor(m.name, m.tier)
        const roman = ROMAN[m.tier] ?? String(m.tier)
        const existing = grouped.get(key)
        if (existing) {
          existing.count++
        }
        else {
          grouped.set(key, {
            label: `${m.name} ${roman}`,
            name: m.name,
            tier: m.tier,
            count: 1,
            tradeable: true,
          })
        }
      }

      collected.value = [...grouped.values()]
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

export function useCraftMarket() {
  if (!initialized) {
    initialized = true
    init()
  }
  function priceFor(name: string, tier: number | null = null): RawMarketPrice | null {
    return priceMap.value.get(keyFor(name, tier)) ?? null
  }
  return { mode, setMode, priceMap, priceFor, collected }
}
