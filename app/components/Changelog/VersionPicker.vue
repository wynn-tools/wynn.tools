<script setup lang="ts">
import type { PickableVersion } from '~/composables/useChangelogData'

defineProps<{ versions: PickableVersion[], current: string }>()
const emit = defineEmits<{ select: [gameVersion: string] }>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      aria-label="Select version"
      class="inline-flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm font-medium text-text ring-1 ring-border hover:bg-surface-hi"
    >
      <span>{{ current }}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M3 5l3 3 3-3"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
      </svg>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        class="z-50 mt-1 max-h-[60vh] min-w-[200px] overflow-y-auto rounded-md bg-bg/95 p-1 shadow-lg ring-1 ring-border backdrop-blur"
      >
        <DropdownMenuItem
          v-for="v in versions"
          :key="v.gameVersion"
          class="flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-2 text-sm text-muted hover:bg-accent/10 hover:text-accent data-[highlighted]:bg-accent/10 data-[highlighted]:text-accent"
          :class="{ 'text-accent': v.gameVersion === current }"
          @select="emit('select', v.gameVersion)"
        >
          <span>{{ v.gameVersion }}</span>
          <span class="text-xs text-muted">from {{ v.from }}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
