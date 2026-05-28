<script setup lang="ts">
import type { ChangedEntry } from '~/lib/data/changelog/types'

defineProps<{ entry: ChangedEntry }>()
const open = ref(false)

function fmt(value: number | null, unit: string): string {
  if (value === null)
    return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}${unit}`
}
</script>

<template>
  <div class="rounded-md border border-border bg-surface">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
      @click="open = !open"
    >
      <span class="font-medium text-text">{{ entry.name }}</span>
      <span class="text-xs text-muted">{{ entry.fields.length }} field{{
        entry.fields.length === 1 ? "" : "s"
      }}</span>
    </button>
    <ul v-if="open" class="border-t border-border px-3 py-2 text-sm">
      <li
        v-for="field in entry.fields"
        :key="field.label"
        class="flex items-center justify-between gap-3 py-0.5"
      >
        <span class="text-muted">{{ field.label }}</span>
        <span
          class="font-mono"
          :class="
            field.good === null
              ? 'text-muted'
              : field.good
                ? 'text-green-400'
                : 'text-red-400'
          "
        >
          <span class="opacity-50">{{ fmt(field.from, field.unit) }}</span>
          <span aria-hidden="true">
            {{
              field.direction === "up"
                ? "▲"
                : field.direction === "down"
                  ? "▼"
                  : "→"
            }}
          </span>
          {{ fmt(field.to, field.unit) }}
        </span>
      </li>
    </ul>
  </div>
</template>
