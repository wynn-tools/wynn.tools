# Contributing to wynn.tools

wynn.tools is a community-built tool hub for Wynncraft players. Contributions are welcome from anyone.

> **Data contributions** (items, map POIs, lootrun routes) live in a separate repo. This repo is for the web app only.

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Git

## Getting started

```bash
git clone https://github.com/wynn-tools/wynn.tools
cd wynn.tools
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:3000`.

## Branch naming

| Prefix   | Use for                    |
| -------- | -------------------------- |
| `feat/`  | New features               |
| `fix/`   | Bug fixes                  |
| `chore/` | Maintenance, deps, tooling |
| `docs/`  | Documentation only         |

## DCO sign-off

This project uses a [Developer Certificate of Origin (DCO)](https://developercertificate.org/) instead of a CLA. Add a sign-off to every commit:

```bash
git commit -s -m "feat: add thing"
```

This appends `Signed-off-by: Your Name <your@email.com>` to the commit message. CI will reject commits without it.

If you forgot to sign off on a previous commit, amend it:

```bash
git commit --amend -s
```

## Making a pull request

1. Fork the repo and create a branch from `main` using the naming convention above
2. Make your changes — Husky runs `pnpm lint:fix` automatically on commit
3. Run `pnpm test:run` locally before marking ready
4. Open a draft PR, then mark it ready when complete
5. One approval from a maintainer is required to merge

## Questions?

Ask in the [wynn.tools Discord](https://discord.gg/tKPdvKdfJq).
