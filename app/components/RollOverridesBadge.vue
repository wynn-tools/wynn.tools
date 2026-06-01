<script setup lang="ts">
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
</script>

<template>
  <PopoverRoot v-if="store.totalOverrideCount > 0">
    <PopoverTrigger
      as="button"
      class="badge"
      type="button"
      :aria-label="`${store.totalOverrideCount} roll overrides active`"
    >
      <span class="dot" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="roll-overrides-popover" :side-offset="6">
        <div class="roll-overrides-popover__line">
          {{ store.totalOverrideCount }} override{{
            store.totalOverrideCount === 1 ? "" : "s"
          }}
          on {{ store.itemsWithOverridesCount }} item{{
            store.itemsWithOverridesCount === 1 ? "" : "s"
          }}
        </div>
        <button
          class="roll-overrides-popover__clear"
          type="button"
          @click="store.clearAllOverrides()"
        >
          Clear all
        </button>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--color-accent);
}
</style>

<!-- Unscoped: PopoverPortal teleports content out of this component's subtree,
     so Vue's scoped data-v attribute can't reach it. -->
<style>
.roll-overrides-popover {
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text);
  z-index: 60;
}
.roll-overrides-popover__line {
  color: var(--color-muted);
}
.roll-overrides-popover__clear {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 10px;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
}
.roll-overrides-popover__clear:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
