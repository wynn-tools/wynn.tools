<script setup lang="ts">
import type { SearchIngredient } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { emblemUrl, frameUrl, miscUrl, professionUrl, spriteUrl } from '~/lib/items/icon'

const props = defineProps<{ ingredient: SearchIngredient }>()

const ING_GREEN = '#7feb8e' // primary ingredient accent
const ING_NAME = '#00c621' // brighter green for the name
const ING_NAME_SHADOW = '#003508'
const STAR_FILL: Record<number, string> = { 1: '#f6f734', 2: '#ff44ff', 3: '#07f2f0' }
const STAR_EMPTY = '#000000'
const COLOR_GOOD = '#83f7c6'
const COLOR_BAD = '#ffb0b0'

const frame = computed(() => frameUrl('ingredient'))
const emblem = computed(() => emblemUrl('square'))
const icon = computed(() => spriteUrl('ingredient'))

const stars = computed(() => Array.from({ length: 3 }, (_, i) => ({
  color: i < props.ingredient.tier ? (STAR_FILL[props.ingredient.tier] ?? STAR_EMPTY) : STAR_EMPTY,
})))

interface ItemizedRow { label: string, value: number, unit: string, good: boolean }
const itemizedRows = computed<ItemizedRow[]>(() => {
  const out: ItemizedRow[] = []
  const cons = props.ingredient.consumableOnlyIDs
  const item = props.ingredient.itemOnlyIDs

  function add(label: string, v: number | undefined, unit = '', invert = false) {
    if (!v)
      return
    out.push({ label, value: v, unit, good: invert ? v < 0 : v > 0 })
  }

  add('Charges', cons?.charges, '')
  add('Duration', cons?.duration, '')
  add('Durability', item?.durabilityModifier, '')
  add('Min. Strength', item?.strengthRequirement, '', true)
  add('Min. Dexterity', item?.dexterityRequirement, '', true)
  add('Min. Intelligence', item?.intelligenceRequirement, '', true)
  add('Min. Defence', item?.defenceRequirement, '', true)
  add('Min. Agility', item?.agilityRequirement, '', true)

  return out
})

interface IdRow { label: string, unit: string, min: number, max: number, raw: number, good: boolean }
const idRows = computed<IdRow[]>(() =>
  Object.entries(props.ingredient.identifications).map(([key, r]) => {
    const { label, unit } = humanizeField(key)
    const good = isInverted(key) ? r.raw < 0 : r.raw > 0
    return { label, unit, min: r.min, max: r.max, raw: r.raw, good }
  }),
)

const recipes = computed(() => props.ingredient.skills)

const hasDrops = computed(() => props.ingredient.droppedBy.length > 0)

const hasEffectiveness = computed(() =>
  Object.values(props.ingredient.positionModifiers).some(v => v !== 0),
)

interface Cell { value: number | null }
const grid = computed<Cell[][]>(() => {
  const m = props.ingredient.positionModifiers
  const dir = (specific: number) => specific || m.touching
  const cells: Cell[][] = []
  for (let row = 1; row <= 5; row++) {
    const r: Cell[] = []
    for (let col = 1; col <= 3; col++) {
      if (row === 3 && col === 2)
        r.push({ value: null })
      else if (row === 2 && col === 2)
        r.push({ value: dir(m.above) })
      else if (row === 4 && col === 2)
        r.push({ value: dir(m.under) })
      else if (row === 3 && col === 1)
        r.push({ value: dir(m.left) })
      else if (row === 3 && col === 3)
        r.push({ value: dir(m.right) })
      else
        r.push({ value: m.notTouching })
      cells.push([])
    }
    cells[row - 1] = r
  }
  return cells
})

function fmtVal(v: number, unit: string): string {
  return `${v > 0 ? '+' : ''}${v}${unit ?? ''}`
}

function sepStyle() {
  return {
    maskImage: `url(${miscUrl('line')})`,
    WebkitMaskImage: `url(${miscUrl('line')})`,
    background: ING_GREEN,
  }
}

function starStyle(color: string) {
  return {
    maskImage: `url(${miscUrl('star')})`,
    WebkitMaskImage: `url(${miscUrl('star')})`,
    background: color,
  }
}

