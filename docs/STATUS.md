# Status

Updated: 2026-11-25.

## Done
- `docs/HOW-IT-WORKS.md`: MCP/workspace/tool map and Inspector walkthrough (no Claude required).
- `docs/WALKTHROUGH.md`: what a new agent should call and say for the three demo prompts (impact → bad draft → release).
- MCP initialize `instructions` plus resource `docs://change-ripple/briefing.md`: job, seed (48 h, 24 assets, `NO_OPEN_CHANGE`), expected flow.
- `docs/DEV.md` and README: clone, test, Cursor/Inspector, Cloudflare deploy steps.
- Cursor MCP: `.cursor/mcp.json` points at `http://127.0.0.1:8787/mcp` (needs `npm run dev`). The parent Cursor window also has a copy of that file so this workspace can enable the server.

- Product lives at `change-ripple/` inside the private input folder. Git is only in this folder.
- Domain logic: duration mentions, checks (all fixture cases), impact, state machine, release.
- Worker: 9 MCP tools, SQLite Durable Objects, limiter, static pages, board HTML resource.
- Local tests: 75 passing (unit, hygiene, MCP integration scenario, security). Briefing resource and initialize-copy checks included.
- Typecheck and lint pass. UI bundled (~674 KB, under 900 KB).
- Live MCP smoke (Cursor agent as client, no iframe): start → preview 20/24 → open → bad DE draft `MISSING_DISCLAIMER` → good draft `pending_review` → approve one → release `BLOCKED`. Workspace `ws_06BHIQLjIivr5085x748UA`.

## Next
- Enable the **change-ripple** MCP server in Cursor Settings if tools are not listed, then run DEMO-PROMPTS with the agent.
- Playwright UI harness (T4) — NOT RUN.
- Cloudflare login and deploy, then in-Claude check (H1).
- Push `main` to a GitHub remote named `change-ripple` (human: `gh` login if needed).

## Blocked
- Deploy needs `npx wrangler login` (or `CLOUDFLARE_API_TOKEN` in the environment). Not needed for local tests.
- Claude rendering, tool visibility, and `_meta` handling: NOT VERIFIED until H1.

## Human action needed
1. Local check: `cd change-ripple && npm test` and `npm run dev`, then exercise `/mcp` (see README).
2. When ready to deploy: `npx wrangler login` in a terminal on this machine. Do not paste a token into chat.
3. Create a private GitHub repo `change-ripple` for `origin`.
4. Claude custom-connector slot for H1 after a public URL exists.

## Not verified
- Production deploy.
- Behaviour inside Claude (tool visibility, `_meta`, UI rendering).
- Playwright board harness (T4).
- Confidential-term scan (CONFIDENTIAL_TERMS_FILE unset: SKIPPED).
