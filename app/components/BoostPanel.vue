<script setup lang="ts">
import type { BoostId } from '~/lib/math/boosts'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  boostsAreEmpty,
  deserializeBoosts,
  serializeBoosts,
} from '~/lib/math/boosts'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const route = useRoute()
const router = useRouter()

// Two groups. Radiance-family interacts with Judgement (Judgement forces the
// radiance scale to 1.4); the rest are cry/haunt buffs.
const RADIANCE_GROUP: { id: BoostId, label: string }[] = [
  { id: 'radiance', label: 'Radiance +15%' },
  { id: 'divinehonor', label: 'Divine Honor +5%' },
  { id: 'shine', label: 'Shine +5%' },
  { id: 'judgement', label: 'Judgement' },
]
const BUFF_GROUP: { id: BoostId, label: string }[] = [
  { id: 'warscream', label: 'War Scream' },
  { id: 'emboldeningcry', label: 'Emboldening Cry +8%' },
  { id: 'vengeful', label: 'Vengeful Spirit +20%' },
  { id: 'fortitude', label: 'Fortitude +40%' },
  { id: 'fanatic', label: 'Fanatic Haunt +15%' },
  { id: 'lunatic', label: 'Lunatic Haunt' },
]

const anyActive = computed(() => !boostsAreEmpty(store.boosts))

function isActive(id: BoostId) {
  return store.boosts.toggles.has(id)
}

function queryStr(key: string): string | null {
  const v = route.query[key]
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? null : null
}

// Mirror store boosts → URL query (replace, preserving other params + the hash).
watch(
  () => store.boosts,
  (b) => {
    const { boosts, edmg } = serializeBoosts(b)
    const query = { ...route.query }
    if (boosts)
      query.boosts = boosts
    else
      delete query.boosts
    if (edmg)
      query.edmg = edmg
    else
      delete query.edmg
    router.replace({ query })
  },
)

// Hydrate the store from the URL query — on mount and whenever the build hash
// changes. The builder page uses a stable key (definePageMeta key: 'builder')
// and never remounts on build navigation, so without re-syncing here the boosts
// from one build would silently carry into the next. Always setting (even to an
// empty object) means navigating to a build with no boost params resets cleanly.
function syncFromQuery() {
  store.setBoosts(deserializeBoosts(queryStr('boosts'), queryStr('edmg')))
}
onMounted(syncFromQuery)
watch(() => route.params.hash, syncFromQuery)
</script>

<template>
  <CollapsibleSection title="Active Boosts">
    <template v-if="anyActive" #actions>
      <button type="button" class="boost-reset" @click="store.resetBoosts()">
        Reset
      </button>
    </template>

    <div class="boost-group">
      <button
        v-for="b in RADIANCE_GROUP"
        :key="b.id"
        type="button"
        class="chip"
        :class="{ 'chip--on': isActive(b.id) }"
        @click="store.toggleBoost(b.id)"
      >
        {{ b.label }}
      </button>
    </div>

    <div class="boost-group">
      <button
        v-for="b in BUFF_GROUP"
        :key="b.id"
        type="button"
        class="chip"
        :class="{ 'chip--on': isActive(b.id) }"
        @click="store.toggleBoost(b.id)"
      >
        {{ b.label }}
      </button>
    </div>
  </CollapsibleSection>
</template>

<style scoped>
.boost-reset {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.boost-reset:hover {
  color: var(--color-accent);
}
.boost-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in oklch, var(--color-bg) 40%, transparent);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s,
    background 0.12s;
}
.chip:hover {
  border-color: var(--color-accent-dim);
  color: var(--color-text);
}
.chip--on {
  background: color-mix(in oklch, var(--color-accent) 18%, transparent);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