function effectivenessBg() {
  return { backgroundImage: `url(${miscUrl('effectiveness')})` }
}
</script>

<template>
  <div class="tt-container">
    <div
      class="tt-frame"
      :style="frame ? { borderImage: `url(${frame}) 25 10 / 8 3 / 0 stretch` } : { border: `2px solid ${ING_GREEN}` }"
    />
    <div class="tt-inner">
      <!-- Header -->
      <div class="tt-header">
        <div class="tt-emblemwrap">
          <img v-if="emblem" :src="emblem" class="tt-emblem" alt="" aria-hidden="true">
          <img v-if="icon" :src="icon" class="tt-sprite" alt="" aria-hidden="true">
        </div>
        <div class="tt-headtext">
          <span class="tt-name" :style="{ color: ING_NAME, textShadow: `3px 3px 0 ${ING_NAME_SHADOW}` }">{{ ingredient.displayName }}</span>
          <div class="tt-tags">
            <span class="tt-tag tt-tag--stars">
              <span v-for="(s, i) in stars" :key="i" class="tt-star" :style="starStyle(s.color)" />
            </span>
            <span class="tt-tag" :style="{ background: ING_GREEN }">ingredient</span>
          </div>
        </div>
      </div>

      <!-- Crafting level + recipes -->
      <p class="tt-craft">
        <span class="tt-craft-num" :style="{ color: ING_GREEN }">{{ ingredient.level }}</span>
        <span class="tt-craft-unit">Crafting Level</span>
      </p>
      <p v-if="recipes.length" class="tt-recipe-intro tt-muted">
        Can be used in recipes for
      </p>
      <div v-if="recipes.length" class="tt-recipes">
        <span v-for="s in recipes" :key="s" class="tt-recipe">
          <img :src="professionUrl(s)" class="tt-prof" alt="" aria-hidden="true">
          <span>{{ s }}</span>
        </span>
      </div>

      <!-- Dropped by -->
      <template v-if="hasDrops">
        <p class="tt-muted tt-drop-label">
          Dropped by
        </p>
        <ul class="tt-drops">
          <li v-for="d in ingredient.droppedBy" :key="d.name">
            <RouterLink
              v-if="d.coords"
              :to="{ path: '/map', query: { ing: ingredient.name } }"
              class="tt-drop-link"
            >
              {{ d.name }}
            </RouterLink>
            <span v-else class="tt-drop-plain">{{ d.name }}</span>
          </li>
        </ul>
      </template>

      <!-- Separator -->
      <div class="tt-sep" :style="sepStyle()" />

      <!-- Itemized (duration / durability / skill reqs) -->
      <ul v-if="itemizedRows.length" class="tt-itemized">
        <li v-for="row in itemizedRows" :key="row.label">
          <span class="tt-itemized-label">{{ row.label }}</span>
          <span class="tt-itemized-val" :style="{ color: row.good ? COLOR_GOOD : COLOR_BAD }">{{ fmtVal(row.value, row.unit) }}</span>
        </li>
      </ul>

      <!-- Identifications -->
      <ul v-if="idRows.length" class="tt-ids" :class="{ 'tt-ids--gap': itemizedRows.length }">
        <li v-for="row in idRows" :key="row.label" class="tt-id">
          <span class="tt-id-name">{{ row.label }}</span>
          <span class="tt-id-range">
            <span :style="{ color: row.good ? COLOR_GOOD : COLOR_BAD }">{{ fmtVal(row.min, row.unit) }}</span>
            <span class="tt-id-arrow">to</span>
            <span :style="{ color: row.good ? COLOR_GOOD : COLOR_BAD }">{{ fmtVal(row.max, row.unit) }}</span>
          </span>
        </li>
      </ul>

      <!-- Effectiveness grid -->
      <template v-if="hasEffectiveness">
        <div class="tt-sep" :style="sepStyle()" />
        <span class="tt-tag tt-tag--block" :style="{ background: ING_GREEN }">effectiveness</span>
        <p class="tt-muted tt-eff-desc">
          Grants an effectiveness multiplier to nearby ingredients when used in a Crafted Item recipe.
        </p>
        <div class="tt-eff" :style="effectivenessBg()">
          <div v-for="(row, ri) in grid" :key="ri" class="tt-eff-row">
            <div
              v-for="(c, ci) in row" :key="ci" class="tt-eff-cell"
              :style="{ color: c.value === null ? 'transparent' : (c.value > 0 ? COLOR_GOOD : c.value < 0 ? COLOR_BAD : '#aeaeae') }"
            >
              <template v-if="c.value !== null">
                {{ c.value > 0 ? '+' : '' }}{{ c.value }}%
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tt-container {
  position: relative;
  width: 482px;
  max-width: 100%;
  font-family: 'wynncraft', var(--font-mono);
  letter-spacing: -1px;
  overflow: hidden;
}
.tt-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 10px solid transparent;
  image-rendering: pixelated;
  pointer-events: none;
  z-index: 1;
}
.tt-inner {
  position: relative;
  padding: 26px 20px 16px;
  min-height: 150px;
  color: #fcfcfc;
  background: linear-gradient(#0d0d0df7, #14371480);
}

/* Header */
.tt-header {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}
.tt-emblemwrap {
  position: relative;
  min-width: 96px;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tt-emblem {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  transform: scale(1.3);
}
.tt-sprite {
  position: relative;
  width: 52px;
  height: 52px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-headtext {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.tt-name {
  font-size: 26px;
  line-height: 1;
}
.tt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.tt-tag {
  color: #000;
  font-family: 'wynn-five', 'wynn-default', var(--font-mono);
  font-size: 16px;
  line-height: 14px;
  padding: 2px 6px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: lowercase;
}
.tt-tag--block {
  display: block;
  margin-top: 10px;
  text-transform: uppercase;
}
.tt-tag--stars {
  background: #636363;
  padding: 3px 6px;
}
.tt-star {
  display: inline-block;
  width: 16px;
  height: 12px;
  margin-right: 5px;
  image-rendering: pixelated;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
}
.tt-star:last-child {
  margin-right: 0;
}

/* Crafting level + recipes */
.tt-craft {
  margin: 8px 0 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.tt-craft-num {
  font-size: 32px;
  line-height: 1;
}
.tt-craft-unit {
  font-size: 20px;
}
.tt-recipe-intro {
  margin: 6px 0 4px;
  font-size: 17px;
}
.tt-recipes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-bottom: 4px;
}
.tt-recipe {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #aeaeae;
  font-size: 18px;
  text-transform: capitalize;
}
.tt-prof {
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
  object-fit: cover;
  filter: drop-shadow(2px 2px 0 rgb(0 0 0 / 0.6));
}

.tt-muted {
  color: #aeaeae;
}

/* Separator */
.tt-sep {
  width: 316px;
  max-width: 100%;
  height: 25px;
  margin: 10px auto 6px;
  image-rendering: pixelated;
  mask-repeat: no-repeat;
  mask-size: cover;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: cover;
}

/* Itemized stats */
.tt-itemized {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tt-itemized li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 18px;
  text-transform: capitalize;
}
.tt-itemized-val {
  font-family: 'wynncraft', var(--font-mono);
}

/* Identifications */
.tt-ids {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tt-ids--gap {
  margin-top: 18px;
}
.tt-id {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 18px;
  gap: 12px;
}
.tt-id-name {
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
.tt-id-range {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.tt-id-arrow {
  color: #82c39b;
  font-size: 17px;
}

/* Dropped by */
.tt-drop-label {
  margin: 8px 0 2px;
  font-size: 16px;
}
.tt-drops {
  list-style: none;
  margin: 0 0 4px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tt-drops li {
  font-size: 17px;
}
.tt-drop-link {
  color: #83f7c6;
  text-decoration: none;
}
.tt-drop-link:hover {
  text-decoration: underline;
}
.tt-drop-plain {
  color: #aeaeae;
}

/* Effectiveness grid */
.tt-eff-desc {
  margin: 6px 0 8px;
  font-size: 16px;
  line-height: 1.3;
}
.tt-eff {
  width: 342px;
  height: 158px;
  margin: 6px auto 0;
  padding: 6px 0 1px;
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  image-rendering: pixelated;
}
.tt-eff-row {
  display: flex;
}
.tt-eff-cell {
  flex: 1;
  text-align: center;
  font-family: 'wynn-five', 'wynn-default', var(--font-mono);
  font-size: 17px;
}
</style>
