<script setup lang="ts">
import { computed } from 'vue'
import { levelToSkillPoints, SKILLPOINT_FINAL_MULT, skillPointsToPercentage } from '~/lib/math/skillpoints'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const ATTRS = [
  { key: 'str', label: 'Str', full: 'Strength', color: 'oklch(72% 0.18 145)', effect: 'dmg' },
  { key: 'dex', label: 'Dex', full: 'Dexterity', color: 'oklch(82% 0.15 95)', effect: 'crit' },
  { key: 'int', label: 'Int', full: 'Intelligence', color: 'oklch(75% 0.13 215)', effect: 'cost' },
  { key: 'def', label: 'Def', full: 'Defence', color: 'oklch(68% 0.18 35)', effect: 'res' },
  { key: 'agi', label: 'Agi', full: 'Agility', color: 'oklch(85% 0.04 250)', effect: 'dodge' },
] as const

const assigned = computed<number[]>(() => {
  const r = store.result
  if (!r)
    return [0, 0, 0, 0, 0]
  return store.skillpoints.map((sp, i) =>
    sp - r.skillpoints.finalSkillpoints[i]! + r.skillpoints.baseSkillpoints[i]!,
  )
})

const totalAssigned = computed(() => assigned.value.reduce((a, b) => a + b, 0))
const available = computed(() => levelToSkillPoints(store.rawBuild?.level ?? 1))
const remaining = computed(() => available.value - totalAssigned.value)

const skillEffect = computed(() =>
  store.skillpoints.map((sp, i) =>
    (skillPointsToPercentage(sp) * 100 * SKILLPOINT_FINAL_MULT[i]!).toFixed(1),
  ),
)

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
  <section class="sp">
    <div class="sp-head">
      <div class="sp-level-field">
        <label class="sp-kicker" for="level">Level</label>
        <input
          id="level"
          type="number"
          class="sp-level-input"
          :value="store.rawBuild?.level"
          @input="onLevel($event)"
        >
      </div>
      <div class="sp-remaining-info">
        <span
          class="sp-remaining"
          :class="{ 'sp-remaining--over': remaining < 0 }"
        >{{ remaining }}</span>
        <span class="sp-remaining-label">/ {{ available }} SP</span>
      </div>
    </div>

    <ul class="sp-attrs">
      <li
        v-for="(a, i) in ATTRS"
        :key="a.key"
        class="sp-attr"
        :style="{ '--attr-color': a.color }"
      >
        <span class="sp-attr-label">{{ a.label }}</span>
        <input
          :id="`skp-${i}`"
          type="number"
          class="sp-attr-input"
          :value="store.skillpoints[i]"
          :aria-label="a.full"
          @input="onSkp(i, $event)"
        >
        <span class="sp-attr-eff">{{ skillEffect[i] }}%</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.sp {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sp-level-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sp-kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  cursor: default;
}

.sp-level-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 3px 7px;
  width: 54px;
  text-align: right;
  outline: none;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.sp-level-input:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}

.sp-remaining-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.sp-remaining {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.sp-remaining--over {
  color: oklch(62% 0.16 22);
}
.sp-remaining-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  color: var(--color-faint);
  letter-spacing: 0.04em;
}

.sp-attrs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}

.sp-attr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 6px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: oklch(14% 0.006 30 / 0.4);
  transition:
    border-color 0.12s,
    background 0.12s;
}
.sp-attr:focus-within {
  border-color: var(--attr-color);
  background: var(--color-surface);
}

.sp-attr-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--attr-color);
}

.sp-attr-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: none;
  padding: 0;
  width: 100%;
  text-align: center;
  outline: none;
  transition: color 0.12s;
}
.sp-attr:focus-within .sp-attr-input {
  color: var(--attr-color);
}

.sp-attr-eff {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  color: var(--color-faint);
  text-align: center;
  white-space: nowrap;
}

/* Hide number spinners */
.sp-attr-input::-webkit-outer-spin-button,
.sp-attr-input::-webkit-inner-spin-button,
.sp-level-input::-webkit-outer-spin-button,
.sp-level-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}
.sp-attr-input[type='number'],
.sp-level-input[type='number'] {
  appearance: textfield;
}

@media (max-width: 720px) {
  .sp {
    padding: 8px 10px;
    gap: 6px;
  }
  .sp-attrs {
    gap: 4px;
  }
  .sp-attr {
    padding: 4px 4px;
  }
  .sp-attr-input {
    font-size: 13px;
  }
}

@media (max-width: 380px) {
  .sp-attrs {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
