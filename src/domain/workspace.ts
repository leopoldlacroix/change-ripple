import {
  MAX_REASON,
  MAX_VERSIONS,
  WORKSPACE_TTL_MS,
  type Counts,
  type Event,
} from "../contracts.js";
import { runChecks, type CheckContext } from "./checks.js";
import { BusinessError } from "./errors.js";
import { computeImpact, detectAsset, type ImpactResult } from "./impact.js";
import { graphemeCount, isBlank, nfc, sha256Hex, timingSafeEqual } from "./text.js";
import type {
  AssetState,
  OpenChange,
  SeedChannel,
  SeedClaim,
  SeedData,
  SeedMarket,
  Version,
  VersionAuthor,
  WorkspaceState,
} from "./types.js";
import { countAssets } from "./types.js";

export type Clock = { now(): Date };

function iso(d: Date): string {
  return d.toISOString();
}

function cloneSeed(seed: SeedData): SeedData {
  return structuredClone(seed);
}

function currentVersion(asset: AssetState): Version {
  const v = asset.versions[asset.versions.length - 1];
  if (!v) throw new BusinessError("INTERNAL", "Asset has no versions", "Start a new demo workspace.");
  return v;
}

function getClaim(seed: SeedData, claimId: string): SeedClaim {
  const claim = seed.claims.find((c) => c.id === claimId);
  if (!claim) {
    throw new BusinessError(
      "UNKNOWN_CLAIM",
      "That claim is not in the registry",
      "Use hydration_duration.",
    );
  }
  return claim;
}

function approvedEvidence(claim: SeedClaim, newValue: number): string {
  const hit = claim.approvedValues.find((v) => v.value === newValue);
  if (!hit) {
    const allowed = claim.approvedValues.map((v) => v.value).join(", ");
    throw new BusinessError(
      "VALUE_NOT_APPROVED",
      `Value ${newValue} is not an approved claim value`,
      `Allowed values: ${allowed}.`,
    );
  }
  return hit.evidenceId;
}

function marketOf(seed: SeedData, id: string): SeedMarket {
  const m = seed.markets.find((x) => x.id === id);
  if (!m) throw new BusinessError("INTERNAL", "Unknown market", "Start a new demo workspace.");
  return m;
}

function channelOf(seed: SeedData, id: string): SeedChannel {
  const c = seed.channels.find((x) => x.id === id);
  if (!c) throw new BusinessError("INTERNAL", "Unknown channel", "Start a new demo workspace.");
  return c;
}

function checkCtx(state: WorkspaceState, asset: AssetState, claimValue: number): CheckContext {
  return {
    market: marketOf(state.seed, asset.marketId),
    channel: channelOf(state.seed, asset.channelId),
    claimValue,
    assetWasAffected: asset.status !== "unaffected",
  };
}

function requireChange(state: WorkspaceState): OpenChange {
  if (!state.change) {
    throw new BusinessError(
      "NO_OPEN_CHANGE",
      "No claim change is open in this workspace",
      "Call open_change first.",
    );
  }
  return state.change;
}

function requireAsset(state: WorkspaceState, assetId: string): AssetState {
  const asset = state.assets.find((a) => a.id === assetId);
  if (!asset) {
    throw new BusinessError("UNKNOWN_ASSET", "No asset with that id", "Use an id from the drafting brief.");
  }
  return asset;
}

function requireAffected(asset: AssetState): void {
  if (asset.status === "unaffected") {
    throw new BusinessError(
      "NOT_AFFECTED",
      "That asset is not affected by the open change",
      "Draft only affected assets.",
    );
  }
}

function appendEvent(
  state: WorkspaceState,
  clock: Clock,
  type: Event["type"],
  extra: Partial<Pick<Event, "assetId" | "version" | "comment">> & { actor: string },
): void {
  state.eventSeq += 1;
  state.events.unshift({
    seq: state.eventSeq,
    at: iso(clock.now()),
    type,
    actor: extra.actor,
    assetId: extra.assetId,
    version: extra.version,
    comment: extra.comment,
  });
  if (state.events.length > 20) state.events.length = 20;
}

