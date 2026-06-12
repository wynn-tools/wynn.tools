# @wynn.tools/api

Backend for wynn.tools — see the root `CLAUDE.md` for the full architecture and command reference.

## Scheduled tasks

- Anonymous Wynndle rounds older than 30 days are pruned daily at 03:00 UTC via `pnpm prune:wynndle` ([details](../.github/workflows/prune-anon-wynndle.yml)).
- Orphan stock blobs (refCount=0, older than 24h) are reaped via `pnpm stock:gc` — schedule nightly (e.g., cron at 03:00 UTC).

## Stock platform deployment

- Invite the bot to the Wynntils guild (`394189072635133952`) with `CREATE_PUBLIC_THREADS` and `SEND_MESSAGES_IN_THREADS` on the `#function-stock` forum channel (`1257262198510850069`). Set `DISCORD_FUNCTION_STOCK_CHANNEL_ID` to that channel id.
- Create a `#stock-moderation` channel in the wynn.tools guild (`1507798652654190622`) with a webhook; put its URL in `DISCORD_STOCK_MOD_WEBHOOK_URL`.
- Ensure `UPLOAD_DIR` points at a backed-up volume.
