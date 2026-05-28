<script setup lang="ts">
import type { DamageRange } from '~/lib/data/cdn-adapter/item-adapter'
import type { SearchItem } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { attributeUrl, emblemUrl, frameUrl, itemIconUrl, miscUrl, spriteUrl, spUrl } from '~/lib/items/icon'
import {
  attackSpeedLabel,
  baseStatMeta,
  hitsPerSecond,
  ID_BAD_COLOR,
  ID_GOOD_COLOR,
  idIsGood,
  tierTheme,
  weaponClass,
} from '~/lib/items/tooltip'

const props = defineProps<{ item: SearchItem }>()

const SKILLS = ['strength', 'dexterity', 'intelligence', 'defence', 'agility'] as const

const theme = computed(() => tierTheme(props.item.tier))
const frame = computed(() => frameUrl(props.item.tier))
const icon = computed(() => itemIconUrl(props.item) ?? spriteUrl(props.item.subType))
const emblem = computed(() => emblemUrl(props.item.emblem))
const isWeapon = computed(() => props.item.type === 'weapon')

const innerStyle = computed(() => ({
  background: `linear-gradient(#0d0d0df7, ${theme.value.bg}f7)`,
  margin: theme.value.margin,
}))
const frameStyle = computed(() => frame.value
  ? { borderImage: `url(${frame.value}) 25 10 / 8 3 / 0 stretch` }
  : { border: `2px solid ${theme.value.color}` })

function isRange(v: DamageRange | number): v is DamageRange {
  return typeof v === 'object'
}

const ELEMENT_ORDER = ['neutral', 'earth', 'thunder', 'water', 'fire', 'air']

interface DamageLine { element: string | null, text: string }
const damageLines = computed<DamageLine[]>(() =>
  Object.entries(props.item.base)
    .filter(([key]) => key === 'damage' || key.endsWith('Damage'))
    .map(([key, v]) => ({
      element: baseStatMeta(key).element,
      text: isRange(v) ? (v.min === v.max ? String(v.raw) : `${v.min}-${v.max}`) : String(v),
    }))
    .sort((a, b) => ELEMENT_ORDER.indexOf(a.element ?? '') - ELEMENT_ORDER.indexOf(b.element ?? '')),
)

interface StatLine { label: string, element: string | null, text: string }
const baseStatLines = computed<StatLine[]>(() =>
  Object.entries(props.item.base).map(([key, v]) => {
    const meta = baseStatMeta(key)
    return {
      label: meta.label,
      element: meta.element,
      text: isRange(v) ? (v.min === v.max ? String(v.raw) : `${v.min}-${v.max}`) : String(v),
    }
  }),
)

interface SpCircle { skill: string, active: boolean, value: number }
const spCircles = computed<SpCircle[]>(() =>
  SKILLS.map((skill) => {
    const value = (props.item.requirements as Record<string, number> | undefined)?.[skill] ?? 0
    return { skill, active: value > 0, value }
  }),
)

const classReq = computed(() => {
  if (isWeapon.value)
    return weaponClass(props.item.subType)
  const c = props.item.requirements?.classRequirement
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : null
})

const hits = computed(() => props.item.attackSpeed ? hitsPerSecond(props.item.attackSpeed) : null)

interface IdRow { label: string, left: string, right: string, color: string }
const idRows = computed<IdRow[]>(() =>
  Object.entries(props.item.identifications).map(([key, r]) => {
    const { label, unit } = humanizeField(key)
    const color = idIsGood(r.raw, isInverted(key)) ? ID_GOOD_COLOR : ID_BAD_COLOR
    if (r.min === r.max)
      return { label, left: '', right: `${r.raw}${unit}`, color }
    return { label, left: `${r.min}${unit}`, right: `${r.max}${unit}`, color }
  }),
)

const majorIds = computed(() =>
  props.item.majorIds.map(m => ({
    name: m.name,
    text: Array.isArray(m.description) ? m.description.map(n => n.text).join('') : String(m.description ?? ''),
  })),
)

function sepStyle() {
  return {
    maskImage: `url(${miscUrl('line')})`,
    WebkitMaskImage: `url(${miscUrl('line')})`,
    background: theme.value.light,
  }
}
</script>

