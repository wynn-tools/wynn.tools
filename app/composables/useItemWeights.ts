import type { Ref } from 'vue'
import { reactive, watch } from 'vue'
import { useApi } from '~/composables/useApi'

export interface WeightsState {
  data: Awaited<ReturnType<ReturnType<typeof useApi>['analyzeItem']>> | null
  pending: boolean
  error: string | null
}

export function useItemWeights(input: Ref<{ encoded: string, itemName: string } | null>): WeightsState {
  const api = useApi()
  const state = reactive<WeightsState>({ data: null, pending: false, error: null })
  let gen = 0
  watch(
    input,
    async (v) => {
      const g = ++gen
      if (!v) {
        state.data = null
        state.error = null
        state.pending = false
        return
      }
      state.pending = true
      state.error = null
      try {
        const data = await api.analyzeItem(v)
        if (g !== gen)
          return
        state.data = data
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
