<script setup lang="ts">
import type { CategorySection } from '~/lib/data/changelog/types'

defineProps<{ title: string, section: CategorySection }>()
</script>

<template>
  <section class="space-y-3">
    <h3 class="text-sm font-semibold tracking-wide text-text">
      {{ title }}
    </h3>

    <div v-if="section.added.length" class="space-y-1.5">
      <p class="text-xs uppercase tracking-wide text-muted">
        Added
      </p>
      <div class="flex flex-wrap gap-1.5">
        <ChangelogNameChip
          v-for="n in section.added"
          :key="n"
          :name="n"
          variant="added"
        />
      </div>
    </div>

    <div v-if="section.removed.length" class="space-y-1.5">
      <p class="text-xs uppercase tracking-wide text-muted">
        Removed
      </p>
      <div class="flex flex-wrap gap-1.5">
        <ChangelogNameChip
          v-for="n in section.removed"
          :key="n"
          :name="n"
          variant="removed"
        />
      </div>
    </div>

    <div v-if="section.changed.length" class="space-y-1.5">
      <p class="text-xs uppercase tracking-wide text-muted">
        Changed
      </p>
      <div class="space-y-1.5">
        <ChangelogChangedRow
          v-for="e in section.changed"
          :key="e.name"
          :entry="e"
        />
      </div>
    </div>
  </section>
</template>
