import type { Ref } from 'vue'
import type { ApiMarketListing, ApiMarketListingStatRoll } from '~/composables/useApi'
import type { RawMarketPrice } from '~/lib/market/types'
import { reactive, watch } from 'vue'
import { useApi } from '~/composables/useApi'
import { useMarket } from '~/composables/useMarket'

const BAND = 5

export type MarketListingStatRoll = ApiMarketListingStatRoll
export type MarketListing = ApiMarketListing

export interface ItemMarketState {
  price: RawMarketPrice | null
  listings: MarketListing[]
  mode: 'banded' | 'fallback' | 'all'
  pending: boolean
  error: string | null
}

export function useItemMarket(input: Ref<{ itemName: string, overallRoll: number | null } | null>): ItemMarketState {
  const api = useApi()
  const market = useMarket()
  const state = reactive<ItemMarketState>({
    price: null,
    listings: [],
    mode: 'all',
    pending: false,
    error: null,
  })
  let gen = 0
  watch(
    input,
    async (v) => {
      const g = ++gen
      if (!v) {
        state.price = null
        state.listings = []
        state.mode = 'all'
        state.error = null
        state.pending = false
        return
      }
      state.pending = true
      state.error = null
      try {
        const [price, listings] = await Promise.all([
          market.price(v.itemName),
          api.getListings(v.itemName, { page_size: 100 }),
        ])
        if (g !== gen)
          return
        state.price = price
        const all = listings.items
        const overallRoll = v.overallRoll
        if (overallRoll == null) {
          state.mode = 'all'
          state.listings = [...all].sort((a, b) => a.listing_price - b.listing_price).slice(0, 5)
        }
        else {
          const banded = all
            .filter(l => l.overall_roll != null && Math.abs(l.overall_roll - overallRoll) <= BAND)
            .sort((a, b) => a.listing_price - b.listing_price)
            .slice(0, 5)
          if (banded.length > 0) {
            state.mode = 'banded'
            state.listings = banded
          }
          else {
            state.mode = 'fallback'
            state.listings = [...all].sort((a, b) => a.listing_price - b.listing_price).slice(0, 5)
          }
        }
      }
      catch (e) {
        if (g !== gen)
          return
        state.error = e instanceof Error ? e.message : 'failed'
      }
      finally {
        if (g === gen)
          state.pending = false
      }
    },
    { immediate: true },
  )
  return state
}
