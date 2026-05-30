<script setup lang="ts">
import { useItemSearchData } from '~/composables/useItemSearchData'
import { classTheme } from '~/lib/build/class-theme'
import { attributeUrl, itemIconUrl, miscUrl, spUrl } from '~/lib/items/icon'
import { TIER_COLORS } from '~/lib/items/tooltip'

const props = defineProps<{
  name: string
  playerClass: string | null
  level: number
  equipNames: ({ name: string, tier: string } | null)[]
  decoded: unknown
}>()

interface BuildDecoded {
  melee: { averageDps: number }
  defense: { totalHp: number, elementalDefenses: number[] }
  skillpoints: { finalSkillpoints: number[] }
}

const ELEMENTS = ['earth', 'thunder', 'water', 'fire', 'air'] as const
const SP_SKILLS = ['strength', 'dexterity', 'intelligence', 'defence', 'agility'] as const

const { data: searchData } = useItemSearchData()

const iconMap = computed(() => {
  const map = new Map<string, string>()
  if (!searchData.value)
    return map
  for (const item of searchData.value.items) {
    const url = itemIconUrl(item)
    if (url)
      map.set(item.name, url)
  }
  return map
})

const theme = computed(() => classTheme(props.playerClass))

const data = computed(() => props.decoded as BuildDecoded | null)

const innerStyle = computed(() => ({
  background: `linear-gradient(#0d0d0df7, ${theme.value.bg}f7)`,
}))

const items = computed(() =>
  props.equipNames.filter((e): e is { name: string, tier: string } => e !== null),
)

const dps = computed(() => {
  const d = data.value?.melee?.averageDps
  return d != null && d > 0 ? Math.round(d).toLocaleString() : null
})

const hp = computed(() => {
  const h = data.value?.defense?.totalHp
  return h != null ? Math.round(h).toLocaleString() : null
})

interface ElRow { element: string, value: string, positive: boolean }
const elementalRows = computed<ElRow[]>(() => {
  const defs = data.value?.defense?.elementalDefenses
  if (!defs)
    return []
  return ELEMENTS.map((el, i) => {
    const v = Math.round(defs[i] ?? 0)
    return { element: el, value: `${v > 0 ? '+' : ''}${v}`, positive: v >= 0 }
  }).filter(r => r.value !== '+0' && r.value !== '0')
})

interface SpCircle { skill: string, value: number, active: boolean }
const spCircles = computed<SpCircle[]>(() => {
  const final = data.value?.skillpoints?.finalSkillpoints ?? [0, 0, 0, 0, 0]
  return SP_SKILLS.map((skill, i) => ({
    skill,
    value: final[i] ?? 0,
    active: (final[i] ?? 0) > 0,
  }))
})

function sepStyle() {
  return {
    maskImage: `url(${miscUrl('line')})`,
    WebkitMaskImage: `url(${miscUrl('line')})`,
    background: theme.value.light,
  }
}
</script>

