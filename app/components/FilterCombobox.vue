<script setup lang="ts">
const props = defineProps<{
  options: string[]
  placeholder?: string
  /** Optional per-option extra search terms (description, stats, tags…).
   *  Matched against the query in addition to the option label itself. */
  searchKeys?: Record<string, string[]>
}>()
const model = defineModel<string | null>({ required: true })

const inputRef = ref<HTMLInputElement | null>(null)
const fieldRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLUListElement | null>(null)
const isOpen = ref(false)
const query = ref('')
const highlighted = ref(-1)
const listId = `cb-list-${Math.random().toString(36).slice(2, 8)}`

// Position of the teleported dropdown in viewport coordinates. Recomputed on
// open, scroll (capturing), and resize while open — keeps the list anchored
// to the field even when an ancestor scrolls.
const LIST_MAX_HEIGHT = 220
const listPos = ref<{ top?: number, bottom?: number, left: number, width: number } | null>(null)

function updateListPos() {
  const el = fieldRef.value
  if (!el)
    return
  const r = el.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom
  if (spaceBelow < LIST_MAX_HEIGHT)
    listPos.value = { bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width }
  else
    listPos.value = { top: r.bottom + 4, left: r.left, width: r.width }
}

watch(isOpen, (open) => {
  if (typeof window === 'undefined')
    return
  if (open) {
    updateListPos()
    // capture-phase so we react to scrolls of any ancestor, not just window
    window.addEventListener('scroll', updateListPos, true)
    window.addEventListener('resize', updateListPos)
  }
  else {
    window.removeEventListener('scroll', updateListPos, true)
    window.removeEventListener('resize', updateListPos)
  }
})

onUnmounted(() => {
  if (typeof window === 'undefined')
    return
  window.removeEventListener('scroll', updateListPos, true)
  window.removeEventListener('resize', updateListPos)
})

const filtered = computed(() => {
  if (!query.value)
    return props.options
  const q = query.value.toLowerCase()
  const keys = props.searchKeys
  return props.options.filter((o) => {
    if (o.toLowerCase().includes(q))
      return true
    const extras = keys?.[o]
    if (!extras)
      return false
    for (const s of extras) {
      if (s.toLowerCase().includes(q))
        return true
    }
    return false
  })
})

function openDropdown() {
  isOpen.value = true
  query.value = ''
  highlighted.value = model.value ? props.options.indexOf(model.value) : -1
}

function closeDropdown() {
  isOpen.value = false
  query.value = ''
  highlighted.value = -1
}

function select(opt: string) {
  model.value = opt
  closeDropdown()
}

function clear(e: MouseEvent) {
  e.stopPropagation()
  model.value = null
  nextTick(() => inputRef.value?.focus())
}

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  isOpen.value = true
  highlighted.value = filtered.value.length > 0 ? 0 : -1
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDropdown()
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlighted.value = Math.min(highlighted.value + 1, filtered.value.length - 1)
    scrollHighlightedIntoView()
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlighted.value = Math.max(highlighted.value - 1, 0)
    scrollHighlightedIntoView()
  }
  else if (e.key === 'Enter') {
    e.preventDefault()
    if (highlighted.value >= 0 && filtered.value[highlighted.value]) {
      select(filtered.value[highlighted.value])
    }
  }
  else if (e.key === 'Escape') {
    closeDropdown()
    inputRef.value?.blur()
  }
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    const list = listRef.value
    if (!list)
      return
    const item = list.children[highlighted.value] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  })
}

function onBlur() {
  setTimeout(closeDropdown, 160)
}
</script>

<template>
  <div class="cb" :aria-expanded="isOpen" role="combobox" aria-haspopup="listbox" :aria-owns="listId">
    <div ref="fieldRef" class="cb-field" @click="inputRef?.focus()">
      <input
        ref="inputRef"
        class="cb-input"
        type="text"
        :value="isOpen ? query : (model ?? '')"
        :placeholder="isOpen ? 'Type to filter…' : (placeholder ?? 'Select…')"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-controls="listId"
        :aria-activedescendant="highlighted >= 0 ? `${listId}-opt-${highlighted}` : undefined"
        @focus="openDropdown"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
      >
      <button
        v-if="model"
        type="button"
        class="cb-clear"
        tabindex="-1"
        aria-label="Clear selection"
        @click="clear"
      >
        ×
      </button>
      <svg
        class="cb-chevron"
        :class="{ 'cb-chevron--open': isOpen }"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="4,6 8,10 12,6" />
      </svg>
    </div>

    <Teleport to="body">
      <ul
        v-if="isOpen && listPos"
        :id="listId"
        ref="listRef"
        class="cb-list"
        role="listbox"
        :style="{
          top: listPos.top != null ? `${listPos.top}px` : undefined,
          bottom: listPos.bottom != null ? `${listPos.bottom}px` : undefined,
          left: `${listPos.left}px`,
          minWidth: `${listPos.width}px`,
        }"
      >
        <li v-if="filtered.length === 0" class="cb-empty" role="option" aria-disabled="true">
          No results
        </li>
        <li
          v-for="(opt, i) in filtered"
          :id="`${listId}-opt-${i}`"
          :key="opt"
          class="cb-option"
          :class="{
            'cb-option--hi': i === highlighted,
            'cb-option--sel': opt === model,
          }"
          role="option"
          :aria-selected="opt === model"
          @mousedown.prevent="select(opt)"
          @mouseover="highlighted = i"
        >
          {{ opt }}
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<style scoped>
.cb {
  position: relative;
  min-width: 0;
}

.cb-field {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0 6px 0 10px;
  gap: 4px;
  cursor: text;
  transition: border-color 0.12s ease-out;
}

.cb:has(.cb-input:focus-visible) .cb-field {
  border-color: var(--color-accent);
}

.cb-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 12px;
  font-family: inherit;
  padding: 6px 0;
  cursor: inherit;
}

.cb-input::placeholder {
  color: var(--color-muted);
}

.cb-clear {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1;
  padding: 2px 2px;
  cursor: pointer;
  transition: color 0.1s ease-out;
}

.cb-clear:hover {
  color: var(--color-text);
}

.cb-chevron {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  color: var(--color-muted);
  transition:
    transform 0.12s ease-out,
    color 0.12s ease-out;
  pointer-events: none;
}

.cb-chevron--open {
  transform: rotate(180deg);
  color: var(--color-accent);
}

/* Teleported dropdown: positioned in viewport coords (top/left/width set
   inline). `:global` because <style scoped> won't tag elements rendered into
   <body> via Teleport. */
:global(.cb-list) {
  position: fixed;
  z-index: 1000;
  /* Grow with longest option (kept on one line via .cb-option below), capped
     so the list never dominates the viewport on tiny screens. min-width is
     set inline from the field's bounding rect — the list is at least as wide
     as the trigger, and can expand wider when content needs it. */
  width: max-content;
  max-width: min(480px, calc(100vw - 24px));
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px;
  margin: 0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 4px 24px oklch(0% 0 0 / 0.3);
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

:global(.cb-empty) {
  padding: 6px 8px;
  font-size: 12px;
  color: var(--color-muted);
}

:global(.cb-option) {
  padding: 5px 8px;
  font-size: 12px;
  color: var(--color-muted);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.08s ease-out,
    color 0.08s ease-out;
}

:global(.cb-option--hi) {
  background: var(--color-surface-hi);
  color: var(--color-text);
}

:global(.cb-option--sel) {
  color: var(--color-accent);
}

:global(.cb-option--sel.cb-option--hi) {
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
</style>
