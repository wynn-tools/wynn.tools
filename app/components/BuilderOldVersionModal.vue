<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const client = useCdnClient()

const dismissed = ref(false)
const keepBtn = ref<HTMLButtonElement | null>(null)

const visible = computed(() => store.isOldVersion && !dismissed.value)

function keep() {
  dismissed.value = true
}

async function upgrade() {
  await store.upgradeBuild(client)
  // isOldVersion becomes false after upgrade — modal disappears reactively
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape')
    keep()
}

watch(visible, (v) => {
  if (v)
    nextTick(() => keepBtn.value?.focus())
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="backdrop"
      aria-hidden="true"
    />
    <div
      v-if="visible"
      class="modal-wrap"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-modal-title"
      @keydown="onKeydown"
    >
      <div class="modal">
        <h2 id="version-modal-title" class="modal-title">
          Older Wynncraft version
        </h2>
        <p class="modal-body">
          This build was created on Wynncraft
          <strong>{{ store.loadedGameVersion }}</strong>.
          You're viewing it with data from that version — stats and abilities
          may differ from the current game.
        </p>
        <p class="modal-body">
          The current version is <strong>{{ store.latestGameVersion }}</strong>.
          Updating re-encodes the build with current data.
          Items or abilities not present in the new version will be cleared.
        </p>
        <div class="modal-actions">
          <button
            class="action-btn action-btn--primary"
            type="button"
            :disabled="store.loading"
            @click="upgrade"
          >
            Update to {{ store.latestGameVersion }}
          </button>
          <button
            ref="keepBtn"
            class="action-btn"
            type="button"
            @click="keep"
          >
            Keep viewing
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: oklch(0% 0 0 / 0.65);
  z-index: 100;
}

.modal-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 101;
  padding: 24px;
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 28px 32px;
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 8px 40px oklch(0% 0 0 / 0.5);
}

.modal-title {
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.modal-body {
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.55;
  margin: 0;
}

.modal-body strong {
  color: var(--color-text);
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
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
  padding: 8px 16px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.action-btn:not(:disabled):hover {
  color: var(--color-copper);
  border-color: var(--color-copper);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.action-btn:focus-visible {
  outline: 2px solid var(--color-copper);
  outline-offset: 2px;
}

.action-btn--primary {
  color: var(--color-copper);
  border-color: oklch(78% 0.14 75 / 0.4);
}

.action-btn--primary:not(:disabled):hover {
  background: oklch(78% 0.14 75 / 0.06);
  border-color: var(--color-copper);
}
</style>
