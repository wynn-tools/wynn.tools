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

const props = withDefaults(defineProps<{ item: SearchItem, exportable?: boolean }>(), {
  exportable: true,
})

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

const healthBase = computed<number | null>(() => {
  const h = props.item.base.health
  return typeof h === 'number' ? h : null
})

interface DefenceLine { element: string, value: string }
const defenceLines = computed<DefenceLine[]>(() =>
  Object.entries(props.item.base)
    .filter(([key]) => key.endsWith('Defence'))
    .map(([key, v]) => {
      const n = typeof v === 'number' ? v : v.raw
      return { element: baseStatMeta(key).element ?? '', value: `${n > 0 ? '+' : ''}${n}` }
    })
    .sort((a, b) => ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element)),
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

const containerRef = ref<HTMLElement | null>(null)
const { exporting, exportTooltip } = useTooltipExport()

function onExportClick() {
  if (!containerRef.value)
    return
  const slug = props.item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  exportTooltip(containerRef.value, `${slug || 'item'}.png`)
}
</script>

<template>
  <div ref="containerRef" class="tt-wrap">
    <button
      v-if="exportable"
      type="button"
      class="tt-export-btn"
      data-export-ignore
      :disabled="exporting"
      :aria-label="exporting ? 'Exporting tooltip as PNG' : 'Export tooltip as PNG'"
      @click="onExportClick"
    >
      <span v-if="exporting" class="tt-export-spinner" aria-hidden="true" />
      <span v-else>Export PNG</span>
    </button>

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

        <!-- Armour / accessory: health + elemental defences -->
        <template v-else>
          <p v-if="healthBase != null" class="tt-dps">
            <span :style="{ color: theme.light }">{{ healthBase > 0 ? '+' : '' }}{{ healthBase }}</span>
            <span class="tt-dps-unit">Health</span>
          </p>
          <template v-if="defenceLines.length">
            <div class="tt-row">
              <span class="tt-muted">Elemental Defences</span>
            </div>
            <div class="tt-dmg">
              <span v-for="(d, i) in defenceLines" :key="i" class="tt-dmg-item">
                <img :src="attributeUrl(d.element)" class="tt-attr" alt="" aria-hidden="true">
                <span class="tt-muted">{{ d.value }}</span>
              </span>
            </div>
          </template>
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

        <template v-if="item.lore?.length">
          <div class="tt-sep" :style="sepStyle()" />
          <p class="tt-lore">
            <span
              v-for="(seg, i) in item.lore" :key="i"
              :style="{ color: seg.color ?? '#aaaaaa' }"
              :class="seg.font ? `tt-lore--${seg.font}` : null"
            >{{ seg.text }}</span>
          </p>
        </template>

        <div v-if="exportable" class="tt-export-mark" data-export-footer>
          <span>wynn<span :style="{ color: theme.light }">.</span>tools</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tt-wrap {
  position: relative;
  width: 100%;
  max-width: 482px;
}
.tt-wrap.is-exporting .tt-container {
  background: transparent;
}
.tt-container {
  position: relative;
  width: 100%;
  font-family: 'wynncraft', var(--font-mono);
  letter-spacing: -1px;
  overflow: hidden;
  /* The inner body is inset by a per-rarity margin so it nests inside the pixel
     frame. Without a fill behind it, that inset exposed the transparent page as
     a seam between the colored frame and the dark body. Match the gradient's top
     stop so the gap reads as tooltip body, not a hole. */
  background: #0d0d0d;
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
  height: 25px;
  margin: 10px auto 0;
  image-rendering: pixelated;
  mask-repeat: no-repeat;
  mask-size: cover;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: cover;
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

/* Lore */
.tt-lore {
  margin: 4px 0 0;
  font-family: 'wynn-ascii', var(--font-mono);
  font-size: 17px;
  line-height: 1.35;
  color: #aaaaaa;
}
.tt-lore--ascii {
  font-family: 'wynn-ascii', var(--font-mono);
}
.tt-lore--default {
  font-family: 'wynn-default', var(--font-mono);
}
.tt-lore--common {
  font-family: 'wynn-common', var(--font-mono);
}
.tt-lore--wynnic {
  font-family: 'wynn-wynnic', var(--font-mono);
}
.tt-lore--high_gavelian {
  font-family: 'wynn-high-gavelian', var(--font-mono);
}
.tt-lore--old_fruman {
  font-family: 'wynn-old-fruman', var(--font-mono);
}

/* Below ~480px the 482px in-game tooltip shrinks via max-width:100% but its
   absolute font sizes (28/34/18px) start crowding the pixel-art frame. Scale
   the hierarchy down proportionally; the frame border-image stays intact. */
@media (max-width: 480px) {
  .tt-inner {
    padding: 22px 14px 14px;
  }
  .tt-name {
    font-size: 20px;
  }
  .tt-dps span:first-child {
    font-size: 26px;
  }
  .tt-dps-unit {
    font-size: 16px;
  }
  .tt-row,
  .tt-dmg,
  .tt-meta-row,
  .tt-id,
  .tt-sp-val {
    font-size: 15px;
  }
  .tt-tag {
    font-size: 15px;
  }
  .tt-emblemwrap {
    min-width: 64px;
    width: 64px;
    height: 64px;
  }
  .tt-sprite {
    width: 36px;
    height: 36px;
  }
  .tt-attr {
    width: 22px;
    height: 22px;
  }
  .tt-sp-bg {
    width: 48px;
    height: 48px;
  }
  .tt-sp-icon {
    width: 28px;
    height: 28px;
  }
  .tt-major,
  .tt-lore {
    font-size: 14px;
  }
}

.tt-export-btn {
  position: absolute;
  top: -10px;
  right: 6px;
  transform: translateY(-100%);
  z-index: 2;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.tt-export-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.tt-export-btn:disabled {
  cursor: progress;
  opacity: 0.6;
}
.tt-export-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--color-faint);
  border-top-color: var(--color-text);
  border-radius: 50%;
  animation: tt-spin 0.6s linear infinite;
  vertical-align: middle;
}
@keyframes tt-spin {
  to {
    transform: rotate(360deg);
  }
}

.tt-export-mark {
  display: none;
  justify-content: center;
  margin-top: 14px;
  font-family: 'wynncraft', var(--font-mono);
  font-size: 14px;
  letter-spacing: -1px;
  color: #5c5c5c;
}
</style>
