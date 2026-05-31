<script setup lang="ts">
// Required by WynnVentory API terms: visible attribution wherever price data renders.
</script>

<template>
  <a
    class="attribution"
    href="https://wynnventory.com"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Powered by WynnVentory (opens in new tab)"
  >Powered by WynnVentory</a>
</template>

<style scoped>
.attribution {
  font-size: 0.7rem;
  color: var(--color-muted);
  text-decoration: none;
}
.attribution:hover {
  text-decoration: underline;
}
</style>