export async function createWorkspaceState(opts: {
  workspaceId: string;
  reviewToken: string;
  seed: SeedData;
  clock: Clock;
}): Promise<WorkspaceState> {
  const createdAt = opts.clock.now();
  const expiresAt = new Date(createdAt.getTime() + WORKSPACE_TTL_MS);
  const seed = cloneSeed(opts.seed);
  const assets: AssetState[] = [];
  for (const a of seed.assets) {
    const text = nfc(a.text);
    const checks = runChecks(text, {
      market: marketOf(seed, a.marketId),
      channel: channelOf(seed, a.channelId),
      claimValue: seed.claims[0]?.currentValue ?? 48,
      assetWasAffected: false,
    });
    assets.push({
      id: a.id,
      marketId: a.marketId,
      channelId: a.channelId,
      claimRefs: [...a.claimRefs],
      status: "unaffected",
      versions: [
        {
          n: 1,
          text,
          textHash: await sha256Hex(text),
          author: "seed",
          checks,
          createdAt: iso(createdAt),
        },
      ],
    });
  }
  const state: WorkspaceState = {
    workspaceId: opts.workspaceId,
    createdAt: iso(createdAt),
    expiresAt: iso(expiresAt),
    reviewToken: opts.reviewToken,
    seed,
    assets,
    change: null,
    events: [],
    eventSeq: 0,
  };
  appendEvent(state, opts.clock, "workspace_created", { actor: "system" });
  return state;
}

export function assertNotExpired(state: WorkspaceState, clock: Clock): void {
  if (clock.now().getTime() >= Date.parse(state.expiresAt)) {
    throw new BusinessError(
      "WORKSPACE_NOT_FOUND",
      "Workspace not found",
      "Start a new demo workspace.",
    );
  }
}

export function previewChange(
  state: WorkspaceState,
  claimId: string,
  newValue: number,
): ImpactResult {
  const claim = getClaim(state.seed, claimId);
  const evidenceId = approvedEvidence(claim, newValue);
  const seedAssets = state.assets.map((a) => ({
    id: a.id,
    marketId: a.marketId,
    channelId: a.channelId,
    claimRefs: a.claimRefs,
    text: currentVersion(a).text,
  }));
  return computeImpact(seedAssets, claim, newValue, evidenceId);
}

export function openChange(
  state: WorkspaceState,
  claimId: string,
  newValue: number,
  clock: Clock,
): { alreadyOpen: boolean; impact: ImpactResult } {
  const claim = getClaim(state.seed, claimId);
  const evidenceId = approvedEvidence(claim, newValue);
  if (state.change) {
    if (state.change.claimId === claimId && state.change.toValue === newValue) {
      const impact = previewChange(state, claimId, newValue);
      return { alreadyOpen: true, impact };
    }
    throw new BusinessError(
      "CHANGE_ALREADY_OPEN",
      "A different claim change is already open",
      "Finish this workspace or start a new demo.",
    );
  }
  const impact = computeImpact(
    state.assets.map((a) => ({
      id: a.id,
      marketId: a.marketId,
      channelId: a.channelId,
      claimRefs: a.claimRefs,
      text: currentVersion(a).text,
    })),
    claim,
    newValue,
    evidenceId,
  );
  const affected = impact.cells
    .filter((c) => c.affected && c.detectedBy)
    .map((c) => ({ assetId: c.assetId, detectedBy: c.detectedBy! }));
  for (const row of affected) {
    const asset = requireAsset(state, row.assetId);
    asset.status = "stale";
  }
  state.change = {
    claimId,
    fromValue: claim.currentValue,
    toValue: newValue,
    evidenceId,
    openedAt: iso(clock.now()),
    affected,
  };
  appendEvent(state, clock, "change_opened", { actor: "assistant" });
  return { alreadyOpen: false, impact };
}

export interface SaveItemResult {
  assetId: string;
  ok: boolean;
  version?: number;
  status?: AssetState["status"];
  findings?: ReturnType<typeof runChecks>;
  approvalCancelled?: boolean;
  error?: string;
}

