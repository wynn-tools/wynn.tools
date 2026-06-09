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
      <UiButton variant="accent" size="md" :disabled="store.loading" @click="upgrade">
        Update to {{ store.latestGameVersion }}
      </UiButton>
      <UiButton size="md" @click="keep">
        Keep viewing
      </UiButton>
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
</style>
