import type { AssetStatus, Counts, Event, Findings, MarketId } from "../contracts.js";

export interface SeedClaimApproved {
  value: number;
  evidenceId: string;
  note?: string;
}

export interface SeedClaim {
  id: string;
  label: string;
  unit: string;
  currentValue: number;
  currentEvidenceId: string;
  approvedValues: SeedClaimApproved[];
}

export interface SeedMarket {
  id: MarketId;
  name: string;
  locale: string;
  reviewerRole: string;
  bannedPhrases: string[];
  disclaimer: string;
}

export interface SeedChannel {
  id: string;
  name: string;
  maxChars: number;
  requiresDisclaimer: boolean;
}

export interface SeedAsset {
  id: string;
  marketId: MarketId;
  channelId: string;
  claimRefs: string[];
  text: string;
}

export interface SeedData {
  schemaVersion: number;
  notice: string;
  brand: { id: string; name: string; product: string };
  campaign: { id: string; name: string };
  claims: SeedClaim[];
  markets: SeedMarket[];
  channels: SeedChannel[];
  assets: SeedAsset[];
}

export type VersionAuthor = "seed" | "assistant" | "reviewer";

export interface Version {
  n: number;
  text: string;
  textHash: string;
  author: VersionAuthor;
  checks: Findings;
  createdAt: string;
}

export type DetectionReason = "tag" | "text_scan";

export interface AssetState {
  id: string;
  marketId: MarketId;
  channelId: string;
  claimRefs: string[];
  versions: Version[];
  status: AssetStatus;
  rejectionReason?: string;
}

export interface OpenChange {
  claimId: string;
  fromValue: number;
  toValue: number;
  evidenceId: string;
  openedAt: string;
  affected: Array<{ assetId: string; detectedBy: DetectionReason }>;
}

export interface WorkspaceState {
  workspaceId: string;
  createdAt: string;
  expiresAt: string;
  reviewToken: string;
  seed: SeedData;
  assets: AssetState[];
  change: OpenChange | null;
  events: Event[];
  eventSeq: number;
}

export function emptyCounts(): Counts {
  return {
    unaffected: 0,
    stale: 0,
    draft_failed: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
  };
}

export function countAssets(assets: AssetState[]): Counts {
  const counts = emptyCounts();
  for (const a of assets) counts[a.status] += 1;
  return counts;
}
