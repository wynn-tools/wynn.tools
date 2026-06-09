<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const client = useCdnClient()

const visible = computed(() => store.isOldVersion)
</script>

<template>
  <div v-if="visible" class="banner" role="alert">
    <span class="banner-text">
      Pinned to Wynncraft <strong>{{ store.loadedGameVersion }}</strong> —
      this build cannot be imported in-game.
    </span>
    <button
      class="update-btn"
      type="button"
      :disabled="store.loading"
      @click="store.upgradeBuild(client)"
    >
      Update to {{ store.latestGameVersion }}
    </button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: oklch(38% 0.09 245 / 0.18);
  border: 1px solid color-mix(in oklch, var(--color-accent) 35%, transparent);
  border-radius: 6px;
  flex-wrap: wrap;
}

.banner-text {
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 13px;
  color: oklch(85% 0.09 245);
  line-height: 1.4;
}

.banner-text strong {
  font-weight: 600;
  color: oklch(92% 0.1 245);
}

.update-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(85% 0.1 245);
  background: transparent;
  border: 1px solid color-mix(in oklch, var(--color-accent) 50%, transparent);
  border-radius: 5px;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.update-btn:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
}

.update-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.update-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
