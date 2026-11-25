# Three prompts (run in one chat, in order)

Agents: narrate each step with [WALKTHROUGH.md](WALKTHROUGH.md). Reuse one workspace. Do not open a change in prompt 1.

## 1. See the damage before touching anything
> Using Change Ripple, start a Maison Aube demo. Our hydration claim is moving from 48 to 24 hours. Show me what is affected, but don't change anything yet.

Expect: impact grid; 20 of 24 affected; 2 found only by text scan (ES email subject, US marketplace bullet); 4 unaffected, including a GB post mentioning "48 ml".
Critical: no change opened.

## 2. Catch the mistake, then review
> Open the change. Our agency sent this German product page copy. First save it exactly as written: "Aube Dew Cream versorgt die Haut 24 Stunden lang mit Feuchtigkeit. Leichte Textur für jeden Tag." Then fix whatever fails, draft the rest of Germany, France and Spain, and open the review board.

Expect: the first save fails MISSING_DISCLAIMER (deterministic, because the text is supplied); a fixed version passes; 10 assets await review (DE 3, FR 3, ES 4); board opens.
Critical: failure reported; nothing approved.
Then, in the board: approve one, reject one with a reason.
Variance: Claude's other drafts may fail checks and be revised, or it may save in several calls.

## 3. Can we ship?
> Can we release tomorrow? Tell me what is blocked, who needs to act, and what has been approved.

Expect: BLOCKED; Italy, UK, US (10) not yet drafted; rejected item with next actor; remaining items waiting for market leads; approved item named.
Critical: counts match the tool result; no compliance claim.
