# Verification

Written 2026-11-25. Same session as the implementation (not an independent verifier). Items are PASS / FAIL / NOT VERIFIED only where evidence exists.

| Item | Result | Evidence |
|---|---|---|
| T1 domain | PASS | `npm test` 75+ (re-run after workspaceId-in-text) |
| T2 MCP integration | PASS | `tests/integration/mcp.test.ts` including start text contains `Workspace ID` |
| T3 security | PASS | `tests/security/security.test.ts` |
| T4 Playwright board | NOT VERIFIED | NOT RUN |
| T5 production | PARTIAL | healthz, static pages, MCP initialize, tools/list on https://change-ripple.leola.workers.dev. Full scenario on that URL NOT RUN |
| T6 hygiene | PASS except confidential scan SKIPPED | `CONFIDENTIAL_TERMS_FILE` unset |
| H1 Claude connect | PASS | Human: connector connected, sandbox created |
| H1 workspaceId visible | FAIL then fix | Human: model did not see `ws_…` (only structuredContent). Text now includes `Workspace ID` first. Re-check in a new Claude chat after deploy |
| H1 iframe / app-only / `_meta` | NOT VERIFIED | Rate limit before those steps |
| E1–E8 | NOT VERIFIED | NOT RUN |

No FAIL left in the current code except the pre-fix H1 visibility issue, which this commit addresses. Do not call the project “done” until Claude is re-checked and T4/evals are either run or accepted as cuts.
