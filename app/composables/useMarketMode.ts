import type { MarketMode } from '~/lib/market/summarize'
import { ref } from 'vue'

const KEY = 'wynn.tools:marketViewMode'
const VALID = new Set<MarketMode>(['min', 'avg', 'max'])

function load(): MarketMode {
  if (typeof localStorage === 'undefined')
    return 'avg'
  const raw = localStorage.getItem(KEY)
  return raw && VALID.has(raw as MarketMode) ? (raw as MarketMode) : 'avg'
}

const mode = ref<MarketMode>(load())

export function useMarketMode() {
  function setMode(m: MarketMode) {
    mode.value = m
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(KEY, m)
  }
  return { mode, setMode }
}
