<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { useBuildStore } from '~/stores/build'

const route = useRoute()
const router = useRouter()
const store = useBuildStore()
const hash = computed(() => String(route.params.hash))

function syncFromRoute(h: string) {
  if (h && h !== store.currentHash)
    store.loadFromHash(h, useCdnClient())
}

onMounted(() => syncFromRoute(hash.value))
watch(hash, syncFromRoute)

// Edit → URL
watch(() => store.currentHash, (h) => {
  if (h && h !== hash.value)
    router.replace(`/builder/${h}`)
})
</script>

<template>
  <main class="builder-page">
    <p v-if="store.loading" class="state-text">
      Loading build…
    </p>
    <p v-else-if="store.error" class="state-text state-text--error">
      Failed to load build: {{ store.error }}
    </p>
    <template v-else-if="store.rawBuild">
      <div class="builder-layout">
        <section class="col-equipment">
          <EquipmentGrid />
        </section>
        <section class="col-skillpoints">
          <SkillpointPanel />
        </section>
        <section class="col-stats">
          <StatPanel v-if="store.result" :result="store.result" />
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.builder-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 48px 0;
}

.state-text {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}

.state-text--error {
  color: oklch(62% 0.15 20);
}

.builder-layout {
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr 220px 1fr;
  align-items: start;
}

@media (max-width: 900px) {
  .builder-layout {
    grid-template-columns: 1fr;
  }
}
</style>
