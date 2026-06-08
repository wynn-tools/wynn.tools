<script setup lang="ts">
import type { InspectorView } from '~/lib/wynntils/analyze'
import { computed } from 'vue'
import { IDENTIFICATION_MAP } from '~/lib/data/cdn-adapter/key-maps'
import { rollColorVar } from '~/lib/wynntils/roll-percent'

interface WeightProfile {
  name: string
  scales: Record<string, number>
}
interface ProviderResult {
  profiles: WeightProfile[]
}

const props = defineProps<{
  view: InspectorView
  nori: ProviderResult | null
  wynnpool: ProviderResult | null
  pending: boolean
  error: string | null
}>()
const SHORTHAND_TO_V3 = Object.fromEntries(
  Object.entries(IDENTIFICATION_MAP).map(([v3, sh]) => [sh, v3]),
)

function score(profile: WeightProfile): number {
  let acc = 0
  let weightSum = 0
  for (const row of props.view.identifications) {
    if (row.rollPct == null)
      continue
    const v3 = SHORTHAND_TO_V3[row.shorthand]
    if (!v3)
      continue
    const w = profile.scales[v3]
    if (typeof w !== 'number')
      continue
    acc += row.rollPct * w
    weightSum += w
  }
  return weightSum > 0 ? acc / weightSum : 0
}

const noriProfiles = computed(() => [...(props.nori?.profiles ?? [])].sort((a, b) => score(b) - score(a)))
const wynnpoolProfiles = computed(() => [...(props.wynnpool?.profiles ?? [])].sort((a, b) => score(b) - score(a)))

function pctColor(p: number): string {
  return `var(${rollColorVar(p)})`
}
function fmtPct(p: number): string {
  return `${p.toFixed(1)}%`
}
</script>

<template>
  <div class="tt-weights">
    <template v-if="nori">
      <div class="tt-weights-head">
        <span class="tt-tag tt-weights-tag" data-source="nori">nori</span>
      </div>
      <ul v-if="noriProfiles.length" class="tt-weights-list">
        <li
          v-for="p in noriProfiles"
          :key="`n:${p.name}`"
          class="tt-weights-row"
        >
          <span class="tt-weights-name">- {{ p.name }}</span>
          <span class="tt-weights-pct" :style="{ color: pctColor(score(p)) }">[{{ fmtPct(score(p)) }}]</span>
        </li>
      </ul>
      <p v-else class="tt-weights-empty">
        No profiles
      </p>
    </template>
    <div v-else-if="pending" class="tt-weights-skeleton" aria-hidden="true" />
    <p v-else class="tt-weights-empty">
      Nori unavailable
    </p>

    <template v-if="wynnpool">
      <div class="tt-weights-head">
        <span class="tt-tag tt-weights-tag" data-source="wynnpool">wynnpool</span>
      </div>
      <ul v-if="wynnpoolProfiles.length" class="tt-weights-list">
        <li
          v-for="p in wynnpoolProfiles"
          :key="`w:${p.name}`"
          class="tt-weights-row"
        >
          <span class="tt-weights-name">- {{ p.name }}</span>
          <span class="tt-weights-pct" :style="{ color: pctColor(score(p)) }">[{{ fmtPct(score(p)) }}]</span>
        </li>
      </ul>
      <p v-else class="tt-weights-empty">
        No profiles
      </p>
    </template>
    <div v-else-if="pending" class="tt-weights-skeleton" aria-hidden="true" />
    <p v-else class="tt-weights-empty">
      Wynnpool unavailable
    </p>
  </div>
</template>

<style scoped>
.tt-weights {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tt-weights-head {
  margin-top: 6px;
}
.tt-weights-head:first-child {
  margin-top: 0;
}
.tt-tag {
  color: #000;
  font-family: 'wynn-five', 'wynn-default', var(--font-mono);
  font-size: 18px;
  line-height: 16px;
  padding: 2px 6px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: lowercase;
}
.tt-weights-tag[data-source='nori'] {
  background: #67ccf5;
}
.tt-weights-tag[data-source='wynnpool'] {
  background: #ffc457;
}
.tt-weights-list {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tt-weights-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  font-size: 18px;
  color: #fcfcfc;
}
.tt-weights-pct {
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.tt-weights-empty {
  margin: 2px 0 0;
  font-size: 18px;
  color: #aeaeae;
  font-style: italic;
}
.tt-weights-skeleton {
  height: 18px;
  margin-top: 2px;
  background: #2a2a2a;
  border-radius: 2px;
  opacity: 0.4;
}
@media (max-width: 480px) {
  .tt-weights-row,
  .tt-weights-empty {
    font-size: 16px;
  }
}
</style>
