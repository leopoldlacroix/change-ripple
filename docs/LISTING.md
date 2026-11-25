# Connector listing sheet

- **Name:** Change Ripple
- **One-liner (<=200 chars):** When a product claim changes, find affected market copy, check redrafts against brand rules, and review each version before release. Demo with fictional data.
- **Description (<=2,000 chars):** Change Ripple helps content and local-market teams handle a product claim change. It shows which assets are affected, including mentions nobody tagged, stores redrafts Claude proposes, runs repeatable checks (claim value, length, required footnote, banned phrases, markup), and displays a review board where a person approves, edits or rejects one version at a time. A release view shows what is blocked, waiting or approved. This demo uses a fictional skincare brand. Approvals are simulated because there is no sign-in. Checks do not assess meaning, translation quality or legal compliance. Enter fictional data only; sandboxes expire after 7 days.
- **Categories (1-5):** not submitted to a directory
- **Slug:** change-ripple-demo
- **Icon:** docs/assets/icon.svg
- **Documentation:** /docs on the Worker (not deployed yet)
- **Privacy:** /privacy on the Worker (not deployed yet)
- **Support:** https://github.com/leopoldlacroix/change-ripple/issues
- **Company / contact:** https://github.com/leopoldlacroix/change-ripple
- **Use cases:** assess a claim change; redraft and check market copy; review and track release readiness.
- **Prerequisites:** a Claude plan that can add this custom connector; interactive display support for review.
- **Reads/writes:** both, only in a demo sandbox.
- **Authentication:** none. A production version acting on company data would need OAuth 2.0.
- **MCP server URL:** not deployed yet
- **Data handling:** own server on Cloudflare; sample data plus text saved to the sandbox; deleted after 7 days; no health data; no sponsored content; the server calls no AI model.
- **External links:** none.
- **Reviewer test setup:** no account. Add the URL and run the three prompts; the first creates a populated sandbox.
- **Screenshots:** none yet (need Claude H2)

## Tools
| Tool (title) | Reads | Changes | Annotation | Who calls |
|---|---|---|---|---|
| start_demo_workspace (Start demo workspace) | sample data | creates sandbox | write, non-destructive | Claude |
| preview_claim_change (Preview claim change) | claims, assets | nothing | read-only | Claude |
| open_change (Open claim change) | claims, assets | records change, marks assets stale | destructive | Claude |
| get_drafting_brief (Get drafting brief) | copy, rules, findings | nothing | read-only | Claude |
| save_drafts (Save drafts and run checks) | rules, assets | adds versions; can cancel approval | destructive | Claude |
| open_review_board (Open review board) | copy, findings, status | nothing | read-only | Claude, board |
| get_release_status (Get release status) | status, history | nothing | read-only | Claude, board |
| save_reviewer_edit (Save reviewer edit) | version | adds version; can cancel approval | destructive | board only |
| submit_decision (Record review decision) | version | records simulated decision | destructive | board only |

"Board only" is enforced by the Claude app; it is not authentication.

Not submitted. Before real submission, re-check current requirements and directory policy.
