<script setup lang="ts">
import type { IdConstraint, SortDir } from '~/lib/items-search/types'
import { humanizeField } from '~/lib/data/identifications'
import { STAT_SUM_PRESETS } from '~/lib/items-search/stat-sums'

const props = defineProps<{ focusKey?: string | null }>()
const model = defineModel<IdConstraint[]>({ required: true })
const itemRefs = new Map<string, HTMLInputElement>()

function bindInput(key: string) {
  return (el: unknown) => {
    if (el instanceof HTMLInputElement)
      itemRefs.set(key, el)
    else
      itemRefs.delete(key)
  }
}

watch(() => props.focusKey, async (k) => {
  if (!k)
    return
  await nextTick()
  itemRefs.get(k)?.focus()
})

function labelOf(c: IdConstraint): string {
  if (c.kind === 'id')
    return humanizeField(c.key).label.toUpperCase()
  if (c.kind === 'sum')
    return STAT_SUM_PRESETS[c.preset].label.toUpperCase()
  return 'EXPR'
}

function keyOf(c: IdConstraint): string {
  if (c.kind === 'id')
    return c.key
  if (c.kind === 'sum')
    return c.preset
  return 'expr'
}

function setMin(i: number, value: number) {
  const next = [...model.value]
  const c = next[i]!
  if (c.kind === 'id' || c.kind === 'sum')
    next[i] = { ...c, min: Number.isFinite(value) ? value : undefined }
  model.value = next
}

function cycleSort(i: number) {
  const next = [...model.value]
  const c = next[i]!
  if (c.kind !== 'id' && c.kind !== 'sum')
    return
  const order: (SortDir | undefined)[] = [undefined, 'desc', 'asc']
  const cur = c.sort
  const idx = order.indexOf(cur)
  const nextSort = order[(idx + 1) % order.length]
  next[i] = { ...c, sort: nextSort }
  model.value = next
}

function remove(i: number) {
  model.value = model.value.filter((_, j) => j !== i)
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')
    return
  const dir = e.key === 'ArrowRight' ? 1 : -1
  const target = e.currentTarget as HTMLElement
  const cells = Array.from(target.querySelectorAll<HTMLElement>('[data-toolbar-item]'))
  const active = document.activeElement as HTMLElement
  const j = cells.indexOf(active)
  if (j < 0)
    return
  const next = cells[(j + dir + cells.length) % cells.length]
  next?.focus()
  e.preventDefault()
}
</script>

<template>
  <ul class="constraints" role="group" :aria-label="`Active identification filters, ${model.length} items`">
    <li
      v-for="(c, i) in model" :key="`${c.kind}-${keyOf(c)}-${i}`"
      class="constraint" role="toolbar" :aria-label="labelOf(c)"
      @keydown="onKey"
    >
      <span class="constraint-label">{{ labelOf(c) }}</span>
      <span v-if="c.kind === 'expr'" class="constraint-expr">{{ c.source }}</span>
      <template v-else>
        <span class="constraint-op">≥</span>
        <input
          :ref="bindInput(keyOf(c))"
          type="number" inputmode="numeric"
          class="constraint-min" data-toolbar-item
          :value="c.min ?? ''"
          :aria-label="`${labelOf(c)} minimum`"
          @input="setMin(i, Number(($event.target as HTMLInputElement).value))"
        >
        <button
          type="button" class="constraint-sort" data-toolbar-item
          :aria-pressed="c.sort !== undefined"
          :aria-label="`Sort by ${labelOf(c)}, currently ${c.sort ?? 'off'}`"
          @click="cycleSort(i)"
        >
          {{ c.sort === 'desc' ? '↓' : c.sort === 'asc' ? '↑' : '↕' }}
        </button>
      </template>
      <button
        type="button" class="constraint-remove" data-toolbar-item
        :aria-label="`Remove ${labelOf(c)} filter`"
        @click="remove(i)"
      >
        ×
      </button>
    </li>
  </ul>
</template>

<style scoped>
.constraints {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
}
.constraint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
}
.constraint-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--color-text);
}
.constraint-op {
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
}
.constraint-min {
  width: 5ch;
  background: transparent;
  border: 0;
  outline: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-accent);
  text-align: right;
}
.constraint-min::-webkit-outer-spin-button,
.constraint-min::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
.constraint-min:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 2px;
}
.constraint-sort,
.constraint-remove {
  background: transparent;
  border: 0;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-muted);
  cursor: pointer;
}
.constraint-sort[aria-pressed='true'] {
  color: var(--color-accent);
}
.constraint-remove {
  color: var(--color-faint);
  margin-left: auto;
  font-size: 16px;
}
.constraint-sort:hover,
.constraint-remove:hover {
  color: var(--color-accent);
}
.constraint-sort:focus-visible,
.constraint-remove:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.constraint-expr {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
}
</style>
