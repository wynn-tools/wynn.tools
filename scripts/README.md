# scripts

Operational helpers (not part of the app build).

## post-changelog.mjs

Posts changelog entries as embeds to the Discord `#changelog` channel.

```bash
# preview without posting
node scripts/post-changelog.mjs --dry-run scripts/changelog.example.json

# post for real
node scripts/post-changelog.mjs path/to/entries.json
```

- **Entries file**: a JSON array of `{ "title", "description" }` objects. An
  optional `color` (integer) overrides the brand-blue default per entry.
  `description` supports Discord markdown; use `\n` for line breaks.
- **Ordering**: entries post top-to-bottom. Discord shows the newest message at
  the bottom, so list your **oldest** entry first and **newest** last for the
  feed to read chronologically.
- **Auth**: the bot token is read from `api/.env` (`DISCORD_TOKEN`). The channel
  is resolved by name in the wynn.tools guild, so it keeps working if the
  channel is ever recreated.
- Keep entries feature-level and concise — one line of "what changed and why it
  matters", not commit-level detail.
