<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCdnClient } from '~/composables/useBuildData'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const client = useCdnClient()

const dismissed = ref(false)
const visible = computed(() => store.isOldVersion && !dismissed.value)

function setOpen(v: boolean) {
  if (!v)
    dismissed.value = true
}

function keep() {
  dismissed.value = true
}

async function upgrade() {
  await store.upgradeBuild(client)
  // isOldVersion becomes false after upgrade — modal disappears reactively
}
</script>

<template>
  <UiDialog
    :open="visible"
    title="Older Wynncraft version"
    :max-width="480"
    @update:open="setOpen"
  >
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

    <template #footer>
      <button
        class="action-btn action-btn--primary"
        type="button"
        :disabled="store.loading"
        @click="upgrade"
      >
        Update to {{ store.latestGameVersion }}
      </button>
      <button
        class="action-btn"
        type="button"
        @click="keep"
      >
        Keep viewing
      </button>
    </template>
  </UiDialog>
</template>

<!-- Unscoped: lives inside UiDialog's portaled content. -->
<style>
.ui-dialog .modal-body {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.55;
  margin: 0;
}
.ui-dialog .modal-body strong {
  color: var(--color-text);
  font-weight: 600;
}
.ui-dialog .action-btn {
  font-family: var(--font-mono);
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
.ui-dialog .action-btn:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.ui-dialog .action-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.ui-dialog .action-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.ui-dialog .action-btn--primary {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 40%, transparent);
}
.ui-dialog .action-btn--primary:not(:disabled):hover {
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
  border-color: var(--color-accent);
}
</style>
