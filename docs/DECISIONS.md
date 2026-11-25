# Decisions

## 2026-11-25 — Product repo vs private input
- **Problem:** A GitHub remote and a local git root existed on a private input folder that must stay outside this project.
- **Choice:** Create this project as a new sibling folder with its own git history. Do not copy or commit that input folder.
- **Why:** The product repo should contain only the app, public docs, sample data and fixtures.

## 2026-11-25 — Package versions
- **Problem:** Tooling versions needed a re-check against the current npm registry and Claude connector docs.
- **Choice:** Keep `@modelcontextprotocol/ext-apps@2.0.4`, `@modelcontextprotocol/server@2.4.0`, `@modelcontextprotocol/client@2.4.0`, `wrangler@4.168.0`. Pin `zod@4.6.7` (latest 4.x). Pin `typescript@5.9.3` rather than TypeScript 7.
- **Why:** MCP and Wrangler versions still match the architecture note. `typescript-eslint@8.74.0` declares `typescript >=4.8.4 <6.1.0`. Workers types current on this date: `@cloudflare/workers-types@5.20261125.1`. ESLint pinned at 10.15.0 (not 10.0.1) so `npm audit` is clean of the minimatch advisory in that line.

## 2026-11-25 — Claude connector install
- **Problem:** Confirm how a new user adds the app, versus cloning this repo.
- **Choice:** Install is the public `https://…/mcp` URL (port 443, reachable from Anthropic's network), added as a custom connector with no sign-in. The GitHub URL is not an install target.
- **Why:** Claude Help Center (checked 2026-11-25): custom connectors are remote MCP over public HTTPS; Claude connects from Anthropic's cloud, not the user's laptop. Free plans allow one custom connector. Local `wrangler dev` is for tests and curl only unless a public tunnel is used.
