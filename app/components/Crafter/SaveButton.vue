<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { useApi } from '~/composables/useApi'
import { resolveLatestVersion, useCdnClient } from '~/composables/useBuildData'
import { useAuthStore } from '~/stores/auth'
import { useCraftStore } from '~/stores/craft'

const props = defineProps<{
  savedId?: string
  isOwner?: boolean
  visibility?: 'public' | 'unlisted' | 'private'
}>()

const visibilityOptions = [
  { value: 'public' as const, label: 'Public' },
  { value: 'unlisted' as const, label: 'Unlisted' },
  { value: 'private' as const, label: 'Private' },
]

const auth = useAuthStore()
const store = useCraftStore()
const api = useApi()
const router = useRouter()
const client = useCdnClient()

type State = 'idle' | 'auth-prompt' | 'name-prompt' | 'settings' | 'saving' | 'saved'
const state = ref<State>('idle')
const itemName = ref('My Item')
const selectedVisibility = ref<'public' | 'unlisted' | 'private'>(props.visibility ?? 'public')
const error = ref<string | null>(null)
const settingsSaving = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.visibility, (v) => {
  if (v)
    selectedVisibility.value = v
})

const saveWrapRef = ref<HTMLElement | null>(null)
onClickOutside(saveWrapRef, () => {
  if (['auth-prompt', 'name-prompt', 'settings'].includes(state.value))
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
    return
  }
  if (!props.savedId) {
    state.value = 'name-prompt'
    nextTick(() => nameInputRef.value?.focus())
    return
  }
  if (props.isOwner)
    state.value = 'settings'
}

async function create() {
  if (!store.shareHash)
    return
  state.value = 'saving'
  error.value = null
  try {
    const { gameVersion } = await resolveLatestVersion(client)
    const res = await api.createItem({
      name: itemName.value.trim() || 'My Item',
      itemData: { craftHash: store.shareHash },
      gameVersion,
      visibility: selectedVisibility.value,
    })
    await router.push(`/c/${res.id}`)
    state.value = 'idle'
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
    state.value = 'name-prompt'
    nextTick(() => nameInputRef.value?.focus())
  }
}

async function save() {
  if (!store.shareHash || !props.savedId)
    return
  error.value = null
  settingsSaving.value = true
  try {
    await api.updateItem(props.savedId, {
      itemData: { craftHash: store.shareHash },
      visibility: selectedVisibility.value,
    })
    state.value = 'saved'
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
}
</script>

<template>
  <div ref="saveWrapRef" class="save-wrap">
    <!-- Idle / Saving: main button -->
    <button
      v-if="state === 'idle' || state === 'saving'"
      class="save-btn"
      :class="{ 'save-btn--active': savedId && isOwner }"
      type="button"
      :disabled="!store.shareHash || store.loading || state === 'saving'"
      @click="handleClick"
    >
      {{ state === 'saving' ? 'Saving…' : (savedId && isOwner ? 'Save' : 'Save item') }}
    </button>

    <!-- Saved feedback -->
    <span v-else-if="state === 'saved'" class="save-confirm">Saved ✓</span>

    <!-- Auth prompt popover -->
    <div v-else-if="state === 'auth-prompt'" class="popover">
      <p class="popover-text">
        Sign in to save your item
      </p>
      <div class="popover-actions">
        <button class="popover-signin" type="button" @click="auth.login()">
          Sign in with Discord
        </button>
        <button class="popover-cancel" type="button" @click="dismiss">
          Cancel
        </button>
      </div>
    </div>

    <!-- Name prompt (new item) -->
    <div v-else-if="state === 'name-prompt'" class="popover">
      <div class="popover-head">
        <label class="popover-label" for="item-name-input">Item name</label>
        <button class="popover-close" type="button" aria-label="Cancel" @click="dismiss">
          ✕
        </button>
      </div>
      <input
        id="item-name-input"
        ref="nameInputRef"
        v-model="itemName"
        class="popover-input"
        type="text"
        maxlength="100"
        placeholder="My Item"
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
        :disabled="!itemName.trim()"
        @click="create"
      >
        Save
      </button>
    </div>

    <!-- Settings popover (owner update) -->
    <div v-else-if="state === 'settings'" class="popover">
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
    </div>
  </div>
</template>

<style scoped>
.save-wrap {
  position: relative;
  flex-shrink: 0;
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
}

.popover {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  min-width: 240px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.popover-text {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.popover-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.popover-close {
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

.popover-close:hover:not(:disabled) {
  color: var(--color-muted);
}

.popover-close:disabled {
  opacity: 0.35;
  cursor: default;
}

.popover-input {
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

.popover-input:focus {
  border-color: color-mix(in oklch, var(--color-accent) 55%, transparent);
}

.vis-row {
  display: flex;
  gap: 4px;
}

.vis-btn {
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

.vis-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-faint);
}

.vis-btn--on {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 50%, transparent);
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
}

.vis-btn--on:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.vis-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.popover-confirm {
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

.popover-confirm:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.popover-confirm:disabled {
  opacity: 0.35;
  cursor: default;
}

.popover-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.popover-signin {
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

.popover-signin:hover {
  opacity: 0.88;
}

.popover-cancel {
  font-size: 12px;
  color: var(--color-faint);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.12s ease-out;
}

.popover-cancel:hover {
  color: var(--color-muted);
}

.popover-error {
  font-size: 11px;
  color: oklch(62% 0.15 20);
  margin: 0;
}
</style>
