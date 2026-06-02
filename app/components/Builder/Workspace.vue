<script setup lang="ts">
import { useBuildStore } from '~/stores/build'

const props = withDefaults(defineProps<{
  savedId?: string
  isOwner?: boolean
  visibility?: 'public' | 'unlisted' | 'private'
  /** Rendered inside the items-page drawer: collapse the ability tree by
   *  default and drop the external "Browse builds" link. */
  embedded?: boolean
}>(), {
  savedId: undefined,
  isOwner: false,
  visibility: undefined,
  embedded: false,
})

const store = useBuildStore()
const showAtree = ref(!props.embedded)
const importOpen = ref(false)

const atreeConfirming = ref(false)
let atreeConfirmTimer: ReturnType<typeof setTimeout> | null = null
const cancelBtnRef = ref<HTMLButtonElement | null>(null)

const atreeAp = computed(() => store.atreeValidation?.apTotal ?? 0)
const canResetAtree = computed(() => (store.rawBuild?.activeAtree.length ?? 0) > 0)

function clearAtreeConfirmTimer() {
  if (atreeConfirmTimer) {
    clearTimeout(atreeConfirmTimer)
    atreeConfirmTimer = null
  }
}

function armAtreeReset() {
  if (!canResetAtree.value)
    return
  atreeConfirming.value = true
  clearAtreeConfirmTimer()
  atreeConfirmTimer = setTimeout(() => {
    atreeConfirming.value = false
    atreeConfirmTimer = null
  }, 4000)
  nextTick(() => cancelBtnRef.value?.focus())
}

function confirmAtreeReset() {
  store.resetAtree()
  atreeConfirming.value = false
  clearAtreeConfirmTimer()
}

function cancelAtreeReset() {
  atreeConfirming.value = false
  clearAtreeConfirmTimer()
}

function onAtreeConfirmKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelAtreeReset()
  }
}

onBeforeUnmount(clearAtreeConfirmTimer)
</script>

<template>
  <main class="builder" :class="{ 'builder--embedded': props.embedded }">
    <div class="builder-toolbar">
      <BuilderImportBar />
      <button class="toolbar-import" type="button" @click="importOpen = true">
        Import items <span class="toolbar-import-arrow" aria-hidden="true">→</span>
      </button>
      <NuxtLink v-if="!props.embedded" to="/builds" class="toolbar-browse">
        Browse builds <span class="toolbar-browse-arrow" aria-hidden="true">→</span>
      </NuxtLink>
      <BuilderSaveButton :saved-id="props.savedId" :is-owner="props.isOwner" :visibility="props.visibility" />
    </div>
    <p v-if="store.loading" class="state-text">
      Loading build…
    </p>
    <p v-else-if="store.error" class="state-text state-text--error">
      Failed to load build: {{ store.error }}
    </p>
    <template v-else-if="store.rawBuild">
      <BuilderOldVersionModal />
      <BuilderOldVersionBanner v-if="store.isOldVersion" />

      <!-- 3-zone shell: Inputs / Stats / Combat Output -->
      <div class="zones">
        <section class="zone zone-inputs" aria-label="Equipment and skillpoints">
          <!-- Level + SP lives at the top of the inputs column — gates everything below -->
          <SkillpointPanel />
          <EquipmentGrid />
          <TomePanel />
          <BoostPanel />
          <PowderSpecialPanel />
          <AtreeAspectsPanel />
        </section>

        <section class="zone zone-stats" aria-label="Stats">
          <StatPanel v-if="store.result" :result="store.result" />
          <BuildSummary />
        </section>

        <section class="zone zone-output" aria-label="Combat output">
          <DpsOutput v-if="store.result" :result="store.result" />
        </section>
      </div>

      <!-- Ability tree -->
      <section class="atree" aria-label="Ability tree">
        <header class="atree-head">
          <span class="kicker">Ability Tree</span>
          <div class="atree-actions" @keydown="onAtreeConfirmKey">
            <template v-if="!atreeConfirming">
              <button
                class="toggle toggle--danger"
                type="button"
                :disabled="!canResetAtree"
                aria-label="Reset ability tree"
                title="Clear all ability tree selections"
                @click="armAtreeReset"
              >
                Reset
              </button>
            </template>
            <template v-else>
              <span class="atree-confirm-label" aria-live="polite">
                Reset {{ atreeAp }} AP?
              </span>
              <button
                class="toggle toggle--danger"
                type="button"
                aria-label="Confirm reset, clears all ability tree selections"
                @click="confirmAtreeReset"
              >
                Confirm
              </button>
              <button
                ref="cancelBtnRef"
                class="toggle"
                type="button"
                aria-label="Cancel reset"
                @click="cancelAtreeReset"
              >
                Cancel
              </button>
            </template>
            <button class="toggle" type="button" @click="showAtree = !showAtree">
              {{ showAtree ? 'Hide' : 'Show' }}
            </button>
          </div>
        </header>
        <div v-if="showAtree" class="atree-split">
          <div class="atree-canvas-wrap">
            <AtreeCanvas />
          </div>
          <AtreeActivePanel />
        </div>
      </section>
    </template>

    <BuilderImportModal :open="importOpen" @update:open="importOpen = $event" />
  </main>