async function saveText(
  state: WorkspaceState,
  asset: AssetState,
  text: string,
  author: VersionAuthor,
  clock: Clock,
): Promise<{ version: Version; approvalCancelled: boolean; noOp: boolean }> {
  requireChange(state);
  requireAffected(asset);
  if (isBlank(text)) {
    throw new BusinessError("INVALID_INPUT", "Text is empty", "Provide replacement copy.");
  }
  const normalized = nfc(text);
  const current = currentVersion(asset);
  const identical = normalized === current.text;
  if (identical && asset.status !== "stale") {
    return { version: current, approvalCancelled: false, noOp: true };
  }
  if (asset.versions.length >= MAX_VERSIONS) {
    throw new BusinessError(
      "VERSION_LIMIT",
      "This asset already has 20 versions",
      "Start a new demo workspace.",
    );
  }
  const wasApproved = asset.status === "approved";
  const claimValue = state.change!.toValue;
  const findings = runChecks(normalized, checkCtx(state, asset, claimValue));
  const version: Version = {
    n: current.n + 1,
    text: normalized,
    textHash: await sha256Hex(normalized),
    author,
    checks: findings,
    createdAt: iso(clock.now()),
  };
  asset.versions.push(version);
  asset.status = findings.blocking.length > 0 ? "draft_failed" : "pending_review";
  appendEvent(state, clock, "version_saved", {
    actor: author,
    assetId: asset.id,
    version: version.n,
  });
  let approvalCancelled = false;
  if (wasApproved && !identical) {
    approvalCancelled = true;
    appendEvent(state, clock, "approval_cancelled", {
      actor: author,
      assetId: asset.id,
      version: version.n,
    });
  }
  return { version, approvalCancelled, noOp: false };
}

export async function saveDrafts(
  state: WorkspaceState,
  drafts: Array<{ assetId: string; text: string }>,
  clock: Clock,
): Promise<SaveItemResult[]> {
  requireChange(state);
  const seen = new Set<string>();
  for (const d of drafts) {
    if (seen.has(d.assetId)) {
      throw new BusinessError(
        "INVALID_INPUT",
        "Duplicate asset ids in one save",
        "Send each asset at most once per call.",
      );
    }
    seen.add(d.assetId);
  }
  const results: SaveItemResult[] = [];
  for (const d of drafts) {
    try {
      const asset = requireAsset(state, d.assetId);
      const saved = await saveText(state, asset, d.text, "assistant", clock);
      results.push({
        assetId: d.assetId,
        ok: true,
        version: saved.version.n,
        status: asset.status,
        findings: currentVersion(asset).checks,
        approvalCancelled: saved.approvalCancelled,
      });
    } catch (err) {
      if (err instanceof BusinessError) {
        results.push({ assetId: d.assetId, ok: false, error: err.code });
      } else {
        throw err;
      }
    }
  }
  return results;
}

export async function saveReviewerEdit(
  state: WorkspaceState,
  args: { reviewToken: string; assetId: string; baseVersion: number; text: string },
  clock: Clock,
): Promise<{ assetId: string; version: number; status: AssetState["status"]; findings: ReturnType<typeof runChecks>; approvalCancelled: boolean }> {
  requireChange(state);
  assertReviewToken(state, args.reviewToken);
  const asset = requireAsset(state, args.assetId);
  requireAffected(asset);
  const current = currentVersion(asset);
  if (args.baseVersion !== current.n) {
    throw new BusinessError(
      "STALE_VERSION",
      "The text changed since this board was opened",
      "Open the review board again.",
    );
  }
  const saved = await saveText(state, asset, args.text, "reviewer", clock);
  return {
    assetId: asset.id,
    version: saved.version.n,
    status: asset.status,
    findings: currentVersion(asset).checks,
    approvalCancelled: saved.approvalCancelled,
  };
}

export function assertReviewToken(state: WorkspaceState, token: string): void {
  if (!timingSafeEqual(state.reviewToken, token)) {
    throw new BusinessError(
      "INVALID_REVIEW_TOKEN",
      "The review token is missing or wrong",
      "Ask Claude to open the review board again.",
    );
  }
}

