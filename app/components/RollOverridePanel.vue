<!-- app/components/RollOverridePanel.vue -->
<script setup lang="ts">
import type { ExpandedItem } from '~/lib/math/expand-item'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref } from 'vue'
import { humanizeShortId } from '~/lib/data/identifications'
import { idRound } from '~/lib/math/expand-item'
import { parseIdString } from '~/lib/wynntils/decode'
import { getIdKeys } from '~/lib/wynntils/id-keys'
import { resolveImport } from '~/lib/wynntils/import'
import { useBuildStore } from '~/stores/build'

const props = defineProps<{
  open: boolean
  /** 'item' or 'tome' — picks which override map to read/write. */
  kind: 'item' | 'tome'
  /** Slot index (0..8 for items, 0..6 for tomes). */
  slotIdx: number
  /** The resolved ExpandedItem for this slot (carries minRolls/maxRolls). */
  item: ExpandedItem
  /** Display name for the modal title. */
  itemName: string
}>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const store = useBuildStore()

const pasteValue = ref('')
const pasteError = ref<string | null>(null)

async function onPaste(ev: ClipboardEvent) {
  const text = (ev.clipboardData?.getData('text') ?? '').trim()
  if (!text)
    return
  ev.preventDefault()
  pasteValue.value = text
  pasteError.value = null
  if (!store.ctx)
    return

  let blocks
  try {
    blocks = parseIdString(text)
  }
  catch {
    pasteError.value = 'Invalid Wynntils item string.'
    return
  }

  let idKeys
  try {
    idKeys = await getIdKeys()
  }
  catch {
    pasteError.value = 'Wynntils ID list unavailable, try again later.'
    return
  }

  const result = resolveImport(blocks, store.ctx, idKeys, new Set())
  if (!result.ok) {
    pasteError.value = result.error.message
    return
  }
  if (result.row.decodedName !== props.itemName) {
    pasteError.value = `Pasted item is '${result.row.decodedName}', this slot has '${props.itemName}'.`
    return
  }

  store.applyImport([{ ...result.row, slot: props.slotIdx }])
  pasteValue.value = ''
}

interface Row {
  id: string
  label: string
  unit: string
  loEnd: number
  hiEnd: number
  presetValue: number
}

const rows = computed<Row[]>(() => {
  const minRolls = props.item.get('minRolls') as
    | Map<string, number>
    | undefined
  const maxRolls = props.item.get('maxRolls') as
    | Map<string, number>
    | undefined
  const applied = props.item.get('appliedRolls') as
    | Map<string, number>
    | undefined
  if (!minRolls || !maxRolls)
    return []
  const out: Row[] = []
  for (const [id, max] of maxRolls) {
    const min = minRolls.get(id) ?? 0
    if (min === max)
      continue
    const { label, unit } = humanizeShortId(id)
    out.push({
      id,
      label,
      unit,
      loEnd: Math.min(min, max),
      hiEnd: Math.max(min, max),
      presetValue: applied?.get(id) ?? max,
    })
  }
  return out
})

function overrideOf(id: string): number | undefined {
  const map
    = props.kind === 'item' ? store.itemRollOverrides : store.tomeRollOverrides
  return map.get(props.slotIdx)?.get(id)
}

function setValue(row: Row, rawInput: string) {
  if (rawInput === '') {
    if (props.kind === 'item')
      store.clearOverride(props.slotIdx, row.id)
    else store.clearTomeOverride(props.slotIdx, row.id)
    return
  }
  const parsed = Number(rawInput)
  if (Number.isNaN(parsed))
    return
  const clamped = Math.max(row.loEnd, Math.min(row.hiEnd, idRound(parsed)))
  if (props.kind === 'item')
    store.setOverride(props.slotIdx, row.id, clamped)
  else store.setTomeOverride(props.slotIdx, row.id, clamped)
}

function presetFor(p: 'min' | 'avg' | 'max', row: Row): number {
  if (p === 'min')
    return row.loEnd // numerically; the row treats endpoints as numbers
  if (p === 'max')
    return row.hiEnd
  return idRound((row.loEnd + row.hiEnd) / 2)
}

