<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { useBuildStore } from '~/stores/build'

const route = useRoute()
const store = useBuildStore()
const hash = computed(() => String(route.params.hash))

onMounted(() => store.loadFromHash(hash.value, useCdnClient()))
watch(hash, h => store.loadFromHash(h, useCdnClient()))
</script>

<template>
  <main class="builder-page">
    <p v-if="store.loading" class="state-text">
      Loading build…
    </p>
    <p v-else-if="store.error" class="state-text state-text--error">
      Failed to load build: {{ store.error }}
    </p>
    <StatPanel v-else-if="store.result" :result="store.result" />
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
</style>
