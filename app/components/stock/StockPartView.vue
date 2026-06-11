<script setup lang="ts">
import type { StockPart } from '~/lib/types/stock'

const props = defineProps<{ part: StockPart, rawUrl: string }>()
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  if (props.part.role === 'resourcepack')
    return
  await navigator.clipboard.writeText(props.part.textContent ?? '')
  copied.value = true
  if (copyTimer)
    clearTimeout(copyTimer)
  copyTimer = setTimeout(() => copied.value = false, 1500)
}
</script>

<template>
  <div class="part">
    <header class="part-head">
      <div class="part-id">
        <span class="part-role">{{ part.role }}</span>
        <h4 class="part-name">
          {{ part.name }}
        </h4>
        <p v-if="part.description" class="part-desc">
          {{ part.description }}
        </p>
      </div>
      <button
        v-if="part.role !== 'resourcepack'"
        type="button"
        class="part-action"
        :class="{ 'part-action--copied': copied }"
        @click="copy"
      >
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
      <a v-else :href="rawUrl" download class="part-action part-action--download">
        Download
      </a>
    </header>
    <pre
      v-if="part.role !== 'resourcepack'"
      class="part-body"
    >{{ part.textContent }}</pre>
    <p v-else class="part-blob">
      {{ part.blobFilename }}
    </p>
  </div>
</template>

<style scoped>
.part {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.part-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.part-id {
  flex: 1;
  min-width: 0;
}

.part-role {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.part-name {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.part-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.45;
}

.part-action {
  flex-shrink: 0;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 7px 12px;
  cursor: pointer;
  text-decoration: none;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}
.part-action:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.part-action:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.part-action--copied {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  pointer-events: none;
}
.part-action--download {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 35%, transparent);
}

.part-body {
  margin: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px 12px;
  font: 400 12px/1.55 var(--font-mono);
  color: var(--color-text);
  white-space: pre;
  overflow-x: auto;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.part-blob {
  margin: 0;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.06em;
  color: var(--color-faint);
}
</style>
