<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { obtainInfo } from '~/lib/items-search/obtain'

const props = defineProps<{ item: SearchItem }>()
const methods = computed(() => obtainInfo(props.item))
</script>

<template>
  <section class="obtain">
    <h2>How to obtain this item?</h2>
    <ul>
      <li v-for="m in methods" :key="m.kind" class="method">
        <span class="method-title">{{ m.title }}</span>
        <span class="method-desc">{{ m.description }}</span>
        <span v-if="m.quest" class="method-quest">Quest: {{ m.quest }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.obtain h2 {
  font-size: 16px;
  margin-bottom: 12px;
  color: var(--color-text);
}
.obtain ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.method {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
}
.method-title {
  font-weight: 600;
  color: var(--color-text);
}
.method-desc,
.method-quest {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
