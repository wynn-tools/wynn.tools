<script setup lang="ts">
export type SortOption = 'newest' | 'oldest' | 'name'

const props = defineProps<{
  q: string
  sort: SortOption
}>()

const emit = defineEmits<{
  'update:q': [value: string]
  'update:sort': [value: SortOption]
}>()

const inputValue = ref(props.q)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.q, (val) => {
  inputValue.value = val
})

function onInput(e: Event) {
  inputValue.value = (e.target as HTMLInputElement).value
  if (debounceTimer !== null)
    clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:q', inputValue.value)
  }, 300)
}

const SORT_OPTIONS: { value: SortOption, label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'A→Z' },
]
</script>

<template>
  <div class="search-sort-bar">
    <div class="search-wrap">
      <svg class="search-icon" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.3" />
        <path d="M9 9l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
      </svg>
      <input
        class="search-input"
        type="search"
        placeholder="Search by name…"
        :value="inputValue"
        @input="onInput"
      >
    </div>
    <div class="sort-tabs" role="group" aria-label="Sort order">
      <button
        v-for="opt in SORT_OPTIONS"
        :key="opt.value"
        type="button"
        class="sort-btn"
        :class="{ active: sort === opt.value }"
        @click="emit('update:sort', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-sort-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 160px;
  max-width: 320px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--color-muted);
  pointer-events: none;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 7px 10px 7px 30px;
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.12s ease-out;
}

.search-input::placeholder {
  color: var(--color-muted);
}

.search-input:focus {
  border-color: var(--color-accent);
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.sort-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.sort-btn {
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: var(--color-muted);
  padding: 5px 12px;
  cursor: pointer;
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.sort-btn:hover {
  color: var(--color-text);
}

.sort-btn.active {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}

.sort-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