<template>
  <div class="tt-container">
    <div class="tt-frame" :style="frameStyle" />
    <div class="tt-inner" :style="innerStyle">
      <!-- Header -->
      <div class="tt-header">
        <div class="tt-emblemwrap">
          <img v-if="emblem" :src="emblem" class="tt-emblem" alt="" aria-hidden="true">
          <img v-if="icon" :src="icon" class="tt-sprite" alt="" aria-hidden="true">
        </div>
        <div class="tt-headtext">
          <span class="tt-name" :style="{ color: theme.color }">{{ item.displayName }}</span>
          <div class="tt-tags">
            <span class="tt-tag" :style="{ background: theme.color }">{{ item.tier.toLowerCase() }}</span>
            <span class="tt-tag" :style="{ background: theme.light }">{{ item.subType }}</span>
          </div>
          <div v-if="item.elements.length" class="tt-tags">
            <span class="tt-tag tt-tag--el" :style="{ background: theme.light }">
              <img
                v-for="el in item.elements" :key="el" :src="attributeUrl(el)"
                class="tt-tag-icon" alt="" aria-hidden="true"
              >
              <span v-if="item.elements.length === 1" class="tt-tag-el-name">{{ item.elements[0] }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Weapon: DPS + attack speed + damage -->
      <template v-if="isWeapon">
        <p v-if="item.averageDps != null" class="tt-dps">
          <span :style="{ color: theme.light }">{{ item.averageDps }}</span>
          <span class="tt-dps-unit">DPS</span>
        </p>
        <div v-if="item.attackSpeed" class="tt-row">
          <img :src="attributeUrl('attack_speed')" class="tt-attr" alt="" aria-hidden="true">
          <span class="tt-muted">{{ attackSpeedLabel(item.attackSpeed) }}
            <span v-if="hits != null" class="tt-faint">({{ hits }} hits/s)</span>
          </span>
        </div>
        <div v-if="damageLines.length" class="tt-dmg">
          <span v-for="(d, i) in damageLines" :key="i" class="tt-dmg-item">
            <img v-if="d.element" :src="attributeUrl(d.element)" class="tt-attr" alt="" aria-hidden="true">
            <span class="tt-muted">{{ d.text }}</span>
          </span>
        </div>
      </template>

      <!-- Armour / accessory: base stats -->
      <template v-else>
        <div v-for="(s, i) in baseStatLines" :key="i" class="tt-row">
          <img v-if="s.element" :src="attributeUrl(s.element)" class="tt-attr" alt="" aria-hidden="true">
          <span class="tt-muted">{{ s.label }} {{ s.text }}</span>
        </div>
      </template>

      <div class="tt-sep" :style="sepStyle()" />

      <!-- Skill point requirements -->
      <div class="tt-sp-row">
        <div v-for="c in spCircles" :key="c.skill" class="tt-sp">
          <div class="tt-sp-bg">
            <img :src="spUrl(c.active ? item.tier.toLowerCase() : 'disabled')" class="tt-sp-disc" alt="" aria-hidden="true">
            <img :src="spUrl(c.active ? c.skill : `${c.skill}_off`)" class="tt-sp-icon" :alt="c.skill">
          </div>
          <div class="tt-sp-val">
            <img :src="miscUrl(c.active ? 'check' : 'blank')" class="tt-check" alt="" aria-hidden="true">
            <span :style="{ color: c.active ? ID_GOOD_COLOR : '#5c5c5c' }">{{ c.value }}</span>
          </div>
        </div>
      </div>

      <!-- Class / level -->
      <div class="tt-meta">
        <div v-if="classReq" class="tt-meta-row">
          <span class="tt-meta-label"><img :src="miscUrl('check')" class="tt-check" alt="" aria-hidden="true"> Class Req</span>
          <span class="tt-muted">{{ classReq }}</span>
        </div>
        <div class="tt-meta-row">
          <span class="tt-meta-label"><img :src="miscUrl('check')" class="tt-check" alt="" aria-hidden="true"> Combat Level</span>
          <span class="tt-muted">{{ item.requirements?.level ?? item.level }}</span>
        </div>
      </div>

      <div v-if="idRows.length" class="tt-sep" :style="sepStyle()" />

      <!-- Identifications: min left, max right -->
      <ul v-if="idRows.length" class="tt-ids">
        <li v-for="row in idRows" :key="row.label" class="tt-id">
          <span class="tt-id-left" :style="{ color: row.color }">{{ row.left }}</span>
          <span class="tt-id-name">{{ row.label }}</span>
          <span class="tt-id-right" :style="{ color: row.color }">{{ row.right }}</span>
        </li>
      </ul>

      <!-- Major IDs -->
      <div v-if="majorIds.length" class="tt-majors">
        <p v-for="m in majorIds" :key="m.name" class="tt-major">
          <span class="tt-major-mark" :style="{ maskImage: `url(${miscUrl('major')})`, WebkitMaskImage: `url(${miscUrl('major')})`, background: theme.light }" />
          <span class="tt-major-name" :style="{ color: theme.light }">{{ m.name }}:</span>
          <span class="tt-major-text">{{ m.text }}</span>
        </p>
      </div>

      <p v-if="item.powderSlots" class="tt-row tt-muted">
        Powder Slots [{{ 'o'.repeat(item.powderSlots) }}]
      </p>
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
}

