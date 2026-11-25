/** Sent on MCP initialize so a connecting agent has the product, seed, and expected flow. */
export const SERVER_INSTRUCTIONS = `Change Ripple is a demo MCP server for Maison Aube, a fictional skincare brand. Job: when a product claim changes, find affected market copy (including untagged mentions), redraft, run the same rule checks every time, get a human decision on each version, and see whether the campaign can ship. The server calls no AI model and needs no API key.

Initial state after start_demo_workspace:
- One product (Aube Dew Cream), one campaign, one claim hydration_duration currently 48 hours. The only approved new value is 24 (not 72).
- 6 markets (FR, DE, ES, IT, GB, US) × 4 channels = 24 assets. Statuses start unaffected. No change is open (get_release_status = NO_OPEN_CHANGE).
- workspaceId (ws_ + 22 chars) is a bearer key; reuse it. Sandbox expires in 7 days. Fictional data only.

Expected flow (do not skip the dry run):
1. preview_claim_change 48→24: 20 of 24 affected; 2 found only by text scan (ES-email_subject, US-marketplace_bullet); 4 unaffected, including a GB post that says "48 ml" (volume, not a duration). Preview must not open a change.
2. open_change, then save_drafts. The agency DE product page without "*Instrumenteller Test." fails MISSING_DISCLAIMER. A fixed draft goes pending_review. save_drafts never approves.
3. open_review_board (reviewToken only in _meta). A person records one approve and one reject-with-reason via submit_decision. Release stays BLOCKED until all 20 affected assets are approved. READY is demo checks + simulated approvals, not legal compliance.

Rules for you: narrate counts and asset names, do not dump JSON; never claim compliance; do not call start_demo_workspace every turn; 72 hours is VALUE_NOT_APPROVED; reject without reason is REASON_REQUIRED. Local clients list submit_decision and save_reviewer_edit — use them only when the user is testing review. In Claude they are meant to be app-only. Approvals are simulated (no sign-in).`;

export const BRIEFING_URI = "docs://change-ripple/briefing.md";
