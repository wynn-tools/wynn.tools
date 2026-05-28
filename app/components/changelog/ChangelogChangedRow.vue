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
  <div
    class="self-start rounded-md border border-border/60 bg-surface/60 transition hover:border-border hover:bg-surface"
    :class="open && 'border-accent/30 bg-surface'"
  >
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px]"
      @click="open = !open"
    >
      <span class="truncate text-text">{{ entry.name }}</span>
      <span
        class="shrink-0 font-mono text-[10px] uppercase tracking-wider tabular-nums"
        :class="open ? 'text-accent' : 'text-faint'"
      >
        {{ entry.fields.length }}f
      </span>
    </button>
    <ul v-if="open" class="border-t border-border/60 px-3 py-2 text-[13px]">
      <li
        v-for="field in entry.fields"
        :key="field.label"
        class="flex items-center justify-between gap-3 py-0.5"
      >
        <span class="truncate text-muted">{{ field.label }}</span>
        <span
          class="shrink-0 font-mono text-xs tabular-nums"
          :class="
            field.good === null
              ? 'text-muted'
              : field.good
                ? 'text-emerald-400/90'
                : 'text-rose-400/90'
          "
        >
          <span class="opacity-50">{{ fmt(field.from, field.unit) }}</span>
          <span aria-hidden="true" class="mx-1 text-faint">
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
