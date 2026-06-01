<!-- app/components/Builder/ImportModal.vue -->
<script setup lang="ts">
import type { BatchResult } from '~/lib/wynntils/import'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useToast } from '~/composables/useToast'
import { getIdKeys } from '~/lib/wynntils/id-keys'
import { parseAndResolveAll } from '~/lib/wynntils/import'
import { useBuildStore } from '~/stores/build'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const store = useBuildStore()
const { push } = useToast()
const text = ref('')
const preview = ref<BatchResult>({ applied: [], errors: [] })
const fatalError = ref<string | null>(null)

const SLOT_LABELS_FULL = ['Helmet', 'Chestplate', 'Leggings', 'Boots', 'Ring 1', 'Ring 2', 'Bracelet', 'Necklace', 'Weapon']

let debounce: ReturnType<typeof setTimeout> | null = null
watch(text, () => {
  if (debounce)
    clearTimeout(debounce)
  debounce = setTimeout(refresh, 200)
})

async function refresh() {
  fatalError.value = null
  if (!text.value.trim() || !store.ctx) {
    preview.value = { applied: [], errors: [] }
    return
  }
  try {
    const idKeys = await getIdKeys()
    preview.value = parseAndResolveAll(text.value, store.ctx, idKeys)
  }
  catch {
    fatalError.value = 'Wynntils ID list unavailable, try again later.'
    preview.value = { applied: [], errors: [] }
  }
}

const canApply = computed(() => preview.value.applied.length > 0)
const hasRows = computed(() => preview.value.applied.length > 0 || preview.value.errors.length > 0)

function close() {
  emit('update:open', false)
}

function apply() {
  store.applyImport(preview.value.applied)
  push('info', `Imported ${preview.value.applied.length} item${preview.value.applied.length === 1 ? '' : 's'} from Wynntils.`)
  text.value = ''
  preview.value = { applied: [], errors: [] }
  close()
}

function slotLabel(slot: number): string {
  return SLOT_LABELS_FULL[slot] ?? `Slot ${slot}`
}

