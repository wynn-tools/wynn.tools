<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '~/stores/map'

const props = defineProps<{ onUpload: () => void }>()
const store = useMapStore()
const distance = computed(() =>
  store.lootrun?.blockDistance ? Math.round(store.lootrun.blockDistance) : 0,
)
</script>

<template>
  <div class="pointer-events-auto absolute bottom-4 left-4 z-[400]">
    <button
      v-if="!store.lootrun"
      type="button"
      class="rounded-md bg-bg/90 px-3 py-2 text-sm text-copper ring-1 ring-copper/20 backdrop-blur hover:bg-bg"
      @click="props.onUpload"
    >
      Upload lootrun
    </button>
    <div
      v-else
      class="flex items-center gap-3 rounded-md bg-bg/90 px-3 py-2 text-xs text-muted ring-1 ring-copper/20 backdrop-blur"
    >
      <span class="text-copper">{{ store.lootrun.points.length }} pts</span>
      <span>·</span>
      <span>{{ distance.toLocaleString() }} blocks</span>
      <button
        type="button"
        class="rounded bg-copper/10 px-2 py-1 text-copper hover:bg-copper/20"
        @click="store.clearLootrun"
      >
        Clear
      </button>
    </div>
  </div>
</template>
