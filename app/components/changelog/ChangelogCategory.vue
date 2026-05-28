<script setup lang="ts">
import type { CategorySection } from '~/lib/data/changelog/types'
import { itemSlug } from '~/lib/items-search/slug'

const props = defineProps<{
  id?: string
  title: string
  section: CategorySection
  /** When true, name chips link to /items/[slug]. */
  linkItems?: boolean
}>()

const total = computed(
  () => props.section.added.length + props.section.removed.length + props.section.changed.length,
)

function itemHref(name: string): string | undefined {
  if (!props.linkItems)
    return undefined
  return `/items/${itemSlug({ displayName: name })}`
}
</script>

<template>
  <section :id="id" class="scroll-mt-24">
    <header class="mb-6 flex items-baseline justify-between gap-4 border-b border-border/60 pb-3">
      <h2 class="font-display text-2xl font-bold tracking-tight text-text">
        {{ title }}
      </h2>
      <span class="font-mono text-[11px] uppercase tracking-[0.18em] text-faint tabular-nums">
        {{ total }} {{ total === 1 ? 'change' : 'changes' }}
      </span>
    </header>

    <div class="space-y-8">
      <div v-if="section.added.length">
        <p class="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
          Added <span class="ml-1 text-faint/70 tabular-nums">{{ section.added.length }}</span>
        </p>
        <div class="flex flex-wrap gap-1.5">
          <ChangelogNameChip
            v-for="n in section.added"
            :key="n"
            :name="n"
            variant="added"
            :href="itemHref(n)"
          />
        </div>
      </div>

      <div v-if="section.removed.length">
        <p class="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
          Removed <span class="ml-1 text-faint/70 tabular-nums">{{ section.removed.length }}</span>
        </p>
        <div class="flex flex-wrap gap-1.5">
          <ChangelogNameChip
            v-for="n in section.removed"
            :key="n"
            :name="n"
            variant="removed"
            :href="itemHref(n)"
          />
        </div>
      </div>

      <div v-if="section.changed.length">
        <p class="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
          Changed <span class="ml-1 text-faint/70 tabular-nums">{{ section.changed.length }}</span>
        </p>
        <div class="grid grid-cols-1 gap-x-3 gap-y-1 md:grid-cols-2">
          <ChangelogChangedRow
            v-for="e in section.changed"
            :key="e.name"
            :entry="e"
          />
        </div>
      </div>
    </div>
  </section>
</template>
