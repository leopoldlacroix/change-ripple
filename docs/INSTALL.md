# Add Change Ripple to Claude

**URL:** https://change-ripple.leola.workers.dev/mcp · No sign-in or API key. Fictional demo data only.

Developers who want to run it on a laptop: [DEV.md](DEV.md). Claude cannot use `localhost`.

**Free, Pro or Max:** Customize > Connectors > Add custom connector, paste the URL, choose no sign-in if asked, Add. (Free allows one custom connector.)
**Team or Enterprise:** an Owner goes to Organization settings > Connectors > Add > Custom (Web if asked), enters the URL; each member then opens Customize > Connectors and connects.

In a chat: + > Connectors > turn on Change Ripple. Then paste the first demo prompt. On connect, the server sends a briefing (product, seed, expected flow).

## What you are allowing
It reads and writes only its own demo sandboxes. It does not reach your files, apps or accounts. Text you or Claude send to its tools is stored in the sandbox for up to 7 days.

| Tools | Suggested permission |
|---|---|
| Read-only (preview, brief, board, release) | Allow, if your policy permits |
| start_demo_workspace, open_change, save_drafts | Ask each time |
| Decision and edit tools (board only) | Ask each time (not verified in Claude yet) |

## Check it works
Prompt 1 shows a grid with 20 of 24 assets affected. `get_release_status` must still be `NO_OPEN_CHANGE`. The first tool result text starts with `Workspace ID ws_…` — that ID is required for every later call.

## Troubleshooting
- No interface: confirm the connector is on in this chat; try web or desktop.
- Claude cannot see the workspace ID: it is in the tool **text** (starts with `Workspace ID`). Do not start extra sandboxes to hunt for it. Wait if you hit a rate limit.
- Workspace not found: it expired or the ID is wrong; start a new demo.
- Board outdated: ask Claude to open the review board again.
- Capacity message: the daily demo limit was reached; it resets at 00:00 UTC.
- Rate limit: wait and continue in the same chat with the existing ID; do not create more workspaces.

## Remove
Customize > Connectors (Owners: organization settings) > Remove. Sandbox data expires by itself.

Menu names checked against Claude's documentation on 2026-11-25; confirm when you install.
