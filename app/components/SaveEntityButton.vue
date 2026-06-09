<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

type Visibility = 'public' | 'unlisted' | 'private'

const props = defineProps<{
  noun: string
  defaultName: string
  disabled?: boolean
  savedId?: string
  isOwner?: boolean
  visibility?: Visibility
  onCreate: (input: { name: string, visibility: Visibility }) => Promise<void>
  onUpdate: (input: { visibility: Visibility }) => Promise<void>
}>()

const visibilityOptions: Array<{ value: Visibility, label: string }> = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
]

const auth = useAuthStore()

type State = 'idle' | 'auth-prompt' | 'name-prompt' | 'settings' | 'saving' | 'saved'
const state = ref<State>('idle')
const open = ref(false)
const name = ref(props.defaultName)
const selectedVisibility = ref<Visibility>(props.visibility ?? 'public')
const error = ref<string | null>(null)
const settingsSaving = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.visibility, (v) => {
  if (v)
    selectedVisibility.value = v
})

watch(open, (isOpen) => {
  if (!isOpen && state.value !== 'saving' && state.value !== 'saved')
    dismiss()
})

let savedTimer: ReturnType<typeof setTimeout> | null = null
onUnmounted(() => {
  if (savedTimer !== null)
    clearTimeout(savedTimer)
})

function handleClick() {
  if (!auth.user) {
    state.value = 'auth-prompt'
    open.value = true
    return
  }
  if (!props.savedId) {
    state.value = 'name-prompt'
    open.value = true
    nextTick(() => nameInputRef.value?.focus())
    return
  }
  if (props.isOwner) {
    state.value = 'settings'
    open.value = true
  }
}

async function create() {
  state.value = 'saving'
  error.value = null
  try {
    await props.onCreate({ name: name.value.trim() || props.defaultName, visibility: selectedVisibility.value })
    open.value = false
    state.value = 'idle'
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
    state.value = 'name-prompt'
    nextTick(() => nameInputRef.value?.focus())
  }
}

async function save() {
  error.value = null
  settingsSaving.value = true
  try {
    await props.onUpdate({ visibility: selectedVisibility.value })
    state.value = 'saved'
    open.value = false
    savedTimer = setTimeout(() => {
      state.value = 'idle'
    }, 1600)
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
  }
  finally {
    settingsSaving.value = false
  }
}

function dismiss() {
  error.value = null
  state.value = 'idle'
  open.value = false
}
</script>

<template>
  <div class="save-wrap">
    <UiPopover v-model:open="open" :min-width="240">
      <template #trigger>
        <span class="save-trigger-wrap">
          <button
            v-if="state !== 'saved'"
            class="save-btn"
            :class="{ 'save-btn--active': savedId && isOwner }"
            type="button"
            :disabled="disabled || state === 'saving'"
            @click="handleClick"
          >
            {{ state === 'saving' ? 'Saving…' : (savedId && isOwner ? 'Save' : `Save ${noun}`) }}
          </button>
          <span v-else class="save-confirm">Saved ✓</span>
        </span>
      </template>

      <!-- Auth prompt -->
      <template v-if="state === 'auth-prompt'">
        <p class="popover-text">
          Sign in to save your {{ noun }}
        </p>
        <div class="popover-actions">
          <button class="popover-signin" type="button" @click="auth.login()">
            Sign in with Discord
          </button>
          <button class="popover-cancel" type="button" @click="dismiss">
            Cancel
          </button>
        </div>
      </template>

      <!-- Name prompt (new entity) -->
      <template v-else-if="state === 'name-prompt'">
        <div class="popover-head">
          <label class="popover-label" :for="`${noun}-name-input`">{{ noun }} name</label>
          <button class="popover-close" type="button" aria-label="Cancel" @click="dismiss">
            ✕
          </button>
        </div>
        <input
          :id="`${noun}-name-input`"
          ref="nameInputRef"
          v-model="name"
          class="popover-input"
          type="text"
          maxlength="100"
          :placeholder="defaultName"
          @keydown.enter="create"
          @keydown.escape="dismiss"
          @input="error = null"
        >
        <div class="vis-row" role="group" aria-label="Visibility">
          <button
            v-for="opt in visibilityOptions"
            :key="opt.value"
            class="vis-btn"
            :class="{ 'vis-btn--on': selectedVisibility === opt.value }"
            type="button"
            @click="selectedVisibility = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <p v-if="error" class="popover-error">
          {{ error }}
        </p>
        <button
          class="popover-confirm"
          type="button"
          :disabled="!name.trim()"
          @click="create"
        >
          Save
        </button>
      </template>

      <!-- Settings (owner update) -->
      <template v-else-if="state === 'settings'">
        <div class="popover-head">
          <span class="popover-label">Visibility</span>
          <button class="popover-close" type="button" aria-label="Close" :disabled="settingsSaving" @click="dismiss">
            ✕
          </button>
        </div>
        <div class="vis-row" role="group" aria-label="Visibility">
          <button
            v-for="opt in visibilityOptions"
            :key="opt.value"
            class="vis-btn"
            :class="{ 'vis-btn--on': selectedVisibility === opt.value }"
            type="button"
            :disabled="settingsSaving"
            @click="selectedVisibility = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <p v-if="error" class="popover-error">
          {{ error }}
        </p>
        <button
          class="popover-confirm"
          type="button"
          :disabled="settingsSaving"
          @click="save"
        >
          {{ settingsSaving ? 'Saving…' : 'Save' }}
        </button>
      </template>
    </UiPopover>
  </div>
