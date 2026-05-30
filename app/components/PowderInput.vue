<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { POWDER_ID_BY_NAME, POWDER_NAME_BY_ID, POWDER_TIERS, SKP_ELEMENTS } from '~/lib/data/powder-constants'
import { POWDER_ELEMENT_META as ELEMENT_META, powderElementMeta } from '~/lib/data/powder-elements'

const props = defineProps<{
  slotLabel: string
  maxSlots: number
  value: number[]
}>()

const emit = defineEmits<{
  (e: 'update', ids: number[]): void
  (e: 'close'): void
}>()

function meta(id: number) {
  return powderElementMeta(POWDER_NAME_BY_ID.get(id))
}

function idsToShorthand(ids: number[]): string {
  return ids.map(id => POWDER_NAME_BY_ID.get(id)).filter(Boolean).join('')
}

function shorthandToIds(raw: string): { ids: number[], bad: string[] } {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
  const ids: number[] = []
  const bad: string[] = []
  let i = 0
  while (i < cleaned.length) {
    const ch = cleaned[i]!
    // Allow either letter+digit or digit+letter
    if (/[a-z]/.test(ch) && i + 1 < cleaned.length && /\d/.test(cleaned[i + 1]!)) {
      const token = ch + cleaned[i + 1]
      const id = POWDER_ID_BY_NAME.get(token)
      if (id !== undefined)
        ids.push(id)
      else
        bad.push(token)
      i += 2
    }
    else if (/\d/.test(ch) && i + 1 < cleaned.length && /[a-z]/.test(cleaned[i + 1]!)) {
      const token = cleaned[i + 1] + ch
      const id = POWDER_ID_BY_NAME.get(token)
      if (id !== undefined)
        ids.push(id)
      else
        bad.push(token)
      i += 2
    }
    else {
      bad.push(ch)
      i += 1
    }
  }
  return { ids: ids.slice(0, props.maxSlots), bad }
}

const text = ref(idsToShorthand(props.value))
const parseError = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const justCopied = ref(false)
const isEditingShorthand = ref(false)

// Reflect external changes (e.g. clicking grid swaps) back into the text field,
// but only when the user isn't actively typing in the shorthand input.
const localIds = ref<number[]>([...props.value])

watch(() => props.value, (v) => {
  if (isEditingShorthand.value)
    return
  localIds.value = [...v]
  text.value = idsToShorthand(v)
  parseError.value = null
})

function commit(ids: number[]) {
  localIds.value = ids
  text.value = idsToShorthand(ids)
  emit('update', ids)
}

function onShorthandInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  text.value = raw
  const { ids, bad } = shorthandToIds(raw)
  parseError.value = bad.length ? `Unknown token${bad.length === 1 ? '' : 's'}: ${bad.slice(0, 3).join(', ')}` : null
  localIds.value = ids
  emit('update', ids)
}

function addPowder(id: number) {
  if (localIds.value.length >= props.maxSlots)
    return
  commit([...localIds.value, id])
}

function removeAt(idx: number) {
  const next = [...localIds.value]
  next.splice(idx, 1)
  commit(next)
}

function clearAll() {
  commit([])
}

const shorthand = computed(() => idsToShorthand(localIds.value))

