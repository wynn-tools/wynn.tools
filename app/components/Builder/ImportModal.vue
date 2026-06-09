<script setup lang="ts">
import type { BatchResult } from '~/lib/wynntils/import'
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
  <UiDialog
    :open="props.open"
    title="Import from Wynntils"
    variant="elevated"
    width="min(640px, calc(100vw - 32px))"
    @update:open="emit('update:open', $event)"
  >
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

    <template #footer>
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
    </template>
  </UiDialog>
</template>

<!-- Unscoped: lives inside UiDialog's portaled content. -->
<style>
.ui-dialog .hint {
  font-size: 12px;
  color: var(--color-muted);
  margin: -4px 0 0;
  line-height: 1.5;
}

.ui-dialog .input-area {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.55;
  resize: vertical;
  min-height: 96px;
}

.ui-dialog .fatal-error {
  color: oklch(62% 0.15 20);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  margin: 0;
}

.ui-dialog .preview-wrap {
  margin-top: 2px;
  overflow-x: auto;
  border-top: 1px solid color-mix(in oklch, var(--color-border) 60%, transparent);
  padding-top: 10px;
}
.ui-dialog .preview-table {
  width: 100%;
  border-collapse: collapse;
}
.ui-dialog .preview-table th {
  text-align: left;
  padding: 0 12px 6px 0;
  white-space: nowrap;
  font-size: 10px;
}
.ui-dialog .preview-table th.num {
  text-align: right;
  padding-right: 12px;
}
.ui-dialog .preview-table td {
  padding: 6px 12px 6px 0;
  color: var(--color-text);
  border-top: 1px solid color-mix(in oklch, var(--color-border) 40%, transparent);
  vertical-align: top;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.4;
}
.ui-dialog .preview-table td.num {
  text-align: right;
  padding-right: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-muted);
}
.ui-dialog .preview-table td.name {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text);
}
.ui-dialog .row-err td {
  color: var(--color-faint);
}
.ui-dialog .err-source {
  font-size: 11px;
  color: var(--color-muted);
  word-break: break-all;
  max-width: 220px;
}
.ui-dialog .status-ok {
  color: var(--color-muted);
}
.ui-dialog .status-warn {
  color: var(--color-gold);
  cursor: help;
  text-decoration: underline dotted from-font;
  text-underline-offset: 2px;
}
.ui-dialog .status-err {
  color: oklch(62% 0.15 20);
  cursor: help;
  text-decoration: underline dotted from-font;
  text-underline-offset: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ui-dialog .count {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-right: auto;
}
.ui-dialog .btn-cancel,
.ui-dialog .btn-apply {
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
.ui-dialog .btn-cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
}
.ui-dialog .btn-cancel:hover {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.ui-dialog .btn-apply {
  background: color-mix(in oklch, var(--color-accent) 12%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-accent) 70%, transparent);
  color: var(--color-accent);
}
.ui-dialog .btn-apply:hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-accent) 20%, transparent);
  border-color: var(--color-accent);
}
.ui-dialog .btn-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-faint);
}
.ui-dialog .btn-apply:focus-visible,
.ui-dialog .btn-cancel:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
