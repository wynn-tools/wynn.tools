<script setup lang="ts">
import type { ActualIdentOverride } from '~/components/Item/Tooltip.vue'
import type { SearchItem } from '~/lib/items-search/types'
import type { InspectorView } from '~/lib/wynntils/analyze'
import { IDENTIFICATION_MAP } from '~/lib/data/cdn-adapter/key-maps'

const props = defineProps<{
  view: InspectorView
  searchItem: SearchItem
}>()

const SHORTHAND_TO_V3: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [v3, sh] of Object.entries(IDENTIFICATION_MAP)) {
    if (!(sh in out))
      out[sh] = v3
  }
  return out
})()

const actualIdents = computed<Map<string, ActualIdentOverride>>(() => {
  const map = new Map<string, ActualIdentOverride>()
  if (!props.view.identified)
    return map
  for (const row of props.view.identifications) {
    const v3 = SHORTHAND_TO_V3[row.shorthand]
    if (!v3)
      continue
    map.set(v3, { actual: row.actual, rollPct: row.rollPct })
  }
  return map
})

const exportFilename = computed(() => {
  const slug = props.view.decodedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'item'}.png`
})
</script>

<template>
  <ItemTooltip
    :item="searchItem"
    :actual-idents="actualIdents"
    :overall-roll-pct="view.overall"
    :export-filename="exportFilename"
  >
    <template #weights>
      <slot name="weights" />
    </template>
  </ItemTooltip>
</template>
