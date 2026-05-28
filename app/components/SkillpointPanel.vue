<script setup lang="ts">
import { computed } from 'vue'
import { levelToSkillPoints, SKILLPOINT_FINAL_MULT, skillPointsToPercentage } from '~/lib/math/skillpoints'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const ATTRS = [
  { key: 'str', label: 'Str', full: 'Strength', color: 'oklch(72% 0.18 145)', effect: '% dmg' },
  { key: 'dex', label: 'Dex', full: 'Dexterity', color: 'oklch(82% 0.15 95)', effect: '% crit' },
  { key: 'int', label: 'Int', full: 'Intelligence', color: 'oklch(75% 0.13 215)', effect: '% cost red.' },
  { key: 'def', label: 'Def', full: 'Defence', color: 'oklch(68% 0.18 35)', effect: '% resist' },
  { key: 'agi', label: 'Agi', full: 'Agility', color: 'oklch(85% 0.04 250)', effect: '% dodge' },
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
  <section class="skillpoint-bar">
    <div class="meta">
      <div class="meta-cell">
        <span class="kicker">Level</span>
        <input
          id="level"
          type="number"
          class="meta-input"
          :value="store.rawBuild?.level"
          @input="onLevel($event)"
        >
      </div>
      <div class="meta-cell meta-cell--remaining">
        <span class="kicker">Remaining</span>
        <span
          class="meta-value mono"
          :class="{ 'meta-value--negative': remaining < 0 }"
        >{{ remaining }}</span>
        <span class="meta-sub mono">of {{ available }}</span>
      </div>
    </div>

    <ul class="attrs">
      <li
        v-for="(a, i) in ATTRS"
        :key="a.key"
        class="attr"
        :style="{ '--attr-color': a.color }"
      >
        <span class="attr-label">{{ a.full }}</span>
        <div class="attr-row">
          <input
            :id="`skp-${i}`"
            type="number"
            class="attr-input"
            :value="store.skillpoints[i]"
            :aria-label="a.full"
            @input="onSkp(i, $event)"
          >
          <span class="attr-meta mono">
            <span class="attr-assigned" :title="`${assigned[i]} assigned`">{{ assigned[i] }}</span>
            <span class="attr-effect">{{ skillEffect[i] }} {{ a.effect }}</span>
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.skillpoint-bar {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  align-items: stretch;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.meta {
  display: flex;
  gap: 14px;
  align-items: stretch;
  padding-right: 16px;
  border-right: 1px solid var(--color-border);
}

.meta-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 64px;
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.meta-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 8px;
  width: 64px;
  text-align: right;
  outline: none;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.meta-input:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}

.meta-value {
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
  color: var(--color-text);
}
.meta-value--negative {
  color: oklch(62% 0.16 22);
}
.meta-sub {
  font-size: 10px;
  color: var(--color-faint);
  letter-spacing: 0.06em;
}

.attrs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.attr {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: oklch(14% 0.006 30 / 0.4);
  transition:
    border-color 0.12s,
    background 0.12s;
}
.attr:focus-within {
  border-color: var(--attr-color);
  background: oklch(19% 0.008 30);
}

.attr-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--attr-color);
}

.attr-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.attr-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  padding: 2px 0;
  width: 42px;
  text-align: right;
  outline: none;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.attr-input:focus {
  color: var(--attr-color);
  border-bottom-color: var(--attr-color);
}

.attr-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.attr-assigned {
  font-size: 11px;
  color: var(--color-muted);
  letter-spacing: 0.02em;
}

.attr-effect {
  font-size: 10px;
  color: var(--color-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

/* Hide number spinners */
.attr-input::-webkit-outer-spin-button,
.attr-input::-webkit-inner-spin-button,
.meta-input::-webkit-outer-spin-button,
.meta-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}
.attr-input[type='number'],
.meta-input[type='number'] {
  appearance: textfield;
}

@media (max-width: 720px) {
  .skillpoint-bar {
    grid-template-columns: 1fr;
  }
  .meta {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    padding-right: 0;
    padding-bottom: 12px;
  }
  .attrs {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
