# scripts

Operational helpers (not part of the app build).

## post-changelog.mjs

Posts changelog entries to the Discord `#changelog` channel as Components V2
messages (each entry becomes a brand-accent Container with an optional preview
image and link button).

```bash
# preview without posting
node scripts/post-changelog.mjs --dry-run scripts/changelog.example.json

# post for real
node scripts/post-changelog.mjs path/to/entries.json
```

- **Entries file**: a JSON array of objects. Required fields:
  - `title` — short headline (shown as `## H2` in the container).
  - `description` — Discord markdown; use `\n` for line breaks.

  Optional fields:
  - `image` — preview image, shown between description and button. Either a
    path (relative to the entries file, or absolute) for a local upload, or a
    full `http(s)://` URL to embed by reference. Supported extensions: `png`,
    `jpg`/`jpeg`, `gif`, `webp`.
  - `link` — call-to-action URL or path. Paths starting with `/` are prefixed
    with `https://wynn.tools`. Renders as a link button below the entry.
  - `linkLabel` — button text (defaults to `"Open"`).
  - `color` — integer accent color, overrides the brand blue per entry.

- **Ordering**: entries post top-to-bottom. Discord shows the newest message at
  the bottom, so list your **oldest** entry first and **newest** last for the
  feed to read chronologically.
- **Auth**: the bot token is read from `api/.env` (`DISCORD_TOKEN`). The channel
  is resolved by name in the wynn.tools guild, so it keeps working if the
  channel is ever recreated.
- Keep entries feature-level and concise — one line of "what changed and why it
  matters", not commit-level detail.
- The example file lives at `changelog.example.json`. Per-release entry files
  (e.g. `changelog.inspect.json`) are convention-untracked.
