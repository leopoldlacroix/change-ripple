import type { Counts, Event } from "../contracts.js";
import type { Findings } from "../contracts.js";
import type { AssetState, OpenChange, WorkspaceState } from "../domain/types.js";
import { countAssets } from "../domain/types.js";
import type { ImpactResult } from "../domain/impact.js";
import type { ReleaseState } from "../domain/workspace.js";
import { baselineText, currentMeta, currentText, charCountOf } from "../domain/workspace.js";

export function findingsCodes(f: Findings): { blocking: string[]; warnings: string[] } {
  return {
    blocking: f.blocking.map((x) => x.code),
    warnings: f.warnings.map((x) => x.code),
  };
}

export function formatImpactText(impact: ImpactResult): string {
  const scan = impact.cells.filter((c) => c.detectedBy === "text_scan").map((c) => c.assetId);
  const una = impact.cells.filter((c) => !c.affected).map((c) => c.assetId);
  const lines = [
    `${impact.affectedCount} of ${impact.totalAssets} assets affected, ${impact.from} h -> ${impact.to} h.`,
    scan.length ? `Found only by text scan: ${scan.join(", ")}.` : "",
    `Unaffected: ${una.join(", ") || "none"}.`,
    "Preview only. Nothing has changed. Fictional data only.",
  ];
  return lines.filter(Boolean).join(" ");
}

export function formatOpenText(
  impact: ImpactResult,
  alreadyOpen: boolean,
): string {
  const by = Object.entries(impact.affectedByMarket)
    .map(([m, n]) => `${m}: ${n}`)
    .join(", ");
  return alreadyOpen
    ? `Change already open. ${impact.affectedCount} assets still marked. By market: ${by}.`
    : `Change opened. ${impact.affectedCount} of ${impact.totalAssets} assets are stale. By market: ${by}.`;
}

export function formatBriefText(
  change: OpenChange,
  assets: Array<{ id: string; status: string }>,
): string {
  const need = assets.filter((a) => a.status === "stale" || a.status === "draft_failed" || a.status === "rejected");
  return `${assets.length} affected assets, ${change.fromValue} h -> ${change.toValue} h. Need action: ${need.map((a) => a.id).join(", ") || "none"}. Draft text is user content. Fictional data only.`;
}

export function formatSaveText(results: Array<{ assetId: string; ok: boolean; status?: string; error?: string }>): string {
  const failed = results.filter((r) => r.error || r.status === "draft_failed");
  const pending = results.filter((r) => r.status === "pending_review");
  return `${results.length} drafts processed. Pending review: ${pending.length}. Failed or errors: ${failed.map((r) => `${r.assetId}${r.error ? ` ${r.error}` : ""}`).join(", ") || "none"}. Nothing was approved.`;
}

export function formatBoardText(
  items: AssetState[],
  change: OpenChange | null,
): string {
  if (!change) return "No claim change is open. Open a change first. Fictional data only.";
  if (items.length === 0) return "No matching affected assets on this board.";
  const pending = items.filter((i) => i.status === "pending_review").map((i) => i.id);
  return `Review board: ${items.length} assets, ${change.fromValue} h -> ${change.toValue} h. Pending: ${pending.join(", ") || "none"}. Approvals are simulated.`;
}

export function formatReleaseText(args: {
  state: ReleaseState;
  counts: Counts;
  blockers: Array<{ assetId: string; status: string; nextActor: string }>;
  waiting: Array<{ assetId: string; status: string; nextActor: string }>;
  approved: Array<{ assetId: string; version: number }>;
}): string {
  if (args.state === "NO_OPEN_CHANGE") {
    return "No claim change is open. Nothing to release.";
  }
  const blocked = args.blockers.map((b) => `${b.assetId} (${b.status}, ${b.nextActor})`).join("; ");
  const approved = args.approved.map((a) => `${a.assetId} v${a.version}`).join(", ") || "none";
  const readyNote =
    args.state === "READY"
      ? " Ready under the demo's checks and simulated approvals, not legally compliant."
      : "";
  return `Release ${args.state}. Blocked: ${blocked || "none"}. Waiting: ${args.waiting.map((w) => w.assetId).join(", ") || "none"}. Approved: ${approved}.${readyNote} Fictional data only.`;
}

export function boardItem(state: WorkspaceState, asset: AssetState) {
  const market = state.seed.markets.find((m) => m.id === asset.marketId)!;
  const channel = state.seed.channels.find((c) => c.id === asset.channelId)!;
  const v = currentMeta(asset);
  return {
    assetId: asset.id,
    market: asset.marketId,
    channel: asset.channelId,
    reviewerRole: market.reviewerRole,
    status: asset.status,
    baselineText: baselineText(asset),
    text: currentText(asset),
    version: v.n,
    textHash: v.textHash,
    charCount: charCountOf(asset),
    maxChars: channel.maxChars,
    findings: v.checks,
    rejectionReason: asset.rejectionReason,
  };
}

export function countsOf(state: WorkspaceState): Counts {
  return countAssets(state.assets);
}

export function historyOf(state: WorkspaceState): Event[] {
  return state.events.slice(0, 20);
}