/* Header */
.tt-header {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}
.tt-emblemwrap {
  position: relative;
  min-width: 80px;
  width: 80px;
  height: 80px;
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
  transform: scale(1.2);
}
.tt-sprite {
  position: relative;
  width: 44px;
  height: 44px;
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
  font-size: 28px;
  line-height: 1;
  text-shadow: 3px 3px 0 rgb(0 0 0 / 0.45);
}
.tt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
}
.tt-tag {
  color: #000;
  font-family: 'wynn-five', 'wynn-default', var(--font-mono);
  font-size: 18px;
  line-height: 16px;
  padding: 2px 6px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: lowercase;
}
.tt-tag-icon {
  height: 15px;
  margin: 0 2px;
  image-rendering: pixelated;
}
.tt-tag-el-name {
  margin-left: 2px;
}

/* Weapon / base lines */
.tt-dps {
  margin: 6px 0 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.tt-dps span:first-child {
  font-size: 34px;
  line-height: 1;
}
.tt-dps-unit {
  font-size: 20px;
  color: #fcfcfc;
}
.tt-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-size: 18px;
}
.tt-attr {
  width: 26px;
  height: 26px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-dmg {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  margin-top: 6px;
  font-size: 18px;
}
.tt-dmg-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.tt-muted {
  color: #aeaeae;
}
.tt-faint {
  color: #4e4e4e;
}

/* Separator */
.tt-sep {
  width: 316px;
  max-width: 100%;
  height: 18px;
  margin: 12px auto;
  mask-repeat: no-repeat;
  mask-size: contain;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  -webkit-mask-position: center;
}

/* Skill points */
.tt-sp-row {
  display: flex;
  justify-content: space-around;
  margin-top: 6px;
}
.tt-sp {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tt-sp-bg {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tt-sp-disc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
.tt-sp-icon {
  position: relative;
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-sp-val {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 18px;
}
.tt-check {
  width: 22px;
  height: 18px;
  image-rendering: pixelated;
  object-fit: contain;
}

/* Class / level */
.tt-meta {
  margin-top: 12px;
}
.tt-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
  font-size: 18px;
}
.tt-meta-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fcfcfc;
}

/* Identifications */
.tt-ids {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tt-id {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: baseline;
  gap: 10px;
  font-size: 18px;
}
.tt-id-left {
  text-align: left;
}
.tt-id-name {
  color: #fcfcfc;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-id-right {
  text-align: right;
}

/* Major IDs */
.tt-majors {
  margin-top: 16px;
}
.tt-major {
  margin: 0;
  font-size: 17px;
  line-height: 1.35;
}
.tt-major-mark {
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 8px;
  vertical-align: middle;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
}
.tt-major-text {
  color: #aaaaaa;
  font-family: 'wynn-ascii', var(--font-mono);
}
</style>
