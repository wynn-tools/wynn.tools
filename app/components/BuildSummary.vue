<script setup lang="ts">
import { computed } from 'vue'
import { levelToSkillPoints, SKILLPOINT_FINAL_MULT, skillPointsToPercentage } from '~/lib/math/skillpoints'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const LABELS = ['Strength', 'Dexterity', 'Intelligence', 'Defence', 'Agility']
const EFFECT_LABELS = ['% damage', '% crit', '% cost red.', '% resist', '% dodge']

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

const itemLevelWarnings = computed<string[]>(() => {
  const rb = store.rawBuild
  const ctx = store.ctx
  if (!rb || !ctx)
    return []
  const warnings: string[] = []
  for (let slot = 0; slot <= 8; slot++) {
    const id = rb.equipmentIds[slot]
    if (id == null || id >= 10000)
      continue
    const item = ctx.rawItemIndex.resolveId(id)
    if (!item)
      continue
    const itemLvl = Number(item.lvl)
    if (!Number.isNaN(itemLvl) && itemLvl > rb.level) {
      warnings.push(`${item.displayName} requires level ${item.lvl}`)
    }
  }
  return warnings
})

const overCapWarnings = computed<string[]>(() => {
  return assigned.value
    .map((val, i) => (val > 100 ? `Cannot assign ${val} in ${LABELS[i]} manually` : null))
    .filter((w): w is string => w !== null)
})

const tooManyWarning = computed<string | null>(() =>
  totalAssigned.value > available.value
    ? `Too many skillpoints — only ${available.value} at this level`
    : null,
)

const activeSetBonuses = computed<Array<{ name: string, count: number }>>(() => {
  const r = store.result
  if (!r)
    return []
  const out: Array<{ name: string, count: number }> = []
  for (const [setName, count] of r.skillpoints.activeSetCounts) {
    out.push({ name: setName, count })
  }
  return out
})
</script>

<template>
  <div v-if="store.result" class="build-summary">
    <!-- Header -->
    <section class="panel-section">
      <h2 class="section-title">
        Summary
      </h2>
      <p class="summary-header">
        Assigned <span class="mono">{{ totalAssigned }}</span> skillpoints —
        Remaining
        <span class="mono" :class="{ 'value--negative': remaining < 0 }">{{ remaining }}</span>
      </p>

      <!-- Per-skill rows -->
      <dl class="stat-list">
        <div v-for="(label, i) in LABELS" :key="label" class="stat-row">
          <dt class="stat-label">
            {{ label }}
          </dt>
          <dd class="stat-value-group">
            <span class="mono stat-assigned">{{ assigned[i] }}</span>
            <span class="stat-effect">{{ skillEffect[i] }} {{ EFFECT_LABELS[i] }}</span>
          </dd>
        </div>
      </dl>
    </section>

    <!-- Warnings -->
    <section
      v-if="overCapWarnings.length || tooManyWarning || itemLevelWarnings.length"
      class="panel-section panel-section--warn"
    >
      <h2 class="section-title section-title--warn">
        Warnings
      </h2>
      <ul class="warn-list">
        <li v-if="tooManyWarning" class="warn-item">
          {{ tooManyWarning }}
        </li>
        <li v-for="w in overCapWarnings" :key="w" class="warn-item">
          {{ w }}
        </li>
        <li v-for="w in itemLevelWarnings" :key="w" class="warn-item">
          {{ w }}
        </li>
      </ul>
    </section>

    <!-- Active Set Bonuses -->
    <section v-if="activeSetBonuses.length" class="panel-section">
      <h2 class="section-title">
        Active Sets
      </h2>
      <ul class="set-list">
        <li v-for="s in activeSetBonuses" :key="s.name" class="set-item">
          <span class="set-name">{{ s.name }}</span>
          <span class="mono set-count">{{ s.count }} pieces</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.build-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-section {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 20px 24px;
}

.panel-section--warn {
  border-color: oklch(55% 0.15 20 / 0.6);
}

.section-title {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: 14px;
}

.section-title--warn {
  color: oklch(62% 0.15 20);
}

.summary-header {
  font-size: 13px;
  color: var(--color-text);
  margin-bottom: 16px;
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

.value--negative {
  color: oklch(62% 0.15 20);
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-muted);
  white-space: nowrap;
}

.stat-value-group {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.stat-assigned {
  font-size: 13px;
  color: var(--color-text);
  min-width: 28px;
  text-align: right;
}

.stat-effect {
  font-size: 12px;
  color: var(--color-faint, var(--color-muted));
  white-space: nowrap;
}

.warn-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.warn-item {
  font-size: 12px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  color: oklch(68% 0.14 20);
}

.set-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.set-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.set-name {
  font-size: 13px;
  color: var(--color-text);
}

.set-count {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
