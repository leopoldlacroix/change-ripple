import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { clear, el, wordDiff } from "./dom.js";

type View = "impact" | "review" | "release";

interface ImpactPayload {
  view: "impact";
  from: number;
  to: number;
  affectedCount: number;
  totalAssets: number;
  cells: Array<{
    assetId: string;
    marketId: string;
    channelId: string;
    affected: boolean;
    detectedBy: "tag" | "text_scan" | null;
  }>;
}

interface ReviewItem {
  assetId: string;
  market: string;
  channel: string;
  reviewerRole: string;
  status: string;
  baselineText: string;
  text: string;
  version: number;
  textHash: string;
  charCount: number;
  maxChars: number;
  findings: { blocking: Array<{ code: string; message: string }>; warnings: Array<{ code: string; message: string }> };
  rejectionReason?: string;
}

interface ReviewPayload {
  view: "review";
  workspaceId: string;
  claim: { id: string; from: number; to: number };
  filters: { marketIds?: string[]; assetId?: string };
  items: ReviewItem[];
  counts: Record<string, number>;
}

interface ReleasePayload {
  view: "release";
  workspaceId: string;
  state: string;
  counts: Record<string, number>;
  blockers: Array<{ assetId: string; status: string; nextActor: string }>;
  waiting: Array<{ assetId: string; status: string; nextActor: string }>;
  approved: Array<{ assetId: string; version: number }>;
  history: Array<{ seq: number; at: string; type: string; assetId?: string }>;
}

const app = new App(
  { name: "change-ripple-board", version: "0.1.0" },
  { availableDisplayModes: ["inline", "fullscreen"] },
);

let reviewToken: string | undefined;
let inflight = false;
let index = 0;
let stale = false;

const root = () => document.getElementById("app")!;

function banner(text: string, cls = "banner"): HTMLElement {
  return el("div", { className: cls, text });
}

function statusLive(text: string): HTMLElement {
  return el("div", { className: "muted", text, attrs: { "aria-live": "polite" } });
}

function renderError(text: string): void {
  clear(root());
  root().append(banner(text, "banner warn"));
}

function renderImpact(data: ImpactPayload): void {
  clear(root());
  root().append(
    el("p", {
      className: "headline",
      text: `${data.affectedCount} of ${data.totalAssets} assets affected, ${data.from} h -> ${data.to} h`,
    }),
  );
  const markets = [...new Set(data.cells.map((c) => c.marketId))];
  const channels = [...new Set(data.cells.map((c) => c.channelId))];
  const table = el("table", { className: "grid", attrs: { role: "table" } });
  const head = el("thead");
  const hr = el("tr");
  hr.append(el("th", { text: "Market" }));
  for (const ch of channels) hr.append(el("th", { text: ch.replace("_", " ") }));
  head.append(hr);
  const body = el("tbody");
  for (const m of markets) {
    const tr = el("tr");
    tr.append(el("th", { text: m, attrs: { scope: "row" } }));
    for (const ch of channels) {
      const cell = data.cells.find((c) => c.marketId === m && c.channelId === ch);
      const td = el("td");
      if (!cell) {
        td.textContent = "—";
      } else if (!cell.affected) {
        td.append(el("span", { text: "○ unchanged" }));
      } else if (cell.detectedBy === "text_scan") {
        td.append(el("span", { className: "cell-scan", text: "● affected (text scan)" }));
      } else {
        td.append(el("span", { text: "● affected" }));
      }
      tr.append(td);
    }
    body.append(tr);
  }
  table.append(head, body);
  root().append(table, el("p", { className: "muted", text: "Preview only. Nothing has changed." }));
}

function reasonForApprove(item: ReviewItem): string | null {
  if (item.status !== "pending_review") return `Approve is off because status is ${item.status}.`;
  if (item.findings.blocking.length > 0) return "Approve is off because checks still fail.";
  return null;
}

