<script setup lang="ts">
// TEMPORARY preview harness for the OG card. Delete after verifying.
import OgImageBuildCard from '~/components/OgImage/BuildCard.takumi.vue'

definePageMeta({ layout: false })
const sample = {
  level: 106,
  className: 'Mage',
  dps: 1840,
  ehp: 38210,
  items: [
    { slot: 'Weapon', name: 'Fatal', tier: 'Mythic', powders: 'TTT' },
    { slot: 'Helmet', name: 'Morph-Stardust', tier: 'Fabled' },
    { slot: 'Chestplate', name: 'Aphotic', tier: 'Legendary', powders: 'WWW' },
    { slot: 'Leggings', name: 'Boreal', tier: 'Rare' },
    { slot: 'Boots', name: 'Resurgence', tier: 'Mythic' },
    { slot: 'Ring 1', name: 'Diamond Hydro Ring', tier: 'Unique' },
    { slot: 'Ring 2', name: 'Moon Pool Circlet', tier: 'Legendary' },
    { slot: 'Bracelet', name: 'Prowess', tier: 'Rare' },
    { slot: 'Necklace', name: 'Aquamarine', tier: 'Set' },
  ],
}
</script>

<template>
  <div style="width: 1200px; height: 600px;">
    <OgImageBuildCard v-bind="sample" />
  </div>
</template>
