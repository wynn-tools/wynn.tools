<script setup lang="ts">
import type { CraftedItem, IdRange } from '~/lib/crafter/types'
import { computed } from 'vue'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { attributeUrl, frameUrl, miscUrl, spriteUrl } from '~/lib/items/icon'
import {
  attackSpeedLabel,
  ID_BAD_COLOR,
  ID_GOOD_COLOR,
  tierTheme,
} from '~/lib/items/tooltip'
import { useCraftStore } from '~/stores/craft'

// `hideEquipButton`: when true, suppresses the "Equip in builder" CTA. Standalone
// crafter pages set this false; the embedded variant repurposes the
// button by supplying an `onEquip` handler — when present, the button becomes a
// live "Equip in this slot" action that returns control to the builder.
// `equipDisabledReason`: when set, the button is disabled and the reason shown
// as a tooltip (e.g. "Recipe type doesn't match this slot").
const props = defineProps<{
  hideEquipButton?: boolean
  onEquip?: () => void
  equipDisabledReason?: string | null
}>()

const store = useCraftStore()

const crafted = computed<CraftedItem | null>(() => store.crafted)

const theme = computed(() => tierTheme('Crafted'))
const frame = computed(() => frameUrl('normal')) // crafted has no dedicated frame asset; use normal as a neutral surround

const innerStyle = computed(() => ({
  background: `linear-gradient(#0d0d0df7, ${theme.value.bg}f7)`,
  margin: theme.value.margin,
}))
const frameStyle = computed(() => frame.value
  ? { borderImage: `url(${frame.value}) 25 10 / 8 3 / 0 stretch` }
  : { border: `2px solid ${theme.value.color}` })

const ELEMENT_ORDER = ['neutral', 'earth', 'thunder', 'water', 'fire', 'air']

const ELEMENT_FOR_DEFENSE: Record<string, string> = {
  eDef: 'earth',
  tDef: 'thunder',
  wDef: 'water',
  fDef: 'fire',
  aDef: 'air',
}

const ELEMENT_FOR_DAMAGE: Record<string, string> = {
  neutral: 'neutral',
  earth: 'earth',
  thunder: 'thunder',
  water: 'water',
  fire: 'fire',
  air: 'air',
}

const SKP_REQ_LABEL: Record<string, string> = {
  strReq: 'Strength Min',
  dexReq: 'Dexterity Min',
  intReq: 'Intelligence Min',
  defReq: 'Defence Min',
  agiReq: 'Agility Min',
}

const isWeapon = computed(() => crafted.value?.category === 'weapon')
const isArmor = computed(() => crafted.value?.category === 'armor')
const isConsumable = computed(() => crafted.value?.category === 'consumable')

const icon = computed(() => crafted.value ? spriteUrl(crafted.value.type) : null)

interface DamageLine { element: string, text: string }
const damageLines = computed<DamageLine[]>(() => {
  const dmg = crafted.value?.damage
  if (!dmg)
    return []
  return Object.entries(dmg)
    .map(([key, range]) => {
      const [min, max] = range
      const element = ELEMENT_FOR_DAMAGE[key] ?? 'neutral'
      const text = min === max ? String(min) : `${min}-${max}`
      return { element, text }
    })
    .sort((a, b) => ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element))
})

interface DefenceLine { element: string, value: string }
const defenceLines = computed<DefenceLine[]>(() => {
  const def = crafted.value?.defenses
  if (!def)
    return []
  return Object.entries(def)
    .filter(([, v]) => v !== 0)
    .map(([key, v]) => ({
      element: ELEMENT_FOR_DEFENSE[key] ?? '',
      value: `${v > 0 ? '+' : ''}${v}`,
    }))
    .sort((a, b) => ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element))
})