function renderReview(data: ReviewPayload, token: string | undefined, outdated: boolean): void {
  clear(root());
  if (outdated) root().append(banner("This board may be out of date."));
  root().append(
    el("p", {
      className: "muted",
      text: "Simulated approval: this demo does not verify who you are",
    }),
  );
  if (!token) {
    root().append(banner("Ask Claude to open the review board again."));
  }
  if (data.items.length === 0) {
    root().append(el("p", { text: "No affected assets match this view." }));
    return;
  }
  if (index >= data.items.length) index = 0;
  const item = data.items[index]!;
  const strip = el("div", { className: "status-strip" });
  strip.append(
    el("span", { text: `${index + 1} / ${data.items.length}` }),
    el("span", { text: item.status }),
    el("span", { text: `${item.charCount} / ${item.maxChars}` }),
  );
  root().append(strip);
  root().append(el("h2", { className: "headline", text: `${item.market} · ${item.channel}` }));
  root().append(el("p", { className: "muted", text: item.reviewerRole }));
  root().append(wordDiff(item.baselineText, item.text));
  for (const f of item.findings.blocking) {
    root().append(el("p", { className: "warn", text: f.message }));
  }
  for (const f of item.findings.warnings) {
    root().append(el("p", { className: "muted", text: f.message }));
  }
  const nav = el("div", { className: "nav" });
  const prev = el("button", { text: "Previous" });
  const next = el("button", { text: "Next" });
  prev.disabled = index === 0 || inflight;
  next.disabled = index >= data.items.length - 1 || inflight;
  prev.addEventListener("click", () => {
    if (index > 0) {
      index -= 1;
      renderReview(data, token, outdated);
    }
  });
  next.addEventListener("click", () => {
    if (index < data.items.length - 1) {
      index += 1;
      renderReview(data, token, outdated);
    }
  });
  nav.append(prev, next);
  root().append(nav);

  const actions = el("div", { className: "actions" });
  const approve = el("button", { className: "primary", text: "Approve" });
  const reject = el("button", { text: "Reject" });
  const edit = el("button", { className: "edit-link", text: "Edit text" });
  const why = reasonForApprove(item);
  approve.disabled = Boolean(why) || !token || inflight || outdated;
  reject.disabled = !token || inflight || outdated || item.status !== "pending_review";
  if (why) actions.append(el("p", { className: "muted", text: why }));
  const reasonBox = el("textarea", { attrs: { placeholder: "Rejection reason (required)", maxlength: "300" } });
  approve.addEventListener("click", () => void decide(data, item, "approve"));
  reject.addEventListener("click", () => {
    const reason = reasonBox.value.trim();
    if (!reason) {
      root().append(el("p", { className: "warn", text: "Write a reason before rejecting." }));
      return;
    }
    void decide(data, item, "reject", reason);
  });
  let editing = false;
  edit.addEventListener("click", () => {
    if (editing) return;
    editing = true;
    const area = el("textarea");
    area.value = item.text;
    const save = el("button", { className: "primary", text: "Save" });
    const cancel = el("button", { text: "Cancel" });
    save.addEventListener("click", () => void editSave(data, item, area.value));
    cancel.addEventListener("click", () => renderReview(data, token, outdated));
    root().append(area, save, cancel);
  });
  actions.append(approve, reject, edit);
  root().append(reasonBox, actions);
  const expand = el("button", { text: "Expand" });
  expand.addEventListener("click", () => {
    void app.requestDisplayMode({ mode: "fullscreen" });
  });
  root().append(expand);
  root().append(
    el("p", {
      className: "muted",
      text: "Checks cover rules only, not meaning, translation quality or legal compliance.",
    }),
  );
}

function renderRelease(data: ReleasePayload): void {
  clear(root());
  root().append(el("p", { className: "release-state", text: data.state }));
  root().append(el("p", { text: `Approved ${data.counts.approved ?? 0} · waiting ${data.waiting.length} · blocked ${data.blockers.length}` }));
  if (data.blockers.length) {
    root().append(el("h3", { text: "Blocked" }));
    for (const b of data.blockers) {
      root().append(el("p", { text: `${b.assetId}: ${b.status} — ${b.nextActor}` }));
    }
  }
  if (data.waiting.length) {
    root().append(el("h3", { text: "Waiting" }));
    for (const w of data.waiting) {
      root().append(el("p", { text: `${w.assetId}: ${w.nextActor}` }));
    }
  }
  if (data.approved.length) {
    root().append(el("h3", { text: "Approved" }));
    for (const a of data.approved) {
      root().append(el("p", { text: `${a.assetId} v${a.version}` }));
    }
  }
  root().append(el("h3", { text: "History" }));
  for (const h of data.history.slice(0, 20)) {
    root().append(el("p", { className: "muted", text: `${h.type}${h.assetId ? ` ${h.assetId}` : ""}` }));
  }
}

