<script setup lang="ts">
import { useMapStore } from '~/stores/map'

const store = useMapStore()
</script>

<template>
  <MapNavBtn :active="store.showTerritories" @click="store.toggleTerritories()">
    Territories
  </MapNavBtn>
</template>