interface IdRow { label: string, left: string, right: string, color: string }
const idRows = computed<IdRow[]>(() => {
  const ids = crafted.value?.identifications
  if (!ids)
    return []
  return Object.entries(ids).map(([key, r]: [string, IdRange]) => {
    const { label, unit } = humanizeField(key)
    // "good" direction: positive for normal ids; inverted (cost) is good when negative.
    const refVal = r.max // use max as representative for sign direction
    const good = isInverted(key) ? refVal < 0 : refVal > 0
    const color = good ? ID_GOOD_COLOR : ID_BAD_COLOR
    const fmt = (n: number) => `${n > 0 ? '+' : ''}${n}${unit}`
    if (r.min === r.max)
      return { label, left: '', right: fmt(r.min), color }
    return { label, left: fmt(r.min), right: fmt(r.max), color }
  })
})

interface ReqRow { label: string, value: number }
const reqRows = computed<ReqRow[]>(() => {
  const c = crafted.value
  if (!c)
    return []
  const out: ReqRow[] = []
  if (!isConsumable.value) {
    for (const [key, v] of Object.entries(c.reqs)) {
      if (v <= 0)
        continue
      const label = SKP_REQ_LABEL[key] ?? key
      out.push({ label, value: v })
    }
  }
  return out
})

const atkSpdText = computed(() => {
  const c = crafted.value
  if (!c || !isWeapon.value)
    return null
  return attackSpeedLabel(c.atkSpd ?? 'normal')
})

const hpText = computed(() => {
  const c = crafted.value
  if (!c?.hp)
    return null
  const [min, max] = c.hp
  return min === max ? `+${min}` : `+${min} to +${max}`
})

const durationText = computed(() => {
  const c = crafted.value
  if (!c?.duration)
    return null
  const [min, max] = c.duration
  return min === max ? `${min}s` : `${min}-${max}s`
})

function sepStyle() {
  return {
    maskImage: `url(${miscUrl('line')})`,
    WebkitMaskImage: `url(${miscUrl('line')})`,
    background: theme.value.light,
  }
}

// Show the equip button when:
//   - standalone crafter (no hideEquipButton, no onEquip): button shown but disabled (legacy "coming soon")
//   - embedded crafter (onEquip provided): button shown and active, wired to the supplied callback
const showEquipButton = computed(() => {
  if (props.onEquip)
    return crafted.value !== null && !isConsumable.value
  return !props.hideEquipButton && !isConsumable.value && crafted.value !== null
})

const equipButtonLabel = computed(() => props.onEquip ? 'Equip in this slot' : 'Equip in builder')
const equipButtonDisabled = computed(() => !props.onEquip || !!props.equipDisabledReason)
const equipButtonTitle = computed(() => {
  if (props.equipDisabledReason)
    return props.equipDisabledReason
  if (!props.onEquip)
    return 'Coming soon — open the builder and use the item picker to equip a craft'
  return ''
})

function handleEquipClick() {
  if (equipButtonDisabled.value)
    return
  props.onEquip?.()
}
</script>

