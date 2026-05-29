# wynn.tools API — deployment

## First run

1. Point DNS: `api.wynn.tools` → this server. In Cloudflare set the record to **Proxied** (orange cloud) with SSL mode **Full (strict)**.
2. Create `deploy/.env`:

   ```bash
   POSTGRES_USER=wynn
   POSTGRES_PASSWORD=<strong-password>
   POSTGRES_DB=wynn
   DATABASE_URL=postgres://wynn:<strong-password>@postgres:5432/wynn
   DISCORD_CLIENT_ID=<from discord dev portal>
   DISCORD_CLIENT_SECRET=<from discord dev portal>
   DISCORD_REDIRECT_URI=https://api.wynn.tools/v1/auth/discord/callback
   FRONTEND_URL=https://wynn.tools
   COOKIE_DOMAIN=.wynn.tools
   CDN_BASE_URL=https://cdn.wynn.tools/
   PORT=8080
   ```

3. In the Discord developer portal, add the redirect URI above.
4. `cd deploy && docker compose up -d --build`

Migrations run automatically on the api container's start command.

## Backups

```bash
docker compose exec postgres pg_dump -U wynn wynn > backup-$(date +%F).sql
```

Schedule via cron on the host.

## Logs / restart

```bash
docker compose logs -f api
docker compose restart api
```