export function submitDecision(
  state: WorkspaceState,
  args: {
    reviewToken: string;
    assetId: string;
    version: number;
    textHash: string;
    decision: "approve" | "reject";
    reason?: string;
  },
  clock: Clock,
): { assetId: string; version: number; decision: "approve" | "reject"; status: AssetState["status"] } {
  requireChange(state);
  assertReviewToken(state, args.reviewToken);
  const asset = requireAsset(state, args.assetId);
  requireAffected(asset);
  const current = currentVersion(asset);
  if (args.version !== current.n || args.textHash !== current.textHash) {
    throw new BusinessError(
      "STALE_VERSION",
      "The text changed since this board was opened",
      "Open the review board again.",
    );
  }
  if (asset.status !== "pending_review") {
    throw new BusinessError(
      "NOT_PENDING",
      "This asset is not waiting for a decision",
      "Save a passing draft first.",
    );
  }
  if (args.decision === "reject") {
    const reason = args.reason?.trim() ?? "";
    if (reason.length < 1 || reason.length > MAX_REASON) {
      throw new BusinessError(
        "REASON_REQUIRED",
        "A rejection needs a reason between 1 and 300 characters",
        "Write a short reason and try again.",
      );
    }
    asset.status = "rejected";
    asset.rejectionReason = reason;
    appendEvent(state, clock, "rejected", {
      actor: "reviewer",
      assetId: asset.id,
      version: current.n,
    });
    return { assetId: asset.id, version: current.n, decision: "reject", status: asset.status };
  }
  const findings = runChecks(current.text, checkCtx(state, asset, state.change!.toValue));
  if (findings.blocking.length > 0) {
    throw new BusinessError(
      "CHECKS_FAILED",
      "This version still fails rule checks",
      "Edit the copy until blocking findings are gone.",
    );
  }
  asset.status = "approved";
  delete asset.rejectionReason;
  appendEvent(state, clock, "approved", {
    actor: "reviewer",
    assetId: asset.id,
    version: current.n,
  });
  return { assetId: asset.id, version: current.n, decision: "approve", status: asset.status };
}

export type ReleaseState = "NO_OPEN_CHANGE" | "BLOCKED" | "WAITING" | "READY";

export function releaseStatus(state: WorkspaceState): {
  state: ReleaseState;
  counts: Counts;
  blockers: Array<{ assetId: string; status: AssetState["status"]; nextActor: string }>;
  waiting: Array<{ assetId: string; status: AssetState["status"]; nextActor: string }>;
  approved: Array<{ assetId: string; version: number }>;
} {
  const counts = countAssets(state.assets);
  if (!state.change) {
    return { state: "NO_OPEN_CHANGE", counts, blockers: [], waiting: [], approved: [] };
  }
  const affected = state.assets.filter((a) => a.status !== "unaffected");
  const blockers = affected
    .filter((a) => a.status === "stale" || a.status === "draft_failed" || a.status === "rejected")
    .map((a) => ({
      assetId: a.id,
      status: a.status,
      nextActor: "Content team",
    }));
  const waiting = affected
    .filter((a) => a.status === "pending_review")
    .map((a) => ({
      assetId: a.id,
      status: a.status,
      nextActor: marketOf(state.seed, a.marketId).reviewerRole,
    }));
  const approved = affected
    .filter((a) => a.status === "approved")
    .map((a) => ({ assetId: a.id, version: currentVersion(a).n }));
  let release: ReleaseState;
  if (blockers.length > 0) release = "BLOCKED";
  else if (waiting.length > 0) release = "WAITING";
  else release = "READY";
  return { state: release, counts, blockers, waiting, approved };
}

export function boardItems(
  state: WorkspaceState,
  filters: { marketIds?: string[]; assetId?: string },
): AssetState[] {
  if (!state.change) return [];
  if (filters.assetId) {
    const asset = requireAsset(state, filters.assetId);
    requireAffected(asset);
    if (filters.marketIds && filters.marketIds.length > 0 && !filters.marketIds.includes(asset.marketId)) {
      return [];
    }
    return [asset];
  }
  let list = state.assets.filter((a) => a.status !== "unaffected");
  if (filters.marketIds && filters.marketIds.length > 0) {
    const set = new Set(filters.marketIds);
    list = list.filter((a) => set.has(a.marketId));
  }
  return list;
}

export function baselineText(asset: AssetState): string {
  return asset.versions[0]?.text ?? "";
}

export function currentText(asset: AssetState): string {
  return currentVersion(asset).text;
}

export function currentMeta(asset: AssetState): Version {
  return currentVersion(asset);
}

export function charCountOf(asset: AssetState): number {
  return graphemeCount(currentVersion(asset).text);
}

export { detectAsset };
