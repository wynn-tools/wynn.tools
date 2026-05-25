<script setup lang="ts">
import type { BuildResult } from '~/lib/build/compute-build'

const props = defineProps<{ result: BuildResult }>()

const ELEMENTS = ['Earth', 'Thunder', 'Water', 'Fire', 'Air'] as const
</script>

<template>
  <div class="stat-panel">
    <section class="panel-section">
      <h2 class="section-title">
        Defense
      </h2>
      <dl class="stat-list">
        <div class="stat-row">
          <dt class="stat-label">
            Total HP
          </dt>
          <dd class="stat-value">
            {{ Math.round(props.result.defense.totalHp) }}
          </dd>
        </div>
        <div class="stat-row">
          <dt class="stat-label">
            Effective HP
          </dt>
          <dd class="stat-value">
            {{ props.result.defense.ehp.withAgi.toFixed(2) }}
          </dd>
        </div>
        <div class="stat-row">
          <dt class="stat-label">
            Effective HP (no agi)
          </dt>
          <dd class="stat-value">
            {{ props.result.defense.ehp.withoutAgi.toFixed(2) }}
          </dd>
        </div>
        <div
          v-for="(d, i) in props.result.defense.elementalDefenses"
          :key="i"
          class="stat-row"
        >
          <dt class="stat-label">
            {{ ELEMENTS[i] }} Def
          </dt>
          <dd class="stat-value">
            {{ d.toFixed(0) }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="panel-section">
      <h2 class="section-title">
        Melee
      </h2>
      <dl class="stat-list">
        <div class="stat-row headline-row">
          <dt class="stat-label">
            Average DPS
          </dt>
          <dd class="stat-value stat-value--copper">
            {{ props.result.melee.averageDps.toFixed(2) }}
          </dd>
        </div>
        <div class="stat-row">
          <dt class="stat-label">
            Attack Speed
          </dt>
          <dd class="stat-value">
            {{ props.result.melee.attackSpeed }}
          </dd>
        </div>
        <div class="stat-row">
          <dt class="stat-label">
            Per Attack
          </dt>
          <dd class="stat-value">
            {{ props.result.melee.perAttack.toFixed(2) }}
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.stat-panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 480px;
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

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.stat-value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
  text-align: right;
}

.headline-row .stat-label {
  color: var(--color-text);
  font-weight: 500;
}

.stat-value--copper {
  color: var(--color-copper);
  font-size: 15px;
  font-weight: 500;
}
</style>
