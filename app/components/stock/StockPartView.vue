<script setup lang="ts">
import type { StockPart } from '~/lib/types/stock'

const props = defineProps<{ part: StockPart, rawUrl: string }>()
const copied = ref(false)

async function copy() {
  if (props.part.role === 'resourcepack')
    return
  await navigator.clipboard.writeText(props.part.textContent ?? '')
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface p-4">
    <div class="mb-2 flex items-center justify-between">
      <div>
        <h4 class="text-sm font-semibold text-text">
          {{ part.name }}
        </h4>
        <p v-if="part.description" class="text-xs text-muted">
          {{ part.description }}
        </p>
      </div>
      <button
        v-if="part.role !== 'resourcepack'"
        class="rounded bg-surface-hi px-3 py-1 text-xs"
        @click="copy"
      >
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
      <a v-else :href="rawUrl" download class="rounded bg-accent px-3 py-1 text-xs text-bg">
        Download
      </a>
    </div>
    <pre
      v-if="part.role !== 'resourcepack'"
      class="overflow-x-auto rounded bg-bg px-3 py-2 text-xs"
    >{{ part.textContent }}</pre>
    <p v-else class="text-xs text-faint">
      {{ part.blobFilename }}
    </p>
  </div>
</template>
