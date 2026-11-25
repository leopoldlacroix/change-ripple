# Change Ripple

**Client:** Maison Aube, a fictional skincare brand selling in six markets.
**For:** its content and local-market teams.
**Job:** when a product claim changes, find the affected copy, redraft it in Claude, and get each version reviewed before release.
**Why it is worth their time:** Claude can already rewrite copy. Change Ripple keeps the list of what must change (including untagged mentions), runs the same rule checks every time, keeps status between conversations, and ties each decision to the exact text reviewed. Time saved has not been measured.

**Connector URL:** not deployed yet.

## Where the human stays

Claude proposes. A person approves, edits or rejects one version at a time in the board. Failed checks block approval; changed text cancels it. **Approvals are simulated:** there is no sign-in, so the app cannot prove who decided.

## Run and test

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run dev
```

`npm test` currently: 73 passing (domain, MCP scenario against local Wrangler, security, hygiene). Playwright board harness: NOT RUN.

Local worker: `npm run dev` then POST to `http://127.0.0.1:8787/mcp`. How the tools and workspaces fit together, and how to click them in MCP Inspector without Claude: [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md). Claude custom connectors cannot use localhost; they need a public HTTPS URL on port 443.

## Limits

Checks do not judge meaning, translation quality or legal compliance. Only a numeric hours claim is supported. Anyone with a workspace ID can access that sandbox. Not production-ready.

All brand data is fictional. No affiliation with any real company using a similar name.
