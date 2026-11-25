# Walkthrough: what to show, what to say

Use this when driving Change Ripple with a user (Cursor, Inspector, or Claude). The three prompts in [DEMO-PROMPTS.md](DEMO-PROMPTS.md) are the script. This page is the **narration**: which tools fire, what the user should understand, and what “showing what happens” means.

Keep `npm run dev` running. Endpoint: `http://127.0.0.1:8787/mcp`. Cursor loads that URL from `.cursor/mcp.json`. If tools are missing, the Worker is down or the MCP server is disabled in Cursor Settings.

**Reuse one workspace.** Copy `workspaceId` from the first `start_demo_workspace` result and pass it to every later call. Do not create a new sandbox per message.

After each tool, speak in counts and names. Example: “20 of 24 assets would change; nothing is stored yet.” Do not paste JSON unless asked. Never say the copy is legally compliant.

In Cursor and Inspector, all nine tools are visible (including `submit_decision`). That is expected locally. Claude is supposed to hide the two board tools from the model; that is **not verified** until a public connector is tested in Claude.

## Prompt 1 — See the damage, change nothing

User text (from DEMO-PROMPTS): start a demo, claim 48 → 24 hours, show impact, do not change anything.

| Order | Tool | Why |
|---|---|---|
| 1 | `start_demo_workspace` `{}` | One sandbox of Maison Aube. Remember `workspaceId`. Skip if you already have one in this chat. |
| 2 | `preview_claim_change` `{ workspaceId, claimId: "hydration_duration", newValue: 24 }` | Read-only map of who would be hit. |
| 3 | `get_release_status` `{ workspaceId }` | Must still be `NO_OPEN_CHANGE`. That proves preview did not open a change. |

**Show:** 20 of 24 affected; 2 found only by text scan (`ES-email_subject`, `US-marketplace_bullet`); 4 unaffected, including a GB post that says “48 ml” (volume, not a duration claim).

**What the user should understand:** the tool finds untagged mentions, not only assets tagged with the claim. Preview is a dry run. The registry allows 24 hours, not 72.

**Do not:** call `open_change` in this prompt.

## Prompt 2 — Catch the bad draft, then review

User text: open the change; save the agency’s German product page **exactly**; then fix it; draft the rest of DE, FR, ES; open the board. Then approve one and reject one with a reason.

| Order | Tool | Why |
|---|---|---|
| 1 | `open_change` `{ workspaceId, claimId: "hydration_duration", newValue: 24 }` | Marks the 20 affected assets `stale`. This is the first write. |
| 2 | `save_drafts` with the agency DE product page, **verbatim** | Must fail `MISSING_DISCLAIMER` (no `*Instrumenteller Test.`). |
| 3 | `save_drafts` with a fixed DE page, then the other DE / FR / ES drafts | Good copy → `pending_review`. Use [../fixtures/demo-drafts.json](../fixtures/demo-drafts.json) `goodDraftsAt24` when you need a passing text. |
| 4 | `open_review_board` `{ workspaceId, marketIds: ["DE","FR","ES"] }` | Lists items. `reviewToken` is only in `_meta`, not in `structuredContent`. |
| 5 | `submit_decision` approve one pending item | Needs token, `version`, and `textHash` from the board item. |
| 6 | `submit_decision` reject another, with `reason` | Reject without reason → `REASON_REQUIRED`. |

**Show:** first save failed and nothing was approved; after fixes, those markets are waiting on people, not on the model; one approve and one reject, each bound to a specific version.

**What the user should understand:** checks are mechanical (footnote, banned phrases, hours). A person decides. Approving is simulated (no login). A later edit of approved text would drop the approval.

**Do not:** approve everything; invent a 72-hour claim; put the review token in the chat if you can avoid it.

## Prompt 3 — Can we ship?

User text: can we release tomorrow; what is blocked; who acts; what is approved.

| Order | Tool | Why |
|---|---|---|
| 1 | `get_release_status` `{ workspaceId }` | Source of truth. After prompt 2 this should be `BLOCKED`. |

**Show:** Italy, UK, US still stale (not drafted); the rejected asset names a next actor; remaining DE/FR/ES items wait for market leads; the one approved asset is named with its version. Counts must match the tool, not a guess.

**What the user should understand:** **BLOCKED** means “not ready,” not “illegal.” Ready only happens when every affected asset is approved. Say that checks are demo rules, not a compliance verdict.

## If something fails

| Result | Meaning | What to tell the user |
|---|---|---|
| `WORKSPACE_NOT_FOUND` | Bad or expired ID | Start a new demo; old sandboxes last 7 days. |
| `VALUE_NOT_APPROVED` | e.g. 72 hours | Only 24 is in the registry. |
| `MISSING_DISCLAIMER` | Footnote missing or not exact | Show the required footnote for that market. |
| `REASON_REQUIRED` | Reject with empty reason | Ask for 1–300 characters. |
| `STALE_VERSION` / hash mismatch | Text moved since the board loaded | Re-open the board and decide on the new version. |
| `DEMO_CAPACITY` | Daily create cap | Reuse an existing `workspaceId`. |
| MCP tools missing | Worker or Cursor MCP off | `npm run dev` in `change-ripple/`, enable **change-ripple** in Cursor MCP settings. |

## What this setup cannot show

The board HTML resource exists (`ui://change-ripple/board.html`), but Cursor will not host Claude’s iframe. Decisions here are tool calls, which is enough to prove the server. Rendering, “app-only” hiding, and `_meta` staying off-screen need Claude on a public HTTPS `/mcp` URL.
