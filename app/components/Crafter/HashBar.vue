<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useCdnClient } from '~/composables/useBuildData'
import { useCraftStore } from '~/stores/craft'

const PREFIX = 'CR-'

const store = useCraftStore()

const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const inputValue = ref('')
const errorMsg = ref<string | null>(null)
const copied = ref(false)

const displayed = computed(() => store.shareHash ? `${PREFIX}${store.shareHash}` : '')

// Reflect store → input whenever the user isn't actively editing. This is the
// "always shows the live hash" half of the contract; the commit path below is
// the "edit to update" half.
watch(displayed, (next) => {
  if (!focused.value)
    inputValue.value = next
}, { immediate: true })

// Accept either `CR-<hash>` or a bare hash. Returns the stripped raw hash, or
// null if the shape doesn't look like a base64url-style craft hash.
function parseInput(raw: string): string | null {
  const s = raw.trim()
  if (!s)
    return null
  const stripped = s.toUpperCase().startsWith(PREFIX) ? s.slice(PREFIX.length) : s
  if (!/^[\w+/=-]+$/.test(stripped))
    return null
  return stripped
}

async function commit() {
  errorMsg.value = null
  const parsed = parseInput(inputValue.value)
  if (parsed === null) {
    // Empty or malformed; restore the current hash and surface a short error
    // only when the user actually typed something invalid.
    if (inputValue.value.trim() && inputValue.value !== displayed.value)
      errorMsg.value = 'Not a valid craft hash'
    inputValue.value = displayed.value
    return
  }
  if (parsed === store.shareHash) {
    // No-op edit (user pressed Enter without changing anything). Snap back to
    // the canonical formatted value so any whitespace/case typos disappear.
    inputValue.value = displayed.value
    return
  }
  await store.loadFromHash(parsed, useCdnClient())
  if (store.error)
    errorMsg.value = store.error
}

function onFocus() {
  focused.value = true
  errorMsg.value = null
}

async function onBlur() {
  focused.value = false
  await commit()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    inputRef.value?.blur() // triggers commit() via onBlur
  }
  else if (e.key === 'Escape') {
    inputValue.value = displayed.value
    errorMsg.value = null
    inputRef.value?.blur()
  }
}

async function copy() {
  if (!displayed.value || typeof navigator === 'undefined' || !navigator.clipboard)
    return
  try {
    await navigator.clipboard.writeText(displayed.value)
    copied.value = true
    await nextTick()
    setTimeout(() => {
      copied.value = false
    }, 1400)
  }
  catch {
    // Clipboard refused (insecure context, permissions). Fail silently — the
    // input is selectable, the user can copy manually.
  }
}
</script>

<template>
  <div class="hash-bar">
    <label class="hash-bar__label" for="craft-hash-input">Craft</label>
    <input
      id="craft-hash-input"
      ref="inputRef"
      v-model="inputValue"
      class="hash-bar__input"
      :class="{ 'hash-bar__input--error': errorMsg }"
      type="text"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      :placeholder="`${PREFIX}…`"
      :aria-invalid="errorMsg ? 'true' : 'false'"
      :aria-describedby="errorMsg ? 'craft-hash-error' : undefined"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    >
    <button
      class="hash-bar__copy"
      type="button"
      :disabled="!displayed"
      :aria-label="copied ? 'Copied' : 'Copy craft hash'"
      @click="copy"
    >
      {{ copied ? 'Copied' : 'Copy' }}
    </button>
    <p
      v-if="errorMsg"
      id="craft-hash-error"
      class="hash-bar__error"
      role="alert"
    >
      {{ errorMsg }}
    </p>
  </div>
</template>

<style scoped>
.hash-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--color-border);
}

.hash-bar__label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.hash-bar__input {
  min-width: 0;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 6px 10px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  outline: none;
  transition:
    border-color 0.12s ease-out,
    box-shadow 0.12s ease-out;
}

.hash-bar__input::placeholder {
  color: var(--color-faint);
}

.hash-bar__input:focus {
  border-color: color-mix(in oklch, var(--color-accent) 55%, transparent);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-accent) 10%, transparent);
}

.hash-bar__input--error,
.hash-bar__input--error:focus {
  border-color: oklch(62% 0.15 20 / 0.6);
  box-shadow: 0 0 0 2px oklch(62% 0.15 20 / 0.08);
}

.hash-bar__copy {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 6px 12px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.hash-bar__copy:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.hash-bar__copy:disabled {
  opacity: 0.35;
  cursor: default;
}

.hash-bar__copy:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.hash-bar__error {
  grid-column: 2 / 3;
  margin: 0;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: oklch(62% 0.15 20);
}

@media (max-width: 720px) {
  .hash-bar {
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 10px;
    row-gap: 6px;
    padding: 6px 0 10px;
  }
  /* Label sits beside the input; copy button drops below to span full width. */
  .hash-bar__copy {
    grid-column: 1 / -1;
    justify-self: stretch;
    padding: 9px 12px;
    min-height: 38px;
  }
  .hash-bar__input {
    min-height: 36px;
    font-size: 13px;
  }
  .hash-bar__error {
    grid-column: 1 / -1;
  }
}
</style>