async function copyShorthand() {
  if (!shorthand.value)
    return
  try {
    await navigator.clipboard.writeText(shorthand.value)
    justCopied.value = true
    setTimeout(() => {
      justCopied.value = false
    }, 1200)
  }
  catch {
    // Ignore — clipboard API failures are silent
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape')
    emit('close')
}

onMounted(async () => {
  document.addEventListener('keydown', onKeyDown)
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})

const TIERS = Array.from({ length: POWDER_TIERS }, (_, i) => i + 1)
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="popover" role="dialog" :aria-label="`Powders for ${slotLabel}`">
      <header class="head">
        <div class="head-titles">
          <span class="kicker">Powders</span>
          <h3 class="title">
            {{ slotLabel }}
          </h3>
        </div>
        <button class="ghost" type="button" aria-label="Close" @click="emit('close')">
          ✕
        </button>
      </header>

      <div class="shorthand">
        <label class="field-label" for="powder-shorthand">Shorthand</label>
        <div class="shorthand-row">
          <input
            id="powder-shorthand"
            ref="inputRef"
            class="shorthand-input"
            :class="{ 'shorthand-input--bad': parseError }"
            :value="text"
            :placeholder="`e.g. f6f6t5 — up to ${maxSlots}`"
            spellcheck="false"
            autocomplete="off"
            @focus="isEditingShorthand = true"
            @blur="isEditingShorthand = false; text = idsToShorthand(localIds)"
            @input="onShorthandInput"
          >
          <button
            class="copy-btn"
            type="button"
            :disabled="!shorthand"
            @click="copyShorthand"
          >
            {{ justCopied ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <p v-if="parseError" class="hint hint--bad">
          {{ parseError }}
        </p>
        <p v-else class="hint">
          Slots used <span class="mono">{{ localIds.length }}/{{ maxSlots }}</span>
        </p>
      </div>

      <div class="current">
        <span class="field-label">Sequence</span>
        <div class="chip-row">
          <button
            v-for="(id, idx) in localIds"
            :key="idx"
            type="button"
            class="chip"
            :title="`Remove ${POWDER_NAME_BY_ID.get(id)}`"
            :style="{ color: meta(id)?.color ?? 'inherit' }"
            @click="removeAt(idx)"
          >
            <span class="chip-letter">{{ meta(id)?.letter }}</span>
            <span class="chip-tier">{{ POWDER_NAME_BY_ID.get(id)!.slice(1) }}</span>
          </button>
          <span v-for="i in Math.max(0, maxSlots - localIds.length)" :key="`empty-${i}`" class="chip chip--empty">·</span>
          <button v-if="localIds.length" type="button" class="ghost ghost--xs" @click="clearAll">
            Clear
          </button>
        </div>
      </div>

      <div class="grid-wrap">
        <span class="field-label">Click to append</span>
        <div class="powder-grid">
          <template v-for="el in SKP_ELEMENTS" :key="el">
            <div class="grid-row">
              <span
                class="grid-row-label"
                :style="{ color: ELEMENT_META[el]!.color }"
              >
                {{ ELEMENT_META[el]!.glyph }} {{ ELEMENT_META[el]!.name }}
              </span>
              <div class="grid-row-tiers">
                <button
                  v-for="tier in TIERS"
                  :key="tier"
                  type="button"
                  class="tier-btn"
                  :disabled="localIds.length >= maxSlots"
                  :style="{ borderColor: ELEMENT_META[el]!.color, color: ELEMENT_META[el]!.color }"
                  @click="addPowder(POWDER_ID_BY_NAME.get(`${el}${tier}`)!)"
                >
                  {{ tier }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklch, var(--color-bg) 70%, transparent);
  backdrop-filter: blur(2px);
  padding: 16px;
}

.popover {
  width: min(480px, 100%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 4px 24px oklch(0% 0 0 / 0.4);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.head-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  font-family: 'Barlow Semi Condensed', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0;
}

.ghost {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.ghost:hover {
  color: var(--color-text);
  border-color: var(--color-border);
}
.ghost--xs {
  font-size: 10px;
  padding: 2px 6px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.shorthand {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shorthand-row {
  display: flex;
  gap: 6px;
}

.shorthand-input {
  flex: 1;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--color-copper);
  background: color-mix(in oklch, var(--color-bg) 90%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  outline: none;
  transition:
    border-color 0.12s,
    box-shadow 0.12s;
}
.shorthand-input:focus {
  border-color: var(--color-copper);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-accent) 20%, transparent);
}
.shorthand-input--bad {
  border-color: oklch(60% 0.16 22);
}
.shorthand-input--bad:focus {
  border-color: oklch(60% 0.16 22);
  box-shadow: 0 0 0 2px oklch(60% 0.16 22 / 0.25);
}

.copy-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.copy-btn:hover:not(:disabled) {
  color: var(--color-copper);
  border-color: var(--color-copper);
}
.copy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hint {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-muted);
  margin: 0;
}
.hint--bad {
  color: oklch(68% 0.14 22);
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

.current {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 28px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s;
}
.chip:hover {
  border-color: currentColor;
  background: color-mix(in oklch, var(--color-surface) 60%, transparent);
}
.chip-letter {
  font-size: 11px;
  font-weight: 700;
}
.chip-tier {
  font-weight: 600;
}
.chip--empty {
  color: var(--color-faint);
  border-style: dashed;
  border-color: var(--color-border);
  cursor: default;
  padding: 3px 10px;
}
.chip--empty:hover {
  background: transparent;
}

.grid-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.powder-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
}

.grid-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: center;
  gap: 8px;
}

.grid-row-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.grid-row-tiers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.tier-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 3px 0;
  cursor: pointer;
  opacity: 0.55;
  transition:
    opacity 0.12s,
    background 0.12s;
}
.tier-btn:hover:not(:disabled) {
  opacity: 1;
  background: color-mix(in oklch, currentColor 12%, transparent);
}
.tier-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .overlay {
    align-items: flex-end;
    padding: 0;
  }
  .popover {
    width: 100%;
    max-width: 100%;
    border-radius: 14px 14px 0 0;
    border-bottom: none;
    padding: 18px 16px max(20px, env(safe-area-inset-bottom));
    gap: 14px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 -8px 32px oklch(0% 0 0 / 0.45);
    animation: powder-rise 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .title {
    font-size: 18px;
  }
  .grid-row {
    grid-template-columns: 84px 1fr;
    gap: 6px;
  }
  .grid-row-label {
    font-size: 10px;
  }
  .grid-row-tiers {
    gap: 3px;
  }
  .tier-btn {
    padding: 6px 0;
    min-height: 32px;
  }
  .chip {
    min-height: 30px;
  }
  .copy-btn {
    min-height: 36px;
  }
}

@keyframes powder-rise {
  from {
    transform: translateY(20px);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .popover {
    animation: none;
  }
}
</style>