function setAllTo(p: 'min' | 'avg' | 'max') {
  for (const row of rows.value) {
    const v = presetFor(p, row)
    if (props.kind === 'item')
      store.setOverride(props.slotIdx, row.id, v)
    else store.setTomeOverride(props.slotIdx, row.id, v)
  }
}

function clearAll() {
  if (props.kind === 'item')
    store.clearSlotOverrides(props.slotIdx)
  else store.clearTomeSlotOverrides(props.slotIdx)
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="dialog">
        <header class="head">
          <DialogTitle class="title">
            {{ itemName }} · Rolls
          </DialogTitle>
          <DialogClose class="x" aria-label="Close">
            ×
          </DialogClose>
        </header>
        <div v-if="props.kind === 'item'" class="wynntils-paste">
          <input
            v-model="pasteValue"
            type="text"
            placeholder="Paste Wynntils item string"
            class="paste-input"
            @paste="onPaste"
          >
          <p v-if="pasteError" class="paste-error">
            {{ pasteError }}
          </p>
        </div>
        <div class="bulk">
          <span class="kicker">Set all to</span>
          <button type="button" @click="setAllTo('min')">
            Min
          </button>
          <button type="button" @click="setAllTo('avg')">
            Avg
          </button>
          <button type="button" @click="setAllTo('max')">
            Max
          </button>
          <button class="clear" type="button" @click="clearAll">
            Clear all
          </button>
        </div>
        <ul class="rows">
          <li v-for="row in rows" :key="row.id" class="row">
            <span class="label">
              {{ row.label }}<span v-if="row.unit" class="unit">{{ row.unit }}</span>
            </span>
            <span class="lo">{{ row.loEnd }}</span>
            <input
              class="input"
              type="number"
              inputmode="numeric"
              :placeholder="String(row.presetValue)"
              :value="overrideOf(row.id) ?? ''"
              @blur="setValue(row, ($event.target as HTMLInputElement).value)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            >
            <span class="hi">{{ row.hiEnd }}</span>
            <button
              v-if="overrideOf(row.id) !== undefined"
              class="reset"
              type="button"
              :aria-label="`Reset ${row.label}`"
              @click="
                props.kind === 'item'
                  ? store.clearOverride(props.slotIdx, row.id)
                  : store.clearTomeOverride(props.slotIdx, row.id)
              "
            >
              ↺
            </button>
            <span v-else class="reset-spacer" />
          </li>
        </ul>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: oklch(0% 0 0 / 0.55);
  z-index: 50;
}
.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, 92vw);
  max-height: 86vh;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  z-index: 51;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.title {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
}
.x {
  background: transparent;
  border: 0;
  color: var(--color-muted);
  font-size: 18px;
  cursor: pointer;
}
.bulk {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.bulk .kicker {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-faint);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.bulk button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 3px 9px;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  cursor: pointer;
}
.bulk button:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.bulk .clear {
  margin-left: auto;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 36px 80px 36px 20px;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
}
.label {
  color: var(--color-text);
}
.unit {
  color: var(--color-faint);
  margin-left: 2px;
}
.lo,
.hi {
  color: var(--color-faint);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.input {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 3px 6px;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 11px;
  text-align: center;
}
.input:focus {
  outline: 1px solid var(--color-accent);
}
.reset {
  background: transparent;
  border: 0;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.reset:hover {
  color: var(--color-accent);
}
.reset-spacer {
  width: 20px;
}
.wynntils-paste {
  padding: 0 0 0.5rem;
}
.paste-input {
  width: 100%;
  font: inherit;
  padding: 0.4rem 0.6rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 6px;
}
.paste-input::placeholder {
  color: var(--color-muted);
}
.paste-error {
  color: var(--color-error, oklch(60% 0.18 25));
  font-size: 0.85rem;
  margin: 0.25rem 0 0;
}
</style>