<template>
  <div class="bt-container" :style="{ border: `2px solid ${theme.color}` }">
    <div class="bt-inner" :style="innerStyle">
      <!-- Header -->
      <div class="bt-header">
        <span class="bt-name" :style="{ color: theme.color }">{{ name }}</span>
        <div class="bt-tags">
          <span v-if="playerClass" class="bt-tag" :style="{ background: theme.color }">{{ playerClass }}</span>
          <span class="bt-tag" :style="{ background: theme.light }">Lv {{ level }}</span>
        </div>
      </div>

      <div class="bt-sep" :style="sepStyle()" />

      <!-- Equipment -->
      <ul class="bt-items">
        <li v-for="(item, i) in items" :key="i" class="bt-item" :style="{ color: TIER_COLORS[item.tier] ?? '#aeaeae' }">
          <img
            v-if="iconMap.get(item.name)"
            :src="iconMap.get(item.name)"
            class="bt-item-icon"
            alt=""
            aria-hidden="true"
          >
          {{ item.name }}
        </li>
      </ul>

      <div v-if="dps != null || hp != null || elementalRows.length" class="bt-sep" :style="sepStyle()" />

      <!-- Combat stats. HP leads (universal); Melee DPS is de-emphasized and
           explicitly labelled, since it only reflects melee and misleads
           spell-focused builds. -->
      <div v-if="dps != null || hp != null || elementalRows.length" class="bt-combat">
        <p v-if="hp != null" class="bt-hp">
          <span :style="{ color: theme.light }">{{ hp }}</span>
          <span class="bt-hp-unit">HP</span>
        </p>
        <div v-if="elementalRows.length" class="bt-el">
          <span v-for="el in elementalRows" :key="el.element" class="bt-el-item">
            <img :src="attributeUrl(el.element)" class="bt-attr" alt="" aria-hidden="true">
            <span :class="el.positive ? 'bt-positive' : 'bt-negative'">{{ el.value }}</span>
          </span>
        </div>
        <div v-if="dps != null" class="bt-stat-row">
          <span class="bt-muted">{{ dps }} Melee DPS</span>
        </div>
      </div>

      <div class="bt-sep" :style="sepStyle()" />

      <!-- Skill points -->
      <div class="bt-sp-row">
        <div v-for="c in spCircles" :key="c.skill" class="bt-sp">
          <div class="bt-sp-bg">
            <img :src="spUrl(c.active ? 'unique' : 'disabled')" class="bt-sp-disc" alt="" aria-hidden="true">
            <img :src="spUrl(c.active ? c.skill : `${c.skill}_off`)" class="bt-sp-icon" :alt="c.skill">
          </div>
          <div class="bt-sp-val">
            <span :style="{ color: c.active ? '#83f7c6' : '#5c5c5c' }">{{ c.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bt-container {
  width: 100%;
  max-width: 340px;
  font-family: 'wynncraft', var(--font-mono);
  letter-spacing: -1px;
  overflow: hidden;
  border-radius: 4px;
  background: #0d0d0d;
}

.bt-inner {
  padding: 16px 16px 12px;
  color: #fcfcfc;
}

/* Header */
.bt-header {
  margin-bottom: 4px;
}

.bt-name {
  display: block;
  font-size: 22px;
  line-height: 1.1;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.bt-tag {
  color: #000;
  font-family: 'wynn-five', 'wynn-default', var(--font-mono);
  font-size: 16px;
  line-height: 14px;
  padding: 2px 6px;
  display: inline-flex;
  align-items: center;
  text-transform: lowercase;
}

/* Separator */
.bt-sep {
  width: 280px;
  max-width: 100%;
  height: 25px;
  margin: 8px auto 0;
  image-rendering: pixelated;
  mask-repeat: no-repeat;
  mask-size: cover;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: cover;
}

/* Equipment */
.bt-items {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px 12px;
  margin-top: 2px;
  padding: 0;
}

.bt-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}

.bt-item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  image-rendering: pixelated;
  object-fit: contain;
}

/* Combat stats */
.bt-combat {
  margin-top: 2px;
}

.bt-hp {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.bt-hp span:first-child {
  font-size: 28px;
  line-height: 1;
}

.bt-hp-unit {
  font-size: 18px;
  color: #fcfcfc;
}

.bt-stat-row {
  margin-top: 6px;
  font-size: 16px;
}

.bt-muted {
  color: #aeaeae;
}

.bt-el {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin-top: 4px;
  font-size: 16px;
}

.bt-el-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.bt-attr {
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
  object-fit: contain;
}

.bt-positive {
  color: #5aff5a;
}

.bt-negative {
  color: #ff5555;
}

/* Skill points */
.bt-sp-row {
  display: flex;
  justify-content: space-around;
  margin-top: 4px;
}

.bt-sp {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bt-sp-bg {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bt-sp-disc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

.bt-sp-icon {
  position: relative;
  width: 28px;
  height: 28px;
  image-rendering: pixelated;
  object-fit: contain;
}

.bt-sp-val {
  margin-top: 2px;
  font-size: 16px;
}
</style>
