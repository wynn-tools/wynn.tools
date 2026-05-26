<template>
  <main class="mx-5">
    <h1 class="domain">
      wynn<span class="dot">.</span>tools
    </h1>

    <ul class="tool-list" role="list">
      <li>
        <NuxtLink to="/builder" class="tool-link">
          <span class="tool-name">Builder</span>
          <span class="tool-arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/map" class="tool-link">
          <span class="tool-name">Map</span>
          <span class="tool-arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </li>
      <li class="tool-soon" aria-label="Crafter, coming soon">
        <span class="tool-name">Crafter</span>
        <span class="tool-status">coming soon</span>
      </li>
      <li class="tool-soon" aria-label="Atlas, coming soon">
        <span class="tool-name">Atlas</span>
        <span class="tool-status">coming soon</span>
      </li>
    </ul>
  </main>

  <footer>
    <span class="footer-note">AGPL-3.0 · Not affiliated with Wynncraft or Mojang</span>
  </footer>
</template>

<style scoped>
main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 600px;
  padding: 80px 0;
}

.domain {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: clamp(36px, 7vw, 68px);
  font-weight: 500;
  letter-spacing: -0.025em;
  line-height: 1;
  margin-bottom: 48px;
}

.domain .dot {
  color: var(--color-copper);
}

.tool-list {
  list-style: none;
}

.tool-link {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
  text-decoration: none;
  color: var(--color-muted);
  transition: color 0.12s ease-out;
}

.tool-list li:first-child > .tool-link,
.tool-list li:first-child.tool-soon {
  border-top: 1px solid var(--color-border);
}

.tool-link:hover {
  color: var(--color-text);
}

.tool-link:hover .tool-arrow {
  color: var(--color-copper);
  transform: translateX(2px);
}

.tool-link:focus-visible {
  outline: 1px solid var(--color-copper);
  outline-offset: 4px;
  border-radius: 2px;
  color: var(--color-text);
}

.tool-name {
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0.01em;
  flex: 1;
}

.tool-arrow {
  font-size: 14px;
  color: var(--color-faint);
  transition:
    color 0.12s ease-out,
    transform 0.12s ease-out;
}

.tool-soon {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
  cursor: default;
}

.tool-soon .tool-name {
  color: var(--color-faint);
}

.tool-status {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-faint);
}

footer {
  padding: 20px 0;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-note {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-faint);
}

@media (max-width: 480px) {
  main {
    padding: 64px 0;
  }
}
</style>
