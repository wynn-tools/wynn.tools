<script setup lang="ts">
import { WORLDS } from '~/config/worlds'
import { useMapStore } from '~/stores/map'

const store = useMapStore()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      aria-label="Select world"
      class="inline-flex items-center gap-2 rounded-md bg-bg/90 px-3 py-2 text-sm font-medium text-copper backdrop-blur ring-1 ring-copper/20 hover:bg-bg"
    >
      <span>{{ WORLDS.find((w) => w.id === store.world)?.label ?? store.world }}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" />
      </svg>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        class="z-[1000] mt-1 min-w-[180px] rounded-md bg-bg/95 p-1 shadow-lg ring-1 ring-copper/20 backdrop-blur"
      >
        <DropdownMenuItem
          v-for="w in WORLDS"
          :key="w.id"
          class="cursor-pointer rounded px-3 py-2 text-sm text-muted hover:bg-copper/10 hover:text-copper data-[highlighted]:bg-copper/10 data-[highlighted]:text-copper"
          :class="{ 'text-copper': w.id === store.world }"
          @select="store.setWorld(w.id)"
        >
          {{ w.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
