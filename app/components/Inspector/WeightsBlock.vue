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
  <section class="weights">
    <div class="weights-block">
      <div class="weights-tag" data-source="nori">
        NORI
      </div>
      <template v-if="nori">
        <div
          v-for="p in noriProfiles"
          :key="`n:${p.name}`"
          class="weights-row"
        >
          – {{ p.name }}
          <span :style="{ color: pctColor(score(p)) }">[{{ fmtPct(score(p)) }}]</span>
        </div>
        <div v-if="noriProfiles.length === 0" class="weights-empty">
          No profiles
        </div>
      </template>
      <div v-else-if="pending" class="weights-skeleton" aria-hidden="true" />
      <div v-else class="weights-unavailable">
        Nori unavailable
      </div>
    </div>

    <div class="weights-block">
      <div class="weights-tag" data-source="wynnpool">
        WYNNPOOL
      </div>
      <template v-if="wynnpool">
        <div
          v-for="p in wynnpoolProfiles"
          :key="`w:${p.name}`"
          class="weights-row"
        >
          – {{ p.name }}
          <span :style="{ color: pctColor(score(p)) }">[{{ fmtPct(score(p)) }}]</span>
        </div>
        <div v-if="wynnpoolProfiles.length === 0" class="weights-empty">
          No profiles
        </div>
      </template>
      <div v-else-if="pending" class="weights-skeleton" aria-hidden="true" />
      <div v-else class="weights-unavailable">
        Wynnpool unavailable
      </div>
    </div>
  </section>
</template>

<style scoped>
.weights {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.5rem;
}
.weights-block {
  display: grid;
  gap: 0.1rem;
}
.weights-tag {
  display: inline-block;
  padding: 0 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  font: 600 0.7rem/1.4 var(--font-mono, monospace);
  letter-spacing: 0.05em;
}
.weights-tag[data-source='nori'] {
  color: #ff5d8f;
}
.weights-tag[data-source='wynnpool'] {
  color: #5dd9ff;
}
.weights-row {
  font-variant-numeric: tabular-nums;
}
.weights-unavailable,
.weights-empty {
  color: var(--color-muted);
  font-style: italic;
}
.weights-skeleton {
  height: 1rem;
  background: var(--color-faint);
  border-radius: 2px;
  opacity: 0.4;
}
</style>
