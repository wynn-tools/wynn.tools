<script setup lang="ts">
import { Check, Copy, Download } from '@lucide/vue'

const props = withDefaults(defineProps<{
  name: string
  width?: number
}>(), {
  width: 482,
})

const rootRef = ref<HTMLElement | null>(null)
const { exporting, copying, copied, exportTooltip, copyTooltip } = useTooltipExport({ width: props.width })

const busy = computed(() => exporting.value || copying.value)

function target(): HTMLElement | null {
  return rootRef.value?.querySelector<HTMLElement>('[data-export-root]') ?? null
}

function onDownload() {
  const el = target()
  if (!el)
    return
  const slug = props.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  exportTooltip(el, `${slug || 'tooltip'}.png`)
}

function onCopy() {
  const el = target()
  if (el)
    copyTooltip(el)
}
</script>

<template>
  <div ref="rootRef" class="tx">
    <slot />
    <div class="tx-actions" data-export-ignore>
      <button
        type="button"
        class="tx-btn"
        :disabled="busy"
        :aria-label="copied ? 'Copied PNG' : 'Copy as PNG'"
        :title="copied ? 'Copied' : 'Copy PNG'"
        @click.stop.prevent="onCopy"
      >
        <span v-if="copying" class="tx-spinner" aria-hidden="true" />
        <Check v-else-if="copied" :size="13" :stroke-width="2.4" />
        <Copy v-else :size="13" :stroke-width="2.2" />
      </button>
      <button
        type="button"
        class="tx-btn"
        :disabled="busy"
        aria-label="Download as PNG"
        title="Download PNG"
        @click.stop.prevent="onDownload"
      >
        <span v-if="exporting" class="tx-spinner" aria-hidden="true" />
        <Download v-else :size="13" :stroke-width="2.2" />
      </button>
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.tx {
  position: relative;
}
.tx-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity 0.12s ease-out,
    transform 0.12s ease-out;
}
.tx:hover .tx-actions,
.tx:focus-within .tx-actions {
  opacity: 1;
  transform: none;
}
@media (hover: none) {
  .tx-actions {
    opacity: 1;
    transform: none;
  }
}
.tx-btn {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 22px;
  color: var(--color-muted);
  background: color-mix(in oklch, var(--color-surface-hi) 92%, transparent);
  backdrop-filter: blur(6px);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.tx-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.tx-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.tx-btn:disabled {
  cursor: progress;
  opacity: 0.6;
}
.tx-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--color-faint);
  border-top-color: var(--color-text);
  border-radius: 50%;
  animation: tx-spin 0.6s linear infinite;
}
@keyframes tx-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tx-actions {
    transition: none;
  }
}
</style>
