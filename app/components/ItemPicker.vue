<script setup lang="ts">
import { useBuildStore } from '~/stores/build'

const props = defineProps<{ slotIndex: number }>()
const emit = defineEmits<{
  select: [id: number | null]
  close: []
}>()

const store = useBuildStore()
const query = ref('')

const filteredItems = computed(() => {
  const items = store.itemsForSlot(props.slotIndex)
  if (!query.value)
    return items.slice(0, 100)
  const q = query.value.toLowerCase()
  return items.filter(item => String(item.displayName).toLowerCase().includes(q)).slice(0, 100)
})

function selectItem(id: number | null) {
  emit('select', id)
}
</script>

<template>
  <div class="picker">
    <div class="picker-header">
      <input
        v-model="query"
        class="picker-search"
        type="text"
        placeholder="Search items…"
        autofocus
      >
      <button class="picker-close" @click="emit('close')">
        ✕
      </button>
    </div>
    <ul class="picker-list">
      <li class="picker-item picker-item--none" @click="selectItem(null)">
        None
      </li>
      <li
        v-for="item in filteredItems"
        :key="item.id as number"
        class="picker-item"
        @click="selectItem(item.id as number)"
      >
        {{ item.displayName }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  width: 320px;
  max-height: 440px;
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
}

.picker-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
  caret-color: var(--color-copper);
}

.picker-search::placeholder {
  color: var(--color-faint);
}

.picker-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  transition: color 0.1s;
}

.picker-close:hover {
  color: var(--color-text);
}

.picker-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
}

.picker-item {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  padding: 8px 14px;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background 0.08s,
    color 0.08s;
}

.picker-item:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.picker-item--none {
  color: var(--color-faint);
  border-bottom: 1px solid var(--color-border);
  font-style: italic;
}

.picker-item--none:hover {
  color: var(--color-muted);
}
</style>
