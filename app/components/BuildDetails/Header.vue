<script setup lang="ts">
import type { ApiBuild } from '~/composables/useApi'
import { computed } from 'vue'
import Byline from './Byline.vue'
import CreditsPicker from './CreditsPicker.vue'
import NotesEditor from './NotesEditor.vue'
import NotesView from './NotesView.vue'
import TagChips from './TagChips.vue'
import TagPicker from './TagPicker.vue'
import TutorialPicker from './TutorialPicker.vue'

const props = defineProps<{
  build: ApiBuild
  viewerId: string | null
  isOwner: boolean
}>()

defineEmits<{
  fork: []
  removeMeCredit: []
  updateTags: [tags: string[]]
  updateCredits: [credits: { id: string, username: string, displayName: string, avatar: string | null }[]]
  updateNotes: [notes: string | null]
  updateTutorial: [url: string | null]
}>()

const hasTags = computed(() => !!props.build.tags && props.build.tags.length > 0)
const hasTutorial = computed(() => !!props.build.tutorialUrl)
const hasNotes = computed(() => !!props.build.notes && props.build.notes.trim().length > 0)

const visibilityLabel = computed(() => {
  const v = props.build.visibility
  return v === 'public' ? 'Public' : v === 'unlisted' ? 'Unlisted' : 'Private'
})
</script>

<template>
  <header class="build-header">
    <div class="header-inner">
      <div class="header-row header-row-1">
        <h1 class="header-name">
          {{ build.name }}
        </h1>
        <div class="header-actions">
          <span class="visibility-chip" :data-visibility="build.visibility">{{ visibilityLabel }}</span>
          <button v-if="!isOwner" type="button" class="fork-btn" @click="$emit('fork')">
            Fork <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div class="header-row header-row-2">
        <span class="byline-wrap">
          <Byline
            :owner="build.owner"
            :credits="build.credits ?? []"
            :viewer-id="viewerId"
            @remove-me="$emit('removeMeCredit')"
          />
          <CreditsPicker
            v-if="isOwner && build.owner"
            :credits="build.credits ?? []"
            :owner-id="build.owner.id"
            @change="(c) => $emit('updateCredits', c)"
          />
        </span>
        <div class="header-row-2-right">
          <TagPicker
            v-if="isOwner"
            :tags="build.tags ?? []"
            @change="(t: string[]) => $emit('updateTags', t)"
          />
          <TagChips v-else-if="hasTags" :tags="build.tags" :max="6" />
          <TutorialPicker
            v-if="isOwner"
            :tutorial-url="build.tutorialUrl"
            @save="(u: string | null) => $emit('updateTutorial', u)"
          />
          <a
            v-else-if="hasTutorial"
            class="tutorial-link"
            :href="build.tutorialUrl ?? '#'"
            target="_blank"
            rel="noopener"
          >↗ Watch tutorial</a>
        </div>
      </div>

      <div v-if="isOwner" class="header-row header-row-3">
        <NotesEditor :notes="build.notes" @save="(n: string | null) => $emit('updateNotes', n)" />
      </div>
      <div v-else-if="hasNotes" class="header-row header-row-3">
        <NotesView :markdown="build.notes" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.build-header {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  border-bottom: 1px solid var(--color-border);
  padding: 14px max(40px, calc(50vw - var(--shell-max) / 2 + 40px));
  display: flex;
  justify-content: center;
}
.header-inner {
  width: 100%;
  max-width: var(--shell-max);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.header-row-1 {
  justify-content: space-between;
}
.header-name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.visibility-chip {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  color: var(--color-faint);
}
.visibility-chip[data-visibility='public'] {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 40%, var(--color-border));
}
.fork-btn {
  background: transparent;
  border: none;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 4px 8px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.fork-btn:hover {
  color: var(--color-accent);
}
.header-row-2 {
  justify-content: space-between;
  align-items: flex-start;
}
.byline-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.header-row-2-right {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.tutorial-link {
  font-size: 12px;
  color: var(--color-accent);
  text-decoration: none;
  font-family: var(--font-mono);
}
.tutorial-link:hover {
  text-decoration: underline;
}
.header-row-3 {
  display: block;
}

@media (max-width: 720px) {
  .build-header {
    padding-inline: var(--shell-pad-mobile, 14px);
  }
  .header-row-2 {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
