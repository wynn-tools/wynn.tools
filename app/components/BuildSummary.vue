<script setup lang="ts">
import { computed } from 'vue'
import { levelToSkillPoints } from '~/lib/math/skillpoints'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const LABELS = ['Strength', 'Dexterity', 'Intelligence', 'Defence', 'Agility']

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

const hasWarnings = computed(() =>
  Boolean(tooManyWarning.value) || overCapWarnings.value.length > 0 || itemLevelWarnings.value.length > 0,
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
  <div v-if="store.result && (hasWarnings || activeSetBonuses.length)" class="summary">
    <section v-if="hasWarnings" class="block block--warn">
      <h3 class="block-title">
        Warnings
      </h3>
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

    <section v-if="activeSetBonuses.length" class="block">
      <h3 class="block-title">
        Active Sets
      </h3>
      <ul class="set-list">
        <li v-for="s in activeSetBonuses" :key="s.name" class="set-item">
          <span class="set-name">{{ s.name }}</span>
          <span class="mono set-count">×{{ s.count }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.block--warn {
  border-color: oklch(55% 0.15 22 / 0.6);
}

.block-title {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin: 0 0 8px 0;
}

.block--warn .block-title {
  color: oklch(68% 0.14 22);
}

.warn-list,
.set-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warn-item {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: oklch(72% 0.13 22);
  letter-spacing: 0.01em;
}

.set-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.set-name {
  font-size: 12px;
  color: var(--color-text);
}

.set-count {
  font-size: 11px;
  color: var(--color-copper);
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}
</style>
