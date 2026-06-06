<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderMarkdown } from '~/lib/build/markdown'

const props = defineProps<{ markdown: string | null | undefined }>()

const collapsed = ref(true)
const rendered = computed(() => renderMarkdown(props.markdown ?? ''))
const hasContent = computed(() => !!(props.markdown && props.markdown.trim()))
</script>

<template>
  <div v-if="hasContent" class="notes-view">
    <div class="notes-body" :class="{ collapsed }" v-html="rendered" />
    <button type="button" class="notes-toggle" @click="collapsed = !collapsed">
      {{ collapsed ? 'Show more' : 'Show less' }}
    </button>
  </div>
</template>

<style scoped>
.notes-view {
  color: var(--color-text);
}
.notes-body {
  font-size: 14px;
  line-height: 1.55;
}
.notes-body.collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notes-body :deep(p) {
  margin: 0 0 0.6em 0;
}
.notes-body :deep(p:last-child) {
  margin-bottom: 0;
}
.notes-body :deep(a) {
  color: var(--color-accent);
}
.notes-body :deep(code) {
  background: var(--color-surface-hi);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.9em;
}
.notes-body :deep(pre) {
  background: var(--color-surface-hi);
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
}
.notes-toggle {
  margin-top: 6px;
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.notes-toggle:hover {
  color: var(--color-text);
}
</style>
