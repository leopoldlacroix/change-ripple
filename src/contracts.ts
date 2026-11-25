import * as z from "zod/v4";

export const MARKET_IDS = ["FR", "DE", "ES", "IT", "GB", "US"] as const;
export type MarketId = (typeof MARKET_IDS)[number];

export const CHANNEL_IDS = [
  "product_page",
  "social_post",
  "email_subject",
  "marketplace_bullet",
] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];

export const ASSET_STATUSES = [
  "unaffected",
  "stale",
  "draft_failed",
  "pending_review",
  "approved",
  "rejected",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const WORKSPACE_ID_RE = /^ws_[A-Za-z0-9_-]{22}$/;
export const BOARD_URI = "ui://change-ripple/board.html";
export const SERVER_NAME = "change-ripple";
export const SERVER_VERSION = "0.1.0";
export const CLAIM_ID = "hydration_duration";
export const MAX_TEXT_UNITS = 1000;
export const MAX_DRAFTS = 20;
export const MAX_VERSIONS = 20;
export const MAX_REASON = 300;
export const MAX_BODY_BYTES = 64 * 1024;
export const WORKSPACE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_DAILY_CAP = 500;

export const MarketIdSchema = z.enum(MARKET_IDS);
export const WorkspaceIdSchema = z.string().regex(WORKSPACE_ID_RE);
export const ClaimIdSchema = z.string().min(1).max(64);
export const NewValueSchema = z.number().int().min(1).max(72);
export const AssetIdSchema = z.string().min(1).max(64);
export const DraftTextSchema = z.string().max(MAX_TEXT_UNITS);

export const FindingSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
  detail: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const FindingsSchema = z.strictObject({
  blocking: z.array(FindingSchema),
  warnings: z.array(FindingSchema),
});
export type Findings = z.infer<typeof FindingsSchema>;

export const EventTypeSchema = z.enum([
  "workspace_created",
  "change_opened",
  "version_saved",
  "approved",
  "rejected",
  "approval_cancelled",
]);

export const EventSchema = z.strictObject({
  seq: z.number().int(),
  at: z.string(),
  type: EventTypeSchema,
  assetId: z.string().optional(),
  version: z.number().int().optional(),
  actor: z.string(),
  comment: z.string().optional(),
});
export type Event = z.infer<typeof EventSchema>;

export const CountsSchema = z.strictObject({
  unaffected: z.number().int(),
  stale: z.number().int(),
  draft_failed: z.number().int(),
  pending_review: z.number().int(),
  approved: z.number().int(),
  rejected: z.number().int(),
});
export type Counts = z.infer<typeof CountsSchema>;

export const EmptyInputSchema = z.strictObject({});

export const WorkspaceInputSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
});

export const PreviewInputSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
  claimId: ClaimIdSchema,
  newValue: NewValueSchema,
});

export const OpenChangeInputSchema = PreviewInputSchema;

export const BriefInputSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
  marketIds: z.array(MarketIdSchema).max(6).optional(),
});

export const SaveDraftsInputSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
  drafts: z
    .array(
      z.strictObject({
        assetId: AssetIdSchema,
        text: DraftTextSchema,
      }),
    )
    .min(1)
    .max(MAX_DRAFTS),
});

export const BoardInputSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
  marketIds: z.array(MarketIdSchema).max(6).optional(),
  assetId: AssetIdSchema.optional(),
});

export const ReleaseInputSchema = WorkspaceInputSchema;

export const ReviewerEditInputSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
  reviewToken: z.string().min(1).max(128),
  assetId: AssetIdSchema,
  baseVersion: z.number().int().min(1),
  text: DraftTextSchema,
});

export const DecisionInputSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
  reviewToken: z.string().min(1).max(128),
  assetId: AssetIdSchema,
  version: z.number().int().min(1),
  textHash: z.string().min(1).max(128),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().max(MAX_REASON).optional(),
});

export type PreviewInput = z.infer<typeof PreviewInputSchema>;
export type OpenChangeInput = z.infer<typeof OpenChangeInputSchema>;
export type BriefInput = z.infer<typeof BriefInputSchema>;
export type SaveDraftsInput = z.infer<typeof SaveDraftsInputSchema>;
export type BoardInput = z.infer<typeof BoardInputSchema>;
export type ReviewerEditInput = z.infer<typeof ReviewerEditInputSchema>;
export type DecisionInput = z.infer<typeof DecisionInputSchema>;

export const ERROR_CODES = [
  "WORKSPACE_NOT_FOUND",
  "INVALID_INPUT",
  "UNKNOWN_CLAIM",
  "VALUE_NOT_APPROVED",
  "CHANGE_ALREADY_OPEN",
  "NO_OPEN_CHANGE",
  "UNKNOWN_ASSET",
  "NOT_AFFECTED",
  "STALE_VERSION",
  "CHECKS_FAILED",
  "NOT_PENDING",
  "REASON_REQUIRED",
  "INVALID_REVIEW_TOKEN",
  "VERSION_LIMIT",
  "DEMO_CAPACITY",
  "INTERNAL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
