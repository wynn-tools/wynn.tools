<script setup lang="ts">
import type { ApiBuildCredit, ApiOwner } from '~/composables/useApi'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  owner: ApiOwner | null
  credits: readonly ApiBuildCredit[]
  viewerId?: string | null
  maxCredits?: number
}>(), { viewerId: null, maxCredits: 3 })

const emit = defineEmits<{ removeMe: [] }>()

const visible = computed(() => props.credits.slice(0, props.maxCredits))
const overflow = computed(() => Math.max(0, props.credits.length - props.maxCredits))

function onRemoveMe() {
  // eslint-disable-next-line no-alert
  if (typeof window !== 'undefined' && !window.confirm('Remove yourself from credits?'))
    return
  emit('removeMe')
}
</script>

<template>
  <span v-if="owner" class="byline">
    By
    <NuxtLink :to="`/u/${owner.username}`" class="byline-owner">{{ owner.name }}</NuxtLink>
    <template v-if="credits.length > 0">
      with
      <template v-for="(c, i) in visible" :key="c.id">
        <NuxtLink :to="`/u/${c.username}`" class="byline-credit">{{ c.displayName }}</NuxtLink>
        <button
          v-if="viewerId && viewerId === c.id && owner.id !== c.id"
          type="button"
          class="byline-remove"
          aria-label="Remove yourself from credits"
          @click="onRemoveMe"
        >×</button>
        <span v-if="i < visible.length - 1 || overflow > 0" class="byline-sep">, </span>
      </template>
      <span v-if="overflow > 0" class="byline-overflow">+{{ overflow }} more</span>
    </template>
  </span>
</template>

<style scoped>
.byline {
  font-size: 13px;
  color: var(--color-muted);
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.byline-owner,
.byline-credit {
  color: var(--color-text);
  text-decoration: none;
}
.byline-owner:hover,
.byline-credit:hover {
  color: var(--color-accent);
}
.byline-remove {
  background: none;
  border: none;
  color: var(--color-faint);
  cursor: pointer;
  padding: 0 2px;
  font-size: 14px;
  line-height: 1;
}
.byline-remove:hover {
  color: var(--color-text);
}
.byline-sep {
  color: var(--color-faint);
}
.byline-overflow {
  color: var(--color-faint);
  font-size: 12px;
}
</style>
