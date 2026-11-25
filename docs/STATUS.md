# Status

Updated: 2026-11-25.

## Done
- Project created in this folder with its own git history.
- Copied `data/` and `fixtures/` only.
- TypeScript strict, ESLint, Vitest, Playwright, esbuild, Wrangler pinned.
- Hygiene tests exist; `npm test` runs them.
- `.gitignore` excludes `.env`, `.dev.vars`, `*.pdf`, `node_modules`, `.wrangler`.

## Next
- P1 walking skeleton: MCP `/mcp` endpoint, one read-only tool with UI, one app-only tool, one write tool, `_meta` probe, deploy.

## Blocked
- Deploy needs Cloudflare auth on this machine (`npx wrangler login` or `CLOUDFLARE_API_TOKEN` in the environment). Not needed for local tests.
- Product GitHub remote: this folder has no `origin` yet. Need a private GitHub repo named `change-ripple` (do not point origin at a remote that holds private input).

## Human action needed
1. Create a **private** GitHub repo `change-ripple` (empty) and share the URL so this project can use it as `origin`. Keep it private until release.
2. Cloudflare: run `npx wrangler login` in a terminal on this machine (browser login). Do not paste an API token into chat. Optional: set `CLOUDFLARE_API_TOKEN` in the environment only.
3. Optional before release: a confidential-terms file outside this repo; set `CONFIDENTIAL_TERMS_FILE` to its path.
4. Claude account with a free custom-connector slot, for the in-Claude check after deploy.

## Not verified
- Production deploy.
- Behaviour inside Claude (tool visibility, `_meta`, UI rendering).
- Connector install by a second person.
