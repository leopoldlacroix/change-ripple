import { SERVER_VERSION } from "../contracts.js";
import { ICON_SVG } from "./icon.js";

function html(title: string, body: string): Response {
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; --accent: #2f6f5e; }
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    a { color: var(--accent); }
    code { font-size: 0.95em; }
  </style>
</head>
<body>${body}</body>
</html>`;
  return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export function staticPages(request: Request): Response {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path === "/healthz") {
    return Response.json({ version: SERVER_VERSION, commit: "dev" });
  }
  if (path === "/icon.svg") {
    return new Response(ICON_SVG, { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
  }
  if (path === "/" || path === "/docs") {
    return html(
      "Change Ripple",
      `<h1>Change Ripple</h1>
<p>For Maison Aube’s content and local-market teams. When a product claim changes, find the affected copy, redraft it in Claude, and review each version before release.</p>
<p><strong>Approvals are simulated.</strong> There is no sign-in. Fictional data only. Sandboxes expire after 7 days. Anyone with a workspace ID can use that sandbox.</p>
<h2>Install</h2>
<p>Add the connector URL <code>${url.origin}/mcp</code> in Claude: Customize → Connectors → Add custom connector, no sign-in. Then enable it in a chat.</p>
<p>A GitHub clone is for developers. Claude talks to this URL, not to the repository.</p>
<h2>Tools</h2>
<p>Preview impact, open a change, draft and check copy, review one version at a time, and read release status. Decision tools are for the board only.</p>
<p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>`,
    );
  }
  if (path === "/privacy") {
    return html(
      "Privacy",
      `<h1>Privacy</h1>
<p>This is a demo notice, not legal advice.</p>
<ul>
<li><strong>Collected:</strong> sample brand data; draft text and rejection reasons sent to the tools; status, history and timestamps. No names, accounts or analytics.</li>
<li><strong>Use:</strong> only to run the demo.</li>
<li><strong>Storage:</strong> Cloudflare hosts the server and Durable Object storage.</li>
<li><strong>Retention:</strong> sandboxes are deleted 7 days after creation.</li>
<li><strong>Access:</strong> anyone with a workspace ID can read and change that sandbox. Do not enter personal or real brand data.</li>
</ul>
<p>The worker does not log request bodies, draft text, tokens or workspace IDs.</p>`,
    );
  }
  if (path === "/terms") {
    return html(
      "Terms",
      `<h1>Terms</h1>
<p>Demo provided as is, without warranty; may be reset or removed. Not legal, regulatory or marketing-compliance advice. Fictional data only; no abuse or load testing.</p>`,
    );
  }
  return new Response("Not found", { status: 404 });
}