</template>

<style scoped>
.builder {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px clamp(12px, 2.5vw, 36px) 56px;
  max-width: var(--shell-max);
  width: 100%;
  margin: 0 auto;
}

/* Inside the items-page drawer the workspace fills its column: no shell gutter,
   no centering, tighter top padding since the drawer header sits above it. */
.builder--embedded {
  padding: 0;
  max-width: none;
  margin: 0;
}

@media (max-width: 720px) {
  .builder {
    gap: 12px;
    padding: 14px 10px 40px;
  }
}

/* Phones: break out of the page shell's gutter so the workspace runs edge to
   edge and the panels get the full width. The 10px side padding above keeps
   content off the screen edge. Width/margin negate the shell's gutter token. */
@media (max-width: 600px) {
  .builder {
    width: calc(100% + 2 * var(--shell-pad-mobile));
    max-width: none;
    margin-inline: calc(-1 * var(--shell-pad-mobile));
  }
}

.builder-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
}

@media (max-width: 720px) {
  .builder-toolbar {
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
  }
  .builder-toolbar > :first-child {
    flex: 1 1 100%;
  }
  .builder-toolbar > :last-child {
    margin-left: auto;
  }
}

.toolbar-import {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: transparent;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  white-space: nowrap;
  align-self: center;
  transition: color 0.12s ease-out;
}

.toolbar-import:hover {
  color: var(--color-muted);
}

.toolbar-import:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 3px;
}

.toolbar-import-arrow {
  display: inline-block;
  transition: transform 0.12s ease-out;
}

.toolbar-import:hover .toolbar-import-arrow {
  transform: translateX(3px);
}

.toolbar-browse {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--color-faint);
  text-decoration: none;
  white-space: nowrap;
  align-self: center;
  transition: color 0.12s ease-out;
}

.toolbar-browse:hover {
  color: var(--color-muted);
}

.toolbar-browse-arrow {
  display: inline-block;
  transition: transform 0.15s ease-out;
}

.toolbar-browse:hover .toolbar-browse-arrow {
  transform: translateX(3px);
}

.toolbar-browse:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 3px;
}

.state-text {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}

.state-text--error {
  color: oklch(62% 0.15 20);
}

.zones {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(260px, 1.1fr) minmax(230px, 0.9fr) minmax(240px, 0.9fr);
  align-items: start;
}

.zone {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.atree {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.atree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.atree-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.atree-confirm-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(72% 0.13 22);
  padding-right: 2px;
}

.toggle {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 3px 10px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.toggle:hover {
  color: var(--color-copper);
  border-color: var(--color-copper);
}
.toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.toggle:disabled:hover {
  color: var(--color-muted);
  border-color: var(--color-border);
}
.toggle--danger:not(:disabled):hover,
.toggle--danger:not(:disabled):focus-visible {
  color: oklch(72% 0.15 22);
  border-color: oklch(58% 0.14 22);
  outline: none;
}

.atree-split {
  display: grid;
  grid-template-columns: auto minmax(250px, 360px);
  justify-content: center;
  gap: 16px;
  align-items: start;
}

.atree-canvas-wrap {
  min-width: 0;
}

@media (max-width: 1100px) {
  .atree-split {
    grid-template-columns: 1fr;
  }
  .atree-canvas-wrap {
    display: flex;
    justify-content: center;
  }
}

@media (max-width: 720px) {
  .atree-canvas-wrap {
    justify-content: stretch;
    width: 100%;
  }
  .atree-canvas-wrap > * {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 1100px) {
  .zones {
    grid-template-columns: 1fr 1fr;
  }
  .zone-inputs {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .zones {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .zone-inputs {
    grid-column: auto;
  }
  .zone {
    gap: 8px;
  }
  .atree {
    margin-top: 4px;
    gap: 8px;
  }
  .atree-split {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
