<script setup lang="ts">
import { useBuildStore } from '~/stores/build'

const props = withDefaults(defineProps<{
  savedId?: string
  isOwner?: boolean
}>(), {
  savedId: undefined,
  isOwner: false,
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
      <BuilderSaveButton :saved-id="props.savedId" :is-owner="props.isOwner" />
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

      <!-- Header strip: skillpoints + level live at the top because they
           gate every other input below. -->
      <SkillpointPanel />

      <!-- 3-zone shell: Inputs / Stats / Combat Output -->
      <div class="zones">
        <section class="zone zone-inputs" aria-label="Equipment and tomes">
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

      <!-- Tree + active abilities pair -->
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
  gap: 20px;
  padding: 32px clamp(16px, 3vw, 40px) 64px;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 720px) {
  .builder {
    gap: 14px;
    padding: 16px 12px 48px;
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

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.zones {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(360px, 1.4fr) minmax(240px, 0.85fr) minmax(280px, 1fr);
  align-items: start;
}

.zone {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.zone-head {
  padding: 0 2px;
}

.atree {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
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
  gap: 16px;
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
    gap: 12px;
  }
  .zone-inputs {
    grid-column: auto;
  }
  .zone {
    gap: 10px;
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
