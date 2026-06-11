<script setup lang="ts">
import type { ListFilters } from '~/composables/useStockApi'

const model = defineModel<ListFilters>({ required: true })
const kinds = ['infobox', 'custom-bar', 'bundle'] as const
const classes = ['mage', 'archer', 'warrior', 'shaman', 'assassin'] as const
const categories = [
  'combat',
  'party-ui',
  'raid',
  'lootrun',
  'dps-meter',
  'cooldown-tracker',
  'resource-tracker',
  'qol',
] as const
const sorts = [
  'latest-activity',
  'most-installed',
  'most-reacted',
  'newest',
  'recently-updated',
] as const
</script>

<template>
  <aside class="flex flex-col gap-4 text-sm">
    <input
      v-model="model.q"
      placeholder="Search…"
      class="rounded border border-border bg-surface px-3 py-2 text-text"
    >
    <select v-model="model.kind" class="rounded border border-border bg-surface px-2 py-1.5">
      <option :value="undefined">
        Any kind
      </option>
      <option v-for="k in kinds" :key="k" :value="k">
        {{ k }}
      </option>
    </select>
    <select v-model="model.class" class="rounded border border-border bg-surface px-2 py-1.5">
      <option :value="undefined">
        Any class
      </option>
      <option v-for="c in classes" :key="c" :value="c">
        {{ c }}
      </option>
    </select>
    <select v-model="model.category" class="rounded border border-border bg-surface px-2 py-1.5">
      <option :value="undefined">
        Any category
      </option>
      <option v-for="c in categories" :key="c" :value="c">
        {{ c }}
      </option>
    </select>
    <select v-model="model.sort" class="rounded border border-border bg-surface px-2 py-1.5">
      <option v-for="s in sorts" :key="s" :value="s">
        {{ s }}
      </option>
    </select>
  </aside>
</template>
