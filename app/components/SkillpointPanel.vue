<script setup lang="ts">
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const LABELS = ['Strength', 'Dexterity', 'Intelligence', 'Defence', 'Agility']

function onSkp(i: number, e: Event) {
  store.setSkillpoint(i, Number.parseInt((e.target as HTMLInputElement).value) || 0)
}

function onLevel(e: Event) {
  const v = Number.parseInt((e.target as HTMLInputElement).value)
  if (!Number.isNaN(v))
    store.setLevel(v)
}
</script>

<template>
  <div class="skillpoint-panel">
    <section class="panel-section">
      <h2 class="section-title">
        Skillpoints
      </h2>
      <div class="skp-list">
        <div v-for="(label, i) in LABELS" :key="label" class="skp-row">
          <label :for="`skp-${i}`" class="skp-label">{{ label }}</label>
          <input
            :id="`skp-${i}`"
            type="number"
            class="skp-input"
            :value="store.skillpoints[i]"
            @input="onSkp(i, $event)"
          >
        </div>
      </div>
    </section>

    <section class="panel-section">
      <h2 class="section-title">
        Build
      </h2>
      <div class="skp-row">
        <label for="level" class="skp-label">Level</label>
        <input
          id="level"
          type="number"
          class="skp-input"
          :value="store.rawBuild?.level"
          @input="onLevel($event)"
        >
      </div>
    </section>
  </div>
</template>

<style scoped>
.skillpoint-panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.panel-section {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 20px 24px;
}

.section-title {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: 16px;
}

.skp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.skp-label {
  font-size: 13px;
  color: var(--color-muted);
  white-space: nowrap;
  cursor: pointer;
}

.skp-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 3px 8px;
  width: 80px;
  text-align: right;
  outline: none;
  transition: border-color 0.15s;
}

.skp-input:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}

/* Remove number input spin buttons */
.skp-input::-webkit-outer-spin-button,
.skp-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.skp-input[type='number'] {
  appearance: textfield;
}
</style>
