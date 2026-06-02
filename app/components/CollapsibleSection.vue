<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  defaultOpen?: boolean
}>(), { defaultOpen: false })

const open = ref(props.defaultOpen)
function toggle() {
  open.value = !open.value
}
</script>

<template>
  <section class="cs" :class="{ 'cs--open': open }">
    <header
      class="cs-head"
      role="button"
      tabindex="0"
      :aria-expanded="open"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <span class="cs-title kicker">
        <span class="cs-chev" :class="{ 'cs-chev--open': open }" aria-hidden="true">▸</span>
        {{ title }}
        <slot name="badge" />
      </span>
      <span v-if="$slots.actions" class="cs-actions" @click.stop>
        <slot name="actions" />
      </span>
    </header>
    <div v-show="open" class="cs-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.cs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.cs:not(.cs--open) {
  gap: 0;
}
.cs-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.cs-head:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 3px;
}
.cs-title {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.cs-chev {
  display: inline-block;
  width: 10px;
  color: var(--color-faint);
  transition:
    transform 0.15s ease-out,
    color 0.12s;
}
.cs-chev--open {
  transform: rotate(90deg);
  color: var(--color-muted);
}
.cs-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cs-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
</style>