async function refreshReview(data: ReviewPayload): Promise<void> {
  stale = true;
  renderReview(data, reviewToken, true);
  try {
    const result = await app.callServerTool({
      name: "open_review_board",
      arguments: {
        workspaceId: data.workspaceId,
        marketIds: data.filters.marketIds,
        assetId: data.filters.assetId,
      },
    });
    stale = false;
    applyResult(result, { skipRefresh: true });
  } catch {
    stale = true;
    renderReview(data, reviewToken, true);
  }
}

async function decide(
  data: ReviewPayload,
  item: ReviewItem,
  decision: "approve" | "reject",
  reason?: string,
): Promise<void> {
  if (inflight || !reviewToken) return;
  inflight = true;
  renderReview(data, reviewToken, stale);
  const result = await app.callServerTool({
    name: "submit_decision",
    arguments: {
      workspaceId: data.workspaceId,
      reviewToken,
      assetId: item.assetId,
      version: item.version,
      textHash: item.textHash,
      decision,
      reason,
    },
  });
  inflight = false;
  if (result.isError) {
    const msg = result.content.map((c) => ("text" in c ? c.text : "")).join(" ");
    if (msg.includes("STALE_VERSION")) {
      root().prepend(banner("The text changed. Refreshing."));
      await refreshReview(data);
      return;
    }
    if (msg.includes("WORKSPACE_NOT_FOUND")) {
      renderError("This workspace expired. Start a new demo workspace.");
      return;
    }
    renderError(msg);
    return;
  }
  const sc = result.structuredContent as { counts?: Record<string, number> } | undefined;
  await app.updateModelContext({
    content: [
      {
        type: "text",
        text: `${item.assetId} version ${item.version} ${decision}. Counts updated.`,
      },
    ],
  });
  void sc;
  await refreshReview(data);
}

async function editSave(data: ReviewPayload, item: ReviewItem, text: string): Promise<void> {
  if (inflight || !reviewToken) return;
  inflight = true;
  const result = await app.callServerTool({
    name: "save_reviewer_edit",
    arguments: {
      workspaceId: data.workspaceId,
      reviewToken,
      assetId: item.assetId,
      baseVersion: item.version,
      text,
    },
  });
  inflight = false;
  if (result.isError) {
    renderError(result.content.map((c) => ("text" in c ? c.text : "")).join(" "));
    return;
  }
  await app.updateModelContext({
    content: [{ type: "text", text: `${item.assetId} edited, new version saved.` }],
  });
  await refreshReview(data);
}

function applyResult(result: CallToolResult, opts?: { skipRefresh?: boolean }): void {
  if (result.isError) {
    renderError(result.content.map((c) => ("text" in c ? c.text : "")).join(" "));
    return;
  }
  const meta = result._meta as { reviewToken?: string } | undefined;
  if (meta?.reviewToken) reviewToken = meta.reviewToken;
  const sc = result.structuredContent as { view?: View } | undefined;
  if (!sc?.view) {
    root().replaceChildren(statusLive(result.content.map((c) => ("text" in c ? c.text : "")).join(" ")));
    return;
  }
  if (sc.view === "impact") renderImpact(sc as ImpactPayload);
  else if (sc.view === "review") {
    const data = sc as ReviewPayload;
    renderReview(data, reviewToken, false);
    if (!opts?.skipRefresh) void refreshAfterMount(data);
  } else if (sc.view === "release") {
    const data = sc as ReleasePayload;
    renderRelease(data);
    if (!opts?.skipRefresh) void refreshRelease(data);
  }
}

async function refreshAfterMount(data: ReviewPayload): Promise<void> {
  try {
    const result = await app.callServerTool({
      name: "open_review_board",
      arguments: {
        workspaceId: data.workspaceId,
        marketIds: data.filters.marketIds,
        assetId: data.filters.assetId,
      },
    });
    applyResult(result, { skipRefresh: true });
  } catch {
    stale = true;
    renderReview(data, reviewToken, true);
  }
}

async function refreshRelease(data: ReleasePayload): Promise<void> {
  try {
    const result = await app.callServerTool({
      name: "get_release_status",
      arguments: { workspaceId: data.workspaceId },
    });
    applyResult(result, { skipRefresh: true });
  } catch {
    root().prepend(banner("This view may be out of date."));
  }
}

app.ontoolresult = (params) => {
  applyResult(params);
};

void app.connect();
