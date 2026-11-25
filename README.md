# Change Ripple

**Client:** Maison Aube, a fictional skincare brand selling in six markets.
**For:** its content and local-market teams.
**Job:** when a product claim changes, find the affected copy, redraft it in Claude, and get each version reviewed before release.
**Why it is worth their time:** Claude can already rewrite copy. Change Ripple keeps the list of what must change (including untagged mentions), runs the same rule checks every time, keeps status between conversations, and ties each decision to the exact text reviewed. Time saved has not been measured.

**Connector URL:** https://change-ripple.leola.workers.dev/mcp · **Repo:** https://github.com/leopoldlacroix/change-ripple · [Install (Claude)](docs/INSTALL.md) · [Run locally](docs/DEV.md) · [Three prompts](docs/DEMO-PROMPTS.md) · [Listing](docs/LISTING.md)

## Where the human stays

Claude proposes. A person approves, edits or rejects one version at a time in the board. Failed checks block approval; changed text cancels it. **Approvals are simulated:** there is no sign-in, so the app cannot prove who decided. Whether Claude hides the decision tools from the model is **not verified** (needs a public connector in Claude).

## What it does

Nine MCP tools on `POST /mcp`. `start_demo_workspace` copies the Maison Aube sample into an isolated sandbox (24 assets; claim `hydration_duration` is 48 hours; only 24 hours is an approved new value). Preview maps impact without writing. Open marks affected assets stale. Drafts are stored and checked (hours mention, length, required footnote, banned phrases, no markup). A review board lists old vs new; release is `NO_OPEN_CHANGE` / `BLOCKED` / `WAITING` / `READY`. Data lives in one SQLite Durable Object per workspace, plus a daily-create limiter. Connecting clients receive a briefing (initialize `instructions`, also `docs://change-ripple/briefing.md`).

## Choices

- The job is the gap after Claude can already rewrite: registry, impact, checks, persistence, a human decision.
- Rules in code, language in Claude: no model call or API key on the server.
- Only evidence-listed claim values can be opened.
- No sign-in, so a team can try it at once; sandboxes are isolated, expire after 7 days, and take fictional data only.
- Stack: TypeScript, Cloudflare Workers, SQLite Durable Objects, MCP Streamable HTTP. Cut vs a richer UI: no word-level diff (old and new sit side by side instead).

## With one more day

OAuth and reviewer roles; import claims and assets from the brand’s own system; more claim types than a numeric duration; a second-opinion review for meaning, shown as advice only; pilot metrics.

## Limits

Checks do not judge meaning, translation quality or legal compliance. Spelled-out durations (“two days”) are not blocked. Only a numeric hours claim is supported. Anyone with a workspace ID can access that sandbox. Not production-ready.

## Run and test

Node 20+. Full commands and Cursor / Inspector setup: [docs/DEV.md](docs/DEV.md).

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run dev
```

Then MCP is `http://127.0.0.1:8787/mcp`. This repo’s `.cursor/mcp.json` points there. `npm test` currently: 75 passing (domain, MCP scenario against local Wrangler, security, hygiene, briefing). Playwright board harness: **NOT RUN**.

How the pieces fit: [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md). What to say on the three prompts: [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md). Claude custom connectors cannot use localhost; they need a public HTTPS URL on port 443.

## Deploy

Needs a Cloudflare account. In this directory:

```bash
npx wrangler login
npm run deploy
```

Use the printed `*.workers.dev` origin plus `/mcp` as the connector URL. Details: [docs/DEV.md](docs/DEV.md#deploy-optional).

## How this was built

Time spent: not measured as a single clock. AI agents: Cursor agents wrote most of the implementation and docs. Verified: local Worker plus production `https://change-ripple.leola.workers.dev` (healthz, static pages, MCP initialize and tools/list). Not verified: full production scenario, Claude iframe / tool visibility / `_meta`, Playwright board harness, confidential-term scan.

All brand data is fictional. No affiliation with any real company using a similar name.
