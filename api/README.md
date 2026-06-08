# @wynn.tools/api

Backend for wynn.tools — see the root `CLAUDE.md` for the full architecture and command reference.

## Scheduled tasks

- Anonymous Wynndle rounds older than 30 days are pruned daily at 03:00 UTC via `pnpm prune:wynndle` ([details](../.github/workflows/prune-anon-wynndle.yml)).
