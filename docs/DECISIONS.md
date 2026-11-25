# Decisions

## 2026-11-25 — Product repo vs private input
- **Problem:** A GitHub remote and a local git root existed on a private input folder that must stay outside this project.
- **Choice:** Keep this product as its own git history. Do not copy or commit the private input into it.
- **Why:** The product repo should contain only the app, public docs, sample data and fixtures.

## 2026-11-25 — Nested folder on disk
- **Problem:** The human wanted the product and the private input in one place, with git only on the product.
- **Choice:** Nest this folder inside the private input directory. Remove git from the parent. Git lives only here. Parent files are still not part of this repo.
- **Why:** Clearer local layout. Nested git still keeps the public history clean.

## 2026-11-25 — Package versions
- **Problem:** Tooling versions needed a re-check against the current npm registry and Claude connector docs.
- **Choice:** Keep `@modelcontextprotocol/ext-apps@2.0.4`, `@modelcontextprotocol/server@2.4.0`, `@modelcontextprotocol/client@2.4.0`, `wrangler@4.168.0`. Pin `zod@4.6.7` (latest 4.x). Pin `typescript@5.9.3` rather than TypeScript 7.
- **Why:** MCP and Wrangler versions still match the architecture note. `typescript-eslint@8.74.0` declares `typescript >=4.8.4 <6.1.0`. Workers types current on this date: `@cloudflare/workers-types@5.20261125.1`. ESLint pinned at 10.15.0 (not 10.0.1) so `npm audit` is clean of the minimatch advisory in that line.

## 2026-11-25 — workspaceId in tool text
- **Problem:** In Claude, start_demo_workspace succeeded but the model could not see the `ws_…` ID. It was only in structuredContent. Rate limit then blocked a second create.
- **Choice:** Put `Workspace ID …` first in the start text, and append `workspaceId …` on every later tool's text result.
- **Why:** Spec 03 says content must work with no UI. Claude did not surface structuredContent. The review token stays in `_meta` only.

## 2026-11-25 — Agent briefing on connect
- **Problem:** A new MCP client (Cursor, Inspector, another agent) could list tools without knowing the seed, the dry-run rule, or what “good” looks like.
- **Choice:** Put that briefing in MCP initialize `instructions` and as resource `docs://change-ripple/briefing.md`. Cursor rules point at the same story.
- **Why:** Initialize is the first message every compliant client receives. A resource lets the agent re-read it without creating a workspace.

## 2026-11-25 — Claude connector install
- **Problem:** Confirm how a new user adds the app, versus cloning this repo.
- **Choice:** Install is the public `https://…/mcp` URL (port 443, reachable from Anthropic's network), added as a custom connector with no sign-in. The GitHub URL is not an install target.
- **Why:** Claude Help Center (checked 2026-11-25): custom connectors are remote MCP over public HTTPS; Claude connects from Anthropic's cloud, not the user's laptop. Free plans allow one custom connector. Local `wrangler dev` is for tests and curl only unless a public tunnel is used.
