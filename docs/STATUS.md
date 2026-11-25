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
- Production Worker: https://change-ripple.leola.workers.dev — healthz 200, `/` `/docs` `/privacy` `/terms` `/icon.svg` 200, MCP initialize + tools/list (9 tools). Connector: `https://change-ripple.leola.workers.dev/mcp`.

## Next
- Human: add https://change-ripple.leola.workers.dev/mcp as a Claude custom connector (no sign-in), enable it in a chat, run DEMO-PROMPTS (H1).
- Playwright UI harness (T4) — NOT RUN.
- Invite collaborators (repo is private) or make it public.

## Blocked
- Claude rendering, tool visibility, and `_meta` handling: NOT VERIFIED until H1.

## Human action needed
1. In Claude: Customize → Connectors → Add custom connector → `https://change-ripple.leola.workers.dev/mcp`, no sign-in. Enable it in a new chat. Paste prompt 1 from `docs/DEMO-PROMPTS.md`.
2. Report whether the board renders, whether decision tools are hidden from the model, and whether `_meta.reviewToken` stays off-screen.

## Not verified
- Full production scenario replay (T5) beyond healthz, static pages, and MCP initialize.
- Behaviour inside Claude (tool visibility, `_meta`, UI rendering).
- Playwright board harness (T4).
- Confidential-term scan (CONFIDENTIAL_TERMS_FILE unset: SKIPPED).