<template>
  <div v-if="!crafted" class="cp-placeholder">
    <p>Configure your craft to see the result.</p>
  </div>
  <div v-else class="tt-container">
    <div class="tt-frame" :style="frameStyle" />
    <div class="tt-inner" :style="innerStyle">
      <!-- Header -->
      <div class="tt-header">
        <div class="tt-emblemwrap">
          <img v-if="icon" :src="icon" class="tt-sprite" alt="" aria-hidden="true">
        </div>
        <div class="tt-headtext">
          <span class="tt-name" :style="{ color: theme.color }">{{ crafted.hash }}</span>
          <div class="tt-tags">
            <span class="tt-tag" :style="{ background: theme.color }">{{ crafted.tier.toLowerCase() }}</span>
            <span class="tt-tag" :style="{ background: theme.light }">{{ crafted.type.toLowerCase() }}</span>
          </div>
        </div>
      </div>

      <!-- Weapon: attack speed + damage ranges -->
      <template v-if="isWeapon">
        <div v-if="atkSpdText" class="tt-row">
          <img :src="attributeUrl('attack_speed')" class="tt-attr" alt="" aria-hidden="true">
          <span class="tt-muted">{{ atkSpdText }} Attack Speed</span>
        </div>
        <div v-if="damageLines.length" class="tt-dmg">
          <span v-for="(d, i) in damageLines" :key="i" class="tt-dmg-item">
            <img :src="attributeUrl(d.element)" class="tt-attr" alt="" aria-hidden="true">
            <span class="tt-muted">{{ d.text }}</span>
          </span>
        </div>
      </template>

      <!-- Armor: hp range + flat defenses -->
      <template v-else-if="isArmor">
        <p v-if="hpText" class="tt-dps">
          <span :style="{ color: theme.light }">{{ hpText }}</span>
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

      <!-- Consumable: duration + charges -->
      <template v-else-if="isConsumable">
        <div v-if="durationText" class="tt-row">
          <span class="tt-muted">Duration: {{ durationText }}</span>
        </div>
        <div v-if="crafted.charges != null" class="tt-row">
          <span class="tt-muted">Charges: {{ crafted.charges }}</span>
        </div>
      </template>

      <!-- Powder slots (weapons + armor) -->
      <p v-if="(isWeapon || isArmor) && crafted.slots > 0" class="tt-row tt-muted">
        Powder Slots [{{ 'o'.repeat(crafted.slots) }}]
      </p>

      <div class="tt-sep" :style="sepStyle()" />

      <!-- Requirements -->
      <div class="tt-meta">
        <div class="tt-meta-row">
          <span class="tt-meta-label">
            <img :src="miscUrl('check')" class="tt-check" alt="" aria-hidden="true">
            Combat Level
          </span>
          <span class="tt-muted">{{ crafted.lvlLow === crafted.lvl ? crafted.lvl : `${crafted.lvlLow}-${crafted.lvl}` }}</span>
        </div>
        <div v-for="r in reqRows" :key="r.label" class="tt-meta-row">
          <span class="tt-meta-label">
            <img :src="miscUrl('check')" class="tt-check" alt="" aria-hidden="true">
            {{ r.label }}
          </span>
          <span class="tt-muted">{{ r.value }}</span>
        </div>
      </div>

      <div v-if="idRows.length" class="tt-sep" :style="sepStyle()" />

      <!-- Identifications: ranges -->
      <ul v-if="idRows.length" class="tt-ids">
        <li v-for="row in idRows" :key="row.label" class="tt-id">
          <span class="tt-id-left" :style="{ color: row.color }">{{ row.left }}</span>
          <span class="tt-id-name">{{ row.label }}</span>
          <span class="tt-id-right" :style="{ color: row.color }">{{ row.right }}</span>
        </li>
      </ul>

      <!-- Equip in builder -->
      <div v-if="showEquipButton" class="cp-actions">
        <button
          type="button"
          class="cp-equip-btn"
          :disabled="equipButtonDisabled"
          :title="equipButtonTitle"
          @click="handleEquipClick"
        >
          {{ equipButtonLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cp-placeholder {
  padding: var(--spacing, 1rem);
  color: var(--muted);
  font-size: 0.95rem;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: var(--surface);
  text-align: center;
}

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
  font-size: 22px;
  line-height: 1;
  text-shadow: 3px 3px 0 rgb(0 0 0 / 0.45);
  word-break: break-all;
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

/* Base lines */
.tt-dps {
  margin: 6px 0 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.tt-dps span:first-child {
  font-size: 28px;
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

/* Requirements */
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
.tt-check {
  width: 22px;
  height: 18px;
  image-rendering: pixelated;
  object-fit: contain;
}

/* Identifications */
.tt-ids {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
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

/* Equip-in-builder action */
.cp-actions {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}
.cp-equip-btn {
  font-family: inherit;
  font-size: 16px;
  padding: 6px 14px;
  background: var(--surface-hi);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: not-allowed;
  opacity: 0.6;
}
.cp-equip-btn:not(:disabled) {
  cursor: pointer;
  opacity: 1;
}
.cp-equip-btn:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
