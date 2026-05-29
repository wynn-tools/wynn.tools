<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { useApi } from '~/composables/useApi'
import { useCdnClient } from '~/composables/useBuildData'
import { resolveVersionSegment } from '~/lib/data/cdn-adapter/version-paths'
import { useAuthStore } from '~/stores/auth'
import { useCraftStore } from '~/stores/craft'

const props = defineProps<{
  savedId?: string
  isOwner?: boolean
}>()

const auth = useAuthStore()
const store = useCraftStore()
const api = useApi()
const router = useRouter()

type State = 'idle' | 'auth-prompt' | 'name-prompt' | 'saving' | 'saved'
const state = ref<State>('idle')
const itemName = ref('My Item')
const error = ref<string | null>(null)

const saveWrapRef = ref<HTMLElement | null>(null)
onClickOutside(saveWrapRef, () => {
  if (state.value === 'auth-prompt' || state.value === 'name-prompt')
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
    return
  }
  if (props.isOwner)
    save()
}

async function create() {
  if (!store.shareHash)
    return
  state.value = 'saving'
  error.value = null
  try {
    const client = useCdnClient()
    const gameVersion = await resolveVersionSegment(client, store.versionId)
    const res = await api.createItem({
      name: itemName.value.trim() || 'My Item',
      itemData: { craftHash: store.shareHash },
      gameVersion,
    })
    await router.push(`/c/${res.id}`)
    state.value = 'idle'
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
    state.value = 'name-prompt'
  }
}

async function save() {
  if (!store.shareHash || !props.savedId)
    return
  state.value = 'saving'
  error.value = null
  try {
    await api.updateItem(props.savedId, { itemData: { craftHash: store.shareHash } })
    state.value = 'saved'
    savedTimer = setTimeout(() => {
      state.value = 'idle'
    }, 1600)
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
    state.value = 'idle'
  }
}

function dismiss() {
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

    <!-- Name prompt -->
    <div v-else-if="state === 'name-prompt'" class="popover">
      <label class="popover-label" for="item-name-input">Item name</label>
      <div class="popover-row">
        <input
          id="item-name-input"
          v-model="itemName"
          class="popover-input"
          type="text"
          maxlength="100"
          placeholder="My Item"
          @keydown.enter="create"
          @keydown.escape="dismiss"
        >
        <button class="popover-save" type="button" :disabled="state === 'saving'" @click="create">
          Save
        </button>
        <button class="popover-cancel" type="button" @click="dismiss">
          ✕
        </button>
      </div>
      <p v-if="error" class="popover-error">
        {{ error }}
      </p>
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
  border-color: oklch(65% 0.15 48 / 0.4);
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

.popover-row {
  display: flex;
  gap: 6px;
  align-items: center;
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
  border-color: oklch(65% 0.15 48 / 0.55);
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

.popover-save {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: transparent;
  border: 1px solid oklch(65% 0.15 48 / 0.4);
  border-radius: 5px;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.12s ease-out;
}

.popover-save:hover {
  border-color: var(--color-accent);
}

.popover-save:disabled {
  opacity: 0.35;
  cursor: default;
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
