# Status

Updated: 2026-11-25.

## Done
- Product lives at `change-ripple/` inside the private input folder. Git is only in this folder.
- Domain logic: duration mentions, checks (all fixture cases), impact, state machine, release.
- Worker: 9 MCP tools, SQLite Durable Objects, limiter, static pages, board HTML resource.
- Local tests: 73 passing (unit, hygiene, MCP integration scenario, security).
- Typecheck and lint pass. UI bundled (~674 KB, under 900 KB).

## Next
- Playwright UI harness (T4) — NOT RUN.
- Cloudflare login and deploy, then in-Claude check (H1).
- Private GitHub remote named `change-ripple`.

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
