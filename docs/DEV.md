# Run Change Ripple on your machine

For developers. Claude users add a public HTTPS `/mcp` URL instead; see [INSTALL.md](INSTALL.md).

## Prerequisites

- Node.js 20 or newer
- npm (comes with Node)
- A terminal. No Cloudflare account, API key, or Claude account is required to run locally.

## Install and check

The GitHub repo is **private**. You need an invite, or HTTPS with a token the owner gave you.

```bash
git clone git@github.com:leopoldlacroix/change-ripple.git
# or: git clone https://github.com/leopoldlacroix/change-ripple.git
cd change-ripple
npm install
npm test
npm run typecheck
npm run lint
```

`npm test` runs domain, MCP integration, security, and hygiene tests against a local Worker. The Playwright board harness is **NOT RUN** in that command. Do not treat Playwright as passing unless you ran it and watched it.

## Start the server

```bash
npm run dev
```

Wait until Wrangler prints `Ready on http://localhost:8787`.

| URL | What |
|---|---|
| http://127.0.0.1:8787/ | What it is |
| http://127.0.0.1:8787/docs | Install notes |
| http://127.0.0.1:8787/healthz | `{"version":"0.1.0",...}` |
| http://127.0.0.1:8787/mcp | MCP endpoint (POST, Streamable HTTP) |

Local Durable Object files live under `.wrangler/` (gitignored). Deleting that folder wipes sandboxes.

## Talk to it

Keep the Worker running. Then pick one client.

### Cursor

This repo already has `.cursor/mcp.json` pointing at `http://127.0.0.1:8787/mcp`. Enable **change-ripple** in Cursor Settings → MCP. On connect, the server sends **instructions**: product, initial seed, and the expected three-step flow. Re-read them as resource `docs://change-ripple/briefing.md`.

Paste the prompts in [DEMO-PROMPTS.md](DEMO-PROMPTS.md). The agent should follow [WALKTHROUGH.md](WALKTHROUGH.md) (narrate; reuse one `workspaceId`).

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector --server-url http://127.0.0.1:8787/mcp --transport http
```

Open the printed URL. Call `start_demo_workspace`, copy `workspaceId`, then the later tools. Step-by-step: [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

You will see text results, not Claude’s review-board iframe.

## What you should see (first workspace)

After `start_demo_workspace`: 24 assets, claim `hydration_duration` = 48 hours, only approved new value = 24. `get_release_status` is `NO_OPEN_CHANGE`.

After `preview_claim_change` with `newValue: 24`: 20 of 24 affected; still `NO_OPEN_CHANGE`.

Do not call `start_demo_workspace` for every prompt. Reuse the ID. Sandboxes last 7 days.

## Deploy (optional)

Localhost cannot be a Claude custom connector. Claude needs a public HTTPS URL on port 443.

1. A Cloudflare account (free plan is enough for this demo).
2. In this folder: `npx wrangler login` (browser). Do not paste a token into chat or into the repo.
3. `npm run deploy`
4. This deployment: https://change-ripple.leola.workers.dev — MCP is `/mcp`.
5. Add that MCP URL in Claude: Customize → Connectors → Add custom connector, no sign-in. After changing the Worker, run `npm run deploy` again.

Workers on the free plan: Durable Objects and SQLite are required (already in `wrangler.toml`). Quota limits apply; the demo also caps 500 new workspaces per UTC day.

## Limits

Fictional data only. Anyone with a `workspaceId` can use that sandbox. Checks are mechanical (hours, length, footnotes, banned phrases), not legal review. Approvals are simulated (no login).