</template>

<style scoped>
.save-wrap {
  position: relative;
  flex-shrink: 0;
}

.save-trigger-wrap {
  display: inline-flex;
}

.save-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.save-btn--active {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 40%, transparent);
}
.save-btn:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.save-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.save-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.save-confirm {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(70% 0.14 145);
  padding: 6px 14px;
}
</style>

<!-- Unscoped: lives inside UiPopover's portaled content. -->
<style>
.ui-popover .popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ui-popover .popover-text {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}
.ui-popover .popover-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.ui-popover .popover-close {
  font-size: 12px;
  color: var(--color-faint);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.12s ease-out;
}
.ui-popover .popover-close:hover:not(:disabled) {
  color: var(--color-muted);
}
.ui-popover .popover-close:disabled {
  opacity: 0.35;
  cursor: default;
}
.ui-popover .popover-input {
  flex: 1;
  min-width: 0;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s ease-out;
}
.ui-popover .popover-input:focus {
  border-color: color-mix(in oklch, var(--color-accent) 55%, transparent);
}
.ui-popover .vis-row {
  display: flex;
  gap: 4px;
}
.ui-popover .vis-btn {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 5px 4px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background-color 0.12s ease-out;
}
.ui-popover .vis-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.ui-popover .vis-btn--on {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 50%, transparent);
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
}
.ui-popover .vis-btn--on:hover:not(:disabled) {
  border-color: var(--color-accent);
}
.ui-popover .vis-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.ui-popover .popover-confirm {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: transparent;
  border: 1px solid color-mix(in oklch, var(--color-accent) 40%, transparent);
  border-radius: 5px;
  padding: 7px 12px;
  cursor: pointer;
  white-space: nowrap;
  width: 100%;
  transition: border-color 0.12s ease-out;
}
.ui-popover .popover-confirm:hover:not(:disabled) {
  border-color: var(--color-accent);
}
.ui-popover .popover-confirm:disabled {
  opacity: 0.35;
  cursor: default;
}
.ui-popover .popover-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ui-popover .popover-signin {
  font-size: 12px;
  font-weight: 500;
  color: oklch(95% 0.02 270);
  background: oklch(58% 0.2 270);
  border: none;
  border-radius: 5px;
  padding: 6px 12px;
  cursor: pointer;
  transition: opacity 0.12s ease-out;
}
.ui-popover .popover-signin:hover {
  opacity: 0.88;
}
.ui-popover .popover-cancel {
  font-size: 12px;
  color: var(--color-faint);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.12s ease-out;
}
.ui-popover .popover-cancel:hover {
  color: var(--color-muted);
}
.ui-popover .popover-error {
  font-size: 11px;
  color: oklch(62% 0.15 20);
  margin: 0;
}
</style>
