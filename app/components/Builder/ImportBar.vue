<script setup lang="ts">
type State = 'rest' | 'open' | 'confirm'

const router = useRouter()
const route = useRoute()

const state = ref<State>('rest')
const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// Only confirm before overwriting when a specific build hash is in the URL.
// On /builder/ (index, blank build) we skip the confirmation step.
const hasHashRoute = computed(() => !!route.params.hash)

interface ParsedHash {
  hash: string
  source: 'WynnBuilder' | 'hppeng' | null
}

function parseInput(raw: string): ParsedHash | null {
  const s = raw.trim()
  if (!s)
    return null

  // Full URL from one of the three known origins
  const urlFragment = s.match(/#([\w+/=-]+)$/)
  if (urlFragment) {
    if (s.includes('hppeng-wynn.github.io'))
      return { hash: urlFragment[1]!, source: 'hppeng' }
    if (s.includes('wynnbuilder.github.io') || s.includes('wynnbuilder-beta.github.io'))
      return { hash: urlFragment[1]!, source: 'WynnBuilder' }
    // Has a fragment but unknown domain — reject
    return null
  }

  // Bare hash: base64url-like, minimum 20 chars
  if (/^[\w+/=-]{20,}$/.test(s))
    return { hash: s, source: null }

  return null
}

const parsed = computed(() => parseInput(inputValue.value))
const hasInput = computed(() => inputValue.value.trim().length > 0)
const isInvalid = computed(() => hasInput.value && !parsed.value)

async function open() {
  state.value = 'open'
  await nextTick()
  inputRef.value?.focus()
}

function close() {
  state.value = 'rest'
  inputValue.value = ''
}

function submit() {
  if (!parsed.value)
    return
  if (hasHashRoute.value) {
    state.value = 'confirm'
  }
  else {
    navigate()
  }
}

function navigate() {
  const hash = parsed.value!.hash
  router.push(`/builder/${hash}`)
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter')
    submit()
  if (e.key === 'Escape')
    close()
}
</script>

<template>
  <div class="import-bar" :class="{ 'import-bar--collapsed': state === 'rest' }">
    <!-- Rest -->
    <template v-if="state === 'rest'">
      <button class="trigger" type="button" @click="open">
        Import build
        <span class="trigger-arrow" aria-hidden="true">→</span>
      </button>
    </template>

    <!-- Open -->
    <template v-else-if="state === 'open'">
      <div class="input-row">
        <input
          ref="inputRef"
          v-model="inputValue"
          class="url-input"
          :class="{ 'url-input--valid': parsed, 'url-input--invalid': isInvalid }"
          type="text"
          placeholder="Paste a WynnBuilder or hppeng link…"
          spellcheck="false"
          autocomplete="off"
          @keydown="onKeydown"
        >
        <button
          class="action-btn"
          type="button"
          :disabled="!parsed"
          @click="submit"
        >
          Load
        </button>
        <button class="close-btn" type="button" aria-label="Cancel import" @click="close">
          ✕
        </button>
      </div>
      <p v-if="isInvalid" class="hint hint--error">
        Not a recognized WynnBuilder or hppeng link
      </p>
      <p v-else-if="parsed" class="hint hint--source">
        {{ parsed.source ? `${parsed.source} link` : 'Build hash detected' }}
      </p>
    </template>

    <!-- Confirm -->
    <template v-else-if="state === 'confirm'">
      <div class="confirm-row">
        <span class="confirm-text">Replace current build?</span>
        <div class="confirm-actions">
          <button class="action-btn action-btn--primary" type="button" @click="navigate">
            Load build
          </button>
          <button class="cancel-btn" type="button" @click="close">
            Cancel
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.import-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 28px;
}

.import-bar--collapsed {
  align-items: flex-end;
}

/* Rest */
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: transparent;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  transition: color 0.12s ease-out;
}

.trigger:hover {
  color: var(--color-muted);
}

.trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 3px;
}

.trigger-arrow {
  display: inline-block;
  transition: transform 0.12s ease-out;
}

.trigger:hover .trigger-arrow {
  transform: translateX(3px);
}

/* Open */
.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.url-input {
  flex: 1;
  min-width: 0;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 7px 12px;
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  outline: none;
  transition:
    border-color 0.12s ease-out,
    box-shadow 0.12s ease-out;
}

.url-input::placeholder {
  color: var(--color-faint);
}

.url-input:focus {
  border-color: color-mix(in oklch, var(--color-accent) 50%, transparent);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-accent) 10%, transparent);
}

.url-input--valid {
  border-color: color-mix(in oklch, var(--color-accent) 45%, transparent);
}

.url-input--invalid {
  border-color: oklch(62% 0.15 20 / 0.5);
}

.action-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 7px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.action-btn:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.action-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.action-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.action-btn--primary {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 40%, transparent);
}

.action-btn--primary:not(:disabled):hover {
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
  border-color: var(--color-accent);
}

.close-btn {
  font-size: 12px;
  color: var(--color-faint);
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.12s ease-out;
}

.close-btn:hover {
  color: var(--color-muted);
}

.close-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Hints */
.hint {
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
}

.hint--error {
  color: oklch(62% 0.15 20);
}

.hint--source {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--color-accent);
}

/* Confirm */
.confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 2px 0;
}

.confirm-text {
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 13px;
  color: var(--color-muted);
}

.confirm-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 720px) {
  .import-bar--collapsed {
    align-items: stretch;
  }
  .trigger {
    align-self: flex-end;
  }
  .input-row {
    flex-wrap: wrap;
    gap: 6px;
  }
  .url-input {
    flex: 1 1 100%;
    min-height: 36px;
  }
  .action-btn {
    flex: 1;
    padding: 8px 10px;
    min-height: 36px;
  }
  .confirm-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .confirm-actions {
    justify-content: flex-end;
  }
}

.cancel-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: transparent;
  border: none;
  padding: 7px 10px;
  cursor: pointer;
  border-radius: 5px;
  transition: color 0.12s ease-out;
}

.cancel-btn:hover {
  color: var(--color-muted);
}

.cancel-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
