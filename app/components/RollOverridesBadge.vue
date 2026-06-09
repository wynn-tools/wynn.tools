<script setup lang="ts">
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
</script>

<template>
  <UiPopover v-if="store.totalOverrideCount > 0" :min-width="0">
    <template #trigger>
      <button
        class="badge"
        type="button"
        :aria-label="`${store.totalOverrideCount} roll overrides active`"
      >
        <span class="dot" />
      </button>
    </template>
    <div class="roll-overrides-popover__line">
      {{ store.totalOverrideCount }} override{{
        store.totalOverrideCount === 1 ? "" : "s"
      }}
      on {{ store.itemsWithOverridesCount }} item{{
        store.itemsWithOverridesCount === 1 ? "" : "s"
      }}
    </div>
    <UiButton @click="store.clearAllOverrides()">
      Clear all
    </UiButton>
  </UiPopover>
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

<!-- Unscoped: lives inside UiPopover's portaled content. -->
<style>
.ui-popover .roll-overrides-popover__line {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
}
</style>
