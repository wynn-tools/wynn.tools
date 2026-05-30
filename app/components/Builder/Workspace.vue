<script setup lang="ts">
import { useBuildStore } from '~/stores/build'

const props = withDefaults(defineProps<{
  savedId?: string
  isOwner?: boolean
  visibility?: 'public' | 'unlisted' | 'private'
}>(), {
  savedId: undefined,
  isOwner: false,
  visibility: undefined,
})

const store = useBuildStore()
const showAtree = ref(true)
</script>

<template>
  <main class="builder">
    <div class="builder-toolbar">
      <BuilderImportBar />
      <NuxtLink to="/builds" class="toolbar-browse">
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
          <BuildSummary />
        </section>

        <section class="zone zone-stats" aria-label="Stats">
          <StatPanel v-if="store.result" :result="store.result" />
        </section>

        <section class="zone zone-output" aria-label="Combat output">
          <DpsOutput v-if="store.result" :result="store.result" />
        </section>
      </div>

      <!-- Ability tree -->
      <section class="atree" aria-label="Ability tree">
        <header class="atree-head">
          <span class="kicker">Ability Tree</span>
          <button class="toggle" type="button" @click="showAtree = !showAtree">
            {{ showAtree ? 'Hide' : 'Show' }}
          </button>
        </header>
        <div v-if="showAtree" class="atree-split">
          <div class="atree-canvas-wrap">
            <AtreeCanvas />
          </div>
          <AtreeActivePanel />
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.builder {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px clamp(12px, 2.5vw, 36px) 56px;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 720px) {
  .builder {
    gap: 12px;
    padding: 14px 10px 40px;
  }
}

.builder-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
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
  grid-template-columns: minmax(280px, 1.2fr) minmax(200px, 0.7fr) minmax(240px, 0.9fr);
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

.atree-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 14px;
  align-items: start;
}

.atree-canvas-wrap {
  min-width: 0;
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
