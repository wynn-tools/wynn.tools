<script setup lang="ts">
import type { DamageRange } from '~/lib/data/cdn-adapter/item-adapter'
import type { SearchItem } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { attributeUrl, emblemUrl, itemIconUrl, spriteUrl } from '~/lib/items/icon'
import {
  attackSpeedLabel,
  baseStatMeta,
  ID_BAD_COLOR,
  ID_GOOD_COLOR,
  idIsGood,
  TIER_COLORS,
} from '~/lib/items/tooltip'

const props = defineProps<{ item: SearchItem }>()

const SKILLS = ['strength', 'dexterity', 'intelligence', 'defence', 'agility'] as const

const tierColor = computed(() => TIER_COLORS[props.item.tier] ?? '#ffffff')
const icon = computed(() => itemIconUrl(props.item) ?? spriteUrl(props.item.subType))
const emblem = computed(() => emblemUrl(props.item.emblem))
const isWeapon = computed(() => props.item.type === 'weapon')

function rangeText(v: DamageRange | number): string {
  if (typeof v === 'number')
    return String(v)
  return v.min === v.max ? String(v.raw) : `${v.min}-${v.max}`
}

interface BaseLine { label: string, iconUrl: string | null, text: string }
const baseLines = computed<BaseLine[]>(() =>
  Object.entries(props.item.base).map(([key, value]) => {
    const meta = baseStatMeta(key)
    return {
      label: meta.label,
      iconUrl: meta.element ? attributeUrl(meta.element) : null,
      text: rangeText(value),
    }
  }),
)

interface ReqRow { label: string, value: string }
const reqRows = computed<ReqRow[]>(() => {
  const rows: ReqRow[] = []
  const r = props.item.requirements
  if (r?.classRequirement)
    rows.push({ label: 'Class Req', value: r.classRequirement.charAt(0).toUpperCase() + r.classRequirement.slice(1) })
  rows.push({ label: 'Combat Level', value: String(r?.level ?? props.item.level) })
  for (const skill of SKILLS) {
    const v = (r as Record<string, number> | undefined)?.[skill] ?? 0
    if (v > 0)
      rows.push({ label: `${skill.charAt(0).toUpperCase()}${skill.slice(1)} Min`, value: String(v) })
  }
  return rows
})

interface IdRow { label: string, left: string, right: string, color: string }
const idRows = computed<IdRow[]>(() =>
  Object.entries(props.item.identifications).map(([key, r]) => {
    const { label, unit } = humanizeField(key)
    const good = idIsGood(r.raw, isInverted(key))
    const color = good ? ID_GOOD_COLOR : ID_BAD_COLOR
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

const loreText = computed(() => props.item.lore?.map(n => n.text).join('') ?? '')
</script>

<template>
  <div class="tt">
    <div class="tt-iconwrap">
      <img v-if="emblem" :src="emblem" class="tt-emblem" alt="" aria-hidden="true">
      <img v-if="icon" :src="icon" class="tt-icon" alt="" aria-hidden="true">
    </div>

    <h2 class="tt-name" :style="{ color: tierColor }">
      {{ item.displayName }}
    </h2>
    <div class="tt-tag" :style="{ background: tierColor }">
      {{ item.tier }} Item
    </div>

    <p v-if="isWeapon && item.attackSpeed" class="tt-line tt-muted">
      {{ attackSpeedLabel(item.attackSpeed) }} Attack Speed
    </p>

    <p v-for="line in baseLines" :key="line.label" class="tt-line tt-base">
      <img v-if="line.iconUrl" :src="line.iconUrl" class="tt-attr" alt="" aria-hidden="true">
      <span class="tt-muted">{{ line.label }}</span>
      <span class="tt-base-val">{{ line.text }}</span>
    </p>

    <p v-if="isWeapon && item.averageDps != null" class="tt-line tt-dps">
      Average DPS {{ item.averageDps }}
    </p>

    <div class="tt-reqs">
      <p v-for="row in reqRows" :key="row.label" class="tt-req">
        <span class="tt-muted">{{ row.label }}:</span> {{ row.value }}
      </p>
    </div>

    <div v-if="idRows.length" class="tt-sep" />

    <ul v-if="idRows.length" class="tt-ids">
      <li v-for="row in idRows" :key="row.label" class="tt-id">
        <span class="tt-id-left" :style="{ color: row.color }">{{ row.left }}</span>
        <span class="tt-id-name">{{ row.label }}</span>
        <span class="tt-id-right" :style="{ color: row.color }">{{ row.right }}</span>
      </li>
    </ul>

    <div v-if="majorIds.length" class="tt-majors">
      <p v-for="m in majorIds" :key="m.name" class="tt-major">
        <span class="tt-major-name" :style="{ color: tierColor }">{{ m.name }}:</span>
        <span class="tt-muted"> {{ m.text }}</span>
      </p>
    </div>

    <p v-if="item.powderSlots" class="tt-line tt-muted">
      Powder Slots [{{ 'o'.repeat(item.powderSlots) }}]
    </p>

    <p v-if="loreText" class="tt-lore">
      {{ loreText }}
    </p>
  </div>
</template>

<style scoped>
.tt {
  font-family: 'wynn-default', var(--font-mono);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 18px 20px;
  width: 360px;
  max-width: 100%;
  color: #fcfcfc;
  text-align: center;
}
.tt-iconwrap {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto 6px;
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
}
.tt-icon {
  position: relative;
  width: 52px;
  height: 52px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-name {
  font-size: 26px;
  font-weight: 600;
  margin: 0;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.4);
}
.tt-tag {
  display: inline-block;
  margin: 8px auto 0;
  padding: 2px 14px;
  border-radius: 999px;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 600;
}
.tt-line {
  margin: 8px 0 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.tt-muted {
  color: #aeaeae;
}
.tt-attr {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-base-val {
  color: #fcfcfc;
}
.tt-dps {
  font-size: 17px;
  font-weight: 600;
}
.tt-reqs {
  margin-top: 12px;
  text-align: left;
}
.tt-req {
  margin: 2px 0;
  font-size: 14px;
  color: #fcfcfc;
}
.tt-sep {
  height: 1px;
  background: var(--color-border);
  margin: 14px 0;
}
.tt-ids {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tt-id {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: baseline;
  gap: 12px;
  font-size: 15px;
}
.tt-id-left {
  text-align: left;
}
.tt-id-name {
  color: #d6d6d6;
  text-align: center;
  white-space: nowrap;
}
.tt-id-right {
  text-align: right;
}
.tt-majors {
  margin-top: 14px;
  text-align: left;
}
.tt-major {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.4;
}
.tt-major-name {
  font-weight: 600;
}
.tt-lore {
  margin-top: 14px;
  color: #888;
  font-style: italic;
  font-size: 13px;
  text-align: left;
}
</style>
