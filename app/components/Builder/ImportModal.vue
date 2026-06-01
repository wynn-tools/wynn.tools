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
          <DialogTitle class="title">
            Import from Wynntils
          </DialogTitle>
          <DialogClose class="x" aria-label="Close">
            ×
          </DialogClose>
        </header>

        <p class="hint">
          Paste one Wynntils item string per line. Items are routed automatically to their slots.
        </p>

        <textarea
          v-model="text"
          class="input-area"
          rows="6"
          placeholder="Paste item strings here, one per line…"
          spellcheck="false"
          autocomplete="off"
        />

        <p v-if="fatalError" class="fatal-error">
          {{ fatalError }}
        </p>

        <div v-if="hasRows" class="preview-wrap">
          <table class="preview-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Item</th>
                <th>Rolls</th>
                <th>Powders</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in preview.applied"
                :key="`ok-${i}`"
                class="row-ok"
              >
                <td>{{ slotLabel(row.slot) }}</td>
                <td>{{ row.decodedName }}</td>
                <td>{{ row.overrides.size }}</td>
                <td>{{ row.powders.length }}</td>
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
                <td>—</td>
                <td class="err-source">
                  {{ err.source.length > 32 ? `${err.source.slice(0, 32)}…` : err.source }}
                </td>
                <td>—</td>
                <td>—</td>
                <td class="status-err" :title="err.message">
                  {{ err.message }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="foot">
          <button type="button" class="btn-cancel" @click="close">
            Cancel
          </button>
          <button
            type="button"
            class="btn-apply"
            :disabled="!canApply"
            @click="apply"
          >
            Apply All
          </button>
        </footer>
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
  width: min(600px, 92vw);
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
.hint {
  font-size: 11px;
  color: var(--color-muted);
  margin: 0;
  line-height: 1.5;
}
.input-area {
  width: 100%;
  box-sizing: border-box;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  resize: vertical;
}
.input-area::placeholder {
  color: var(--color-muted);
}
.input-area:focus {
  outline: 1px solid var(--color-accent);
}
.fatal-error {
  color: var(--color-error, oklch(60% 0.18 25));
  font-size: 0.85rem;
  margin: 0;
}
.preview-wrap {
  overflow-x: auto;
}
.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 11px;
}
.preview-table th {
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  color: var(--color-faint);
  padding: 4px 8px 4px 0;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.preview-table td {
  padding: 5px 8px 5px 0;
  color: var(--color-text);
  border-bottom: 1px solid color-mix(in oklch, var(--color-border) 50%, transparent);
  vertical-align: top;
}
.row-err td {
  color: var(--color-muted);
}
.err-source {
  font-size: 10px;
  word-break: break-all;
}
.status-ok {
  color: oklch(68% 0.14 155);
}
.status-warn {
  color: oklch(75% 0.15 80);
  cursor: help;
  text-decoration: underline dotted;
}
.status-err {
  color: var(--color-error, oklch(60% 0.18 25));
  cursor: help;
  text-decoration: underline dotted;
  max-width: 200px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.btn-cancel,
.btn-apply {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: 4px;
  padding: 5px 12px;
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
  border-color: var(--color-text);
}
.btn-apply {
  background: color-mix(in oklch, var(--color-accent) 15%, transparent);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
}
.btn-apply:hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-accent) 25%, transparent);
}
.btn-apply:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.btn-apply:focus-visible,
.btn-cancel:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
