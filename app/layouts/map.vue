<template>
  <slot />
</template>

<style>
@import 'leaflet/dist/leaflet.css';

body {
  padding: 0;
}

.leaflet-container {
  background: var(--color-bg);
  outline: none;
}

.leaflet-control-zoom {
  display: none;
}
</style>
