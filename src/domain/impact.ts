import { findDurationMentions, mentionMatchesValue } from "./duration.js";
import type { DetectionReason, SeedAsset, SeedClaim } from "./types.js";

export interface ImpactCell {
  assetId: string;
  marketId: string;
  channelId: string;
  affected: boolean;
  detectedBy: DetectionReason | null;
}

export interface ImpactResult {
  from: number;
  to: number;
  evidenceId: string;
  affectedCount: number;
  totalAssets: number;
  cells: ImpactCell[];
  affectedByMarket: Record<string, number>;
}

export function detectAsset(
  asset: { claimRefs: string[]; text: string },
  claim: SeedClaim,
): DetectionReason | null {
  if (asset.claimRefs.includes(claim.id)) return "tag";
  const text = asset.text;
  const mentions = findDurationMentions(text);
  if (mentions.some((m) => mentionMatchesValue(m.rawNumber, claim.currentValue))) {
    return "text_scan";
  }
  return null;
}

export function computeImpact(
  assets: SeedAsset[],
  claim: SeedClaim,
  toValue: number,
  evidenceId: string,
): ImpactResult {
  const cells: ImpactCell[] = assets.map((asset) => {
    const detectedBy = detectAsset(asset, claim);
    return {
      assetId: asset.id,
      marketId: asset.marketId,
      channelId: asset.channelId,
      affected: detectedBy !== null,
      detectedBy,
    };
  });
  const affectedByMarket: Record<string, number> = {};
  for (const cell of cells) {
    if (!cell.affected) continue;
    affectedByMarket[cell.marketId] = (affectedByMarket[cell.marketId] ?? 0) + 1;
  }
  return {
    from: claim.currentValue,
    to: toValue,
    evidenceId,
    affectedCount: cells.filter((c) => c.affected).length,
    totalAssets: assets.length,
    cells,
    affectedByMarket,
  };
}
