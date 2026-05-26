<template>
  <main>
    <h1 class="domain">
      wynn<span class="dot">.</span>tools
    </h1>
    <p class="tools">
      Builder, Map, Crafter, Atlas.
    </p>
    <p class="status">
      In development
    </p>
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
  margin-bottom: 32px;
}

.domain .dot {
  color: var(--color-copper);
}

.tools {
  font-size: 15px;
  color: var(--color-muted);
  font-weight: 400;
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}

.status {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-bottom: 52px;
}

.links {
  display: flex;
  align-items: center;
  gap: 20px;
  list-style: none;
}

.links li {
  display: flex;
  align-items: center;
  gap: 20px;
}

.sep {
  color: var(--color-faint);
  font-size: 12px;
  user-select: none;
}

.links a {
  font-size: 14px;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.12s ease-out;
}

.links a:hover {
  color: var(--color-text);
}

.links a:focus-visible {
  outline: 1px solid var(--color-copper);
  outline-offset: 4px;
  border-radius: 2px;
  color: var(--color-text);
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

.footer-link {
  font-size: 11px;
  color: var(--color-faint);
  text-decoration: none;
  transition: color 0.12s ease-out;
}

.footer-link:hover {
  color: var(--color-muted);
}

@media (max-width: 480px) {
  main {
    padding: 64px 0;
  }
  .links {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
  .sep {
    display: none;
  }
}
</style>