function statusLabel(warnings: string[]): string {
  return warnings.length === 0 ? 'OK' : `OK (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="dialog">
        <header class="head">
          <DialogTitle class="kicker title">
            Import from Wynntils
          </DialogTitle>
          <DialogClose class="x" aria-label="Close">
            ×
          </DialogClose>
        </header>

        <p class="hint">
          One item code per line. Each is routed to its slot automatically.
        </p>

        <textarea
          v-model="text"
          class="input-area f-input"
          rows="6"
          placeholder="In-game item codes, one per line…"
          spellcheck="false"
          autocomplete="off"
        />

        <p v-if="fatalError" class="fatal-error" role="alert">
          {{ fatalError }}
        </p>

        <div v-if="hasRows" class="preview-wrap">
          <table class="preview-table">
            <thead>
              <tr>
                <th class="kicker">
                  Slot
                </th>
                <th class="kicker">
                  Item
                </th>
                <th class="kicker num">
                  Rolls
                </th>
                <th class="kicker num">
                  Powders
                </th>
                <th class="kicker">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in preview.applied"
                :key="`ok-${i}`"
                class="row-ok"
              >
                <td>{{ slotLabel(row.slot) }}</td>
                <td class="name">
                  {{ row.decodedName }}
                </td>
                <td class="num">
                  {{ row.overrides.size }}
                </td>
                <td class="num">
                  {{ row.powders.length }}
                </td>
                <td>
                  <span
                    :class="row.warnings.length > 0 ? 'status-warn' : 'status-ok'"
                    :title="row.warnings.length > 0 ? row.warnings.join('\n') : undefined"
                  >
                    {{ statusLabel(row.warnings) }}
                  </span>
                </td>
              </tr>
              <tr
                v-for="(err, i) in preview.errors"
                :key="`err-${i}`"
                class="row-err"
              >
                <td aria-hidden="true">
                  —
                </td>
                <td class="err-source">
                  {{ err.source.length > 32 ? `${err.source.slice(0, 32)}…` : err.source }}
                </td>
                <td class="num" aria-hidden="true">
                  —
                </td>
                <td class="num" aria-hidden="true">
                  —
                </td>
                <td class="status-err" :title="err.message">
                  {{ err.message }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="foot">
          <span class="count">
            <template v-if="canApply">
              {{ preview.applied.length }} ready<span v-if="preview.errors.length"> · {{ preview.errors.length }} skipped</span>
            </template>
            <template v-else-if="preview.errors.length">
              Nothing applies
            </template>
          </span>
          <button type="button" class="btn-cancel" @click="close">
            Cancel
          </button>
          <button
            type="button"
            class="btn-apply"
            :disabled="!canApply"
            @click="apply"
          >
            Apply{{ canApply ? ` ${preview.applied.length}` : '' }}
          </button>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Overlay tinted toward the system hue (no pure black). */
.overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in oklch, var(--color-bg) 70%, transparent);
  backdrop-filter: blur(2px);
  z-index: 50;
}

/* Floating panel per the system rule: surface at high opacity, blurred ground,
   accent/20 ring, structural float shadow. Flat at rest otherwise. */
.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(640px, calc(100vw - 32px));
  max-height: 86vh;
  overflow: auto;
  background: color-mix(in oklch, var(--color-surface) 96%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  z-index: 51;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow:
    0 4px 24px oklch(0% 0 0 / 0.3),
    inset 0 0 0 1px color-mix(in oklch, var(--color-accent) 18%, transparent);
  backdrop-filter: blur(12px);
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.title {
  /* kicker utility provides the type role; only color is local. */
  color: var(--color-text);
}
.x {
  background: transparent;
  border: 0;
  color: var(--color-muted);
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.x:hover {
  color: var(--color-text);
  background: color-mix(in oklch, var(--color-surface-hi) 50%, transparent);
}
.x:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.hint {
  font-size: 12px;
  color: var(--color-muted);
  margin: -4px 0 0;
  line-height: 1.5;
}

.input-area {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.55;
  resize: vertical;
  min-height: 96px;
}

.fatal-error {
  color: oklch(62% 0.15 20);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  margin: 0;
}

.preview-wrap {
  margin-top: 2px;
  overflow-x: auto;
  border-top: 1px solid color-mix(in oklch, var(--color-border) 60%, transparent);
  padding-top: 10px;
}
.preview-table {
  width: 100%;
  border-collapse: collapse;
}
.preview-table th {
  text-align: left;
  padding: 0 12px 6px 0;
  white-space: nowrap;
  font-size: 10px;
}
.preview-table th.num {
  text-align: right;
  padding-right: 12px;
}
.preview-table td {
  padding: 6px 12px 6px 0;
  color: var(--color-text);
  border-top: 1px solid color-mix(in oklch, var(--color-border) 40%, transparent);
  vertical-align: top;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.4;
}
.preview-table td.num {
  text-align: right;
  padding-right: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-muted);
}
.preview-table td.name {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text);
}

.row-err td {
  color: var(--color-faint);
}
.err-source {
  font-size: 11px;
  color: var(--color-muted);
  word-break: break-all;
  max-width: 220px;
}

.status-ok {
  color: var(--color-muted);
}
.status-warn {
  color: var(--color-gold);
  cursor: help;
  text-decoration: underline dotted from-font;
  text-underline-offset: 2px;
}
.status-err {
  color: oklch(62% 0.15 20);
  cursor: help;
  text-decoration: underline dotted from-font;
  text-underline-offset: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.count {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-right: auto;
}
.btn-cancel,
.btn-apply {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border-radius: 5px;
  padding: 7px 14px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}
.btn-cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
}
.btn-cancel:hover {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.btn-apply {
  background: color-mix(in oklch, var(--color-accent) 12%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-accent) 70%, transparent);
  color: var(--color-accent);
}
.btn-apply:hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-accent) 20%, transparent);
  border-color: var(--color-accent);
}
.btn-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-faint);
}
.btn-apply:focus-visible,
.btn-cancel:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
