<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { computed, ref } from 'vue'
import { formatCountdown, nextSpawnIn } from '~/lib/world-events/schedule'

const props = defineProps<{ schedule: string | null }>()
const now = ref(Date.now())
useIntervalFn(() => {
  now.value = Date.now()
}, 1000)

const seconds = computed(() => nextSpawnIn(props.schedule, now.value))
const label = computed(() => seconds.value == null ? '' : formatCountdown(seconds.value))
</script>

<template>
  <span v-if="seconds != null" class="countdown">{{ label }}</span>
</template>

<style scoped>
.countdown {
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
  font-size: 13px;
}
</style>
