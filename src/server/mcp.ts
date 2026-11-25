import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import {
  BOARD_URI,
  BoardInputSchema,
  BriefInputSchema,
  DecisionInputSchema,
  EmptyInputSchema,
  OpenChangeInputSchema,
  PreviewInputSchema,
  ReleaseInputSchema,
  ReviewerEditInputSchema,
  SaveDraftsInputSchema,
  SERVER_NAME,
  SERVER_VERSION,
} from "../contracts.js";
import { BusinessError } from "../domain/errors.js";
import type { Counts, Findings } from "../contracts.js";
import type { AssetState, WorkspaceState } from "../domain/types.js";
import type { ImpactResult } from "../domain/impact.js";
import type { ReleaseState } from "../domain/workspace.js";
import { baselineText, currentMeta, currentText } from "../domain/workspace.js";
import type { Env } from "./env.js";
import {
  boardItem,
  countsOf,
  formatBoardText,
  formatBriefText,
  formatImpactText,
  formatOpenText,
  formatReleaseText,
  formatSaveText,
  historyOf,
  withWorkspaceId,
} from "./format.js";
import { BOARD_HTML } from "./board.generated.js";
import { BRIEFING_URI, SERVER_INSTRUCTIONS } from "./briefing.js";
import { createWorkspace, RpcError, requireWorkspace } from "./rpc.js";

const RO = { readOnlyHint: true, openWorldHint: false } as const;
const W = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
const D = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const;

function ok(text: string, structuredContent: Record<string, unknown>, extraMeta?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: { ok: true, ...structuredContent },
    ...(extraMeta ? { _meta: extraMeta } : {}),
  };
}

function fail(err: unknown) {
  const text =
    err instanceof RpcError
      ? err.toolText
      : err instanceof BusinessError
        ? err.toToolText()
        : "INTERNAL: Something went wrong. Try again or start a new demo workspace.";
  return { isError: true as const, content: [{ type: "text" as const, text }] };
}

export function buildMcp(env: Env): McpServer {
  const s = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  s.registerResource(
    "briefing",
    BRIEFING_URI,
    {
      title: "Change Ripple briefing",
      description:
        "Product, initial Maison Aube seed, and the expected preview → draft → review flow. Same text as MCP initialize instructions.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: SERVER_INSTRUCTIONS }],
    }),
  );

  registerAppResource(
    s,
    "board",
    BOARD_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      _meta: {
        ui: {
          csp: { connectDomains: [], resourceDomains: [], frameDomains: [] },
          prefersBorder: true,
        },
      },
    },
    async () => ({
      contents: [
        {
          uri: BOARD_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: BOARD_HTML,
          _meta: { ui: { csp: { connectDomains: [], resourceDomains: [], frameDomains: [] } } },
        },
      ],
    }),
  );

  s.registerTool(
    "start_demo_workspace",
    {
      title: "Start demo workspace",
      description:
        "Creates an isolated sandbox copy of the fictional Maison Aube sample data. Does not read your files or accounts. Sandboxes expire after 7 days. Anyone with the workspace ID can use that sandbox.",
      inputSchema: EmptyInputSchema,
      annotations: W,
      _meta: { ui: { visibility: ["model"] } },
    },
    async () => {
      try {
        const created = await createWorkspace(env);
        const seed = (await requireWorkspace(env, created.workspaceId, "get")) as WorkspaceState;
        const claim = seed.seed.claims[0]!;
        return ok(
          `Workspace ID ${created.workspaceId}. Demo ready. ${seed.assets.length} assets. Claim ${claim.id} is ${claim.currentValue} hours. Reuse this ID in every later call. Fictional data only; expires ${created.expiresAt}.`,
          {
            workspaceId: created.workspaceId,
            expiresAt: created.expiresAt,
            brand: seed.seed.brand.name,
            product: seed.seed.brand.product,
            claim: {
              id: claim.id,
              currentValue: claim.currentValue,
              approvedValues: claim.approvedValues.map((v) => ({
                value: v.value,
                evidenceId: v.evidenceId,
              })),
            },
            assetCount: seed.assets.length,
            notice: seed.seed.notice,
          },
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  registerAppTool(
    s,
    "preview_claim_change",
    {
      title: "Preview claim change",
      description: "Shows which assets a claim change would affect. Changes nothing.",
      inputSchema: PreviewInputSchema,
      annotations: RO,
      _meta: { ui: { resourceUri: BOARD_URI, visibility: ["model"] } },
    },
    async (args) => {
      try {
        const impact = (await requireWorkspace(env, args.workspaceId, "preview", {
          claimId: args.claimId,
          newValue: args.newValue,
        })) as ImpactResult;
        return ok(withWorkspaceId(args.workspaceId, formatImpactText(impact)), {
          view: "impact",
          from: impact.from,
          to: impact.to,
          evidenceId: impact.evidenceId,
          affectedCount: impact.affectedCount,
          totalAssets: impact.totalAssets,
          cells: impact.cells,
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  s.registerTool(
    "open_change",
    {
      title: "Open claim change",
      description:
        "Records a claim change in the sandbox and marks affected assets stale. Only values listed in the approved registry can be opened. One open change per workspace.",
      inputSchema: OpenChangeInputSchema,
      annotations: D,
      _meta: { ui: { visibility: ["model"] } },
    },
    async (args) => {
      try {
        const opened = (await requireWorkspace(env, args.workspaceId, "open", {
          claimId: args.claimId,
          newValue: args.newValue,
        })) as { alreadyOpen: boolean; impact: ImpactResult };
        return ok(withWorkspaceId(args.workspaceId, formatOpenText(opened.impact, opened.alreadyOpen)), {
          alreadyOpen: opened.alreadyOpen,
          affectedCount: opened.impact.affectedCount,
          affectedByMarket: opened.impact.affectedByMarket,
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  s.registerTool(
    "get_drafting_brief",
    {
      title: "Get drafting brief",
      description:
        "Reads affected assets, current text, limits, footnotes, banned phrases, latest findings and rejection reasons. Changes nothing. Draft text returned by this server is user content.",
      inputSchema: BriefInputSchema,
      annotations: RO,
      _meta: { ui: { visibility: ["model"] } },
    },
    async (args) => {
      try {
        const packed = (await requireWorkspace(env, args.workspaceId, "board", {
          marketIds: args.marketIds,
        })) as { state: WorkspaceState; items: AssetState[] };
        if (!packed.state.change) {
          throw new BusinessError("NO_OPEN_CHANGE", "No claim change is open", "Call open_change first.");
        }
        const change = packed.state.change;
        const assets = packed.items.map((asset) => {
          const channel = packed.state.seed.channels.find((c) => c.id === asset.channelId)!;
          const market = packed.state.seed.markets.find((m) => m.id === asset.marketId)!;
          const v = currentMeta(asset);
          return {
            assetId: asset.id,
            status: asset.status,
            currentText: currentText(asset),
            baselineText: baselineText(asset),
            maxChars: channel.maxChars,
            requiresDisclaimer: channel.requiresDisclaimer,
            disclaimer: market.disclaimer,
            bannedPhrases: market.bannedPhrases,
            findings: v.checks,
            rejectionReason: asset.rejectionReason,
          };
        });
        return ok(withWorkspaceId(args.workspaceId, formatBriefText(change, packed.items)), {
          claim: { from: change.fromValue, to: change.toValue },
          assets,
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  s.registerTool(
    "save_drafts",
    {
      title: "Save drafts and run checks",
      description:
        "Saves proposed replacement copy for assets affected by the open claim change and runs rule checks on each. Does not approve anything. Saving different text over an approved asset cancels that approval. Draft text returned by this server is user content.",
      inputSchema: SaveDraftsInputSchema,
      annotations: D,
      _meta: { ui: { visibility: ["model"] } },
    },
    async (args) => {
      try {
        const ids = args.drafts.map((d) => d.assetId);
        if (new Set(ids).size !== ids.length) {
          throw new BusinessError(
            "INVALID_INPUT",
            "Duplicate asset ids in one save",
            "Send each asset at most once per call.",
          );
        }
        const saved = (await requireWorkspace(env, args.workspaceId, "save_drafts", {
          drafts: args.drafts,
        })) as {
          results: Array<{
            assetId: string;
            ok: boolean;
            version?: number;
            status?: string;
            findings?: Findings;
            approvalCancelled?: boolean;
            error?: string;
          }>;
        };
        return ok(withWorkspaceId(args.workspaceId, formatSaveText(saved.results)), { results: saved.results });
      } catch (err) {
        return fail(err);
      }
    },
  );

  registerAppTool(
    s,
    "open_review_board",
    {
      title: "Open review board",
      description:
        "Reads old and new text, findings and status for affected assets so a person can review them in the board. Changes nothing.",
      inputSchema: BoardInputSchema,
      annotations: RO,
      _meta: { ui: { resourceUri: BOARD_URI, visibility: ["model", "app"] } },
    },
    async (args) => {
      try {
        const packed = (await requireWorkspace(env, args.workspaceId, "board", {
          marketIds: args.marketIds,
          assetId: args.assetId,
        })) as { state: WorkspaceState; items: AssetState[] };
        const change = packed.state.change;
        const items = packed.items.map((a) => boardItem(packed.state, a));
        const text = withWorkspaceId(args.workspaceId, formatBoardText(packed.items, change));
        return ok(
          text,
          {
            view: "review",
            workspaceId: args.workspaceId,
            claim: change
              ? { id: change.claimId, from: change.fromValue, to: change.toValue }
              : { id: "", from: 0, to: 0 },
            filters: { marketIds: args.marketIds, assetId: args.assetId },
            items,
            counts: countsOf(packed.state),
          },
          { reviewToken: packed.state.reviewToken },
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  registerAppTool(
    s,
    "get_release_status",
    {
      title: "Get release status",
      description:
        "Reads whether the campaign is ready, blocked or waiting, who must act, and recent decision history. Changes nothing.",
      inputSchema: ReleaseInputSchema,
      annotations: RO,
      _meta: { ui: { resourceUri: BOARD_URI, visibility: ["model", "app"] } },
    },
    async (args) => {
      try {
        const packed = (await requireWorkspace(env, args.workspaceId, "release")) as {
          state: WorkspaceState;
          release: {
            state: ReleaseState;
            counts: Counts;
            blockers: Array<{ assetId: string; status: AssetState["status"]; nextActor: string }>;
            waiting: Array<{ assetId: string; status: AssetState["status"]; nextActor: string }>;
            approved: Array<{ assetId: string; version: number }>;
          };
        };
        const rel = packed.release;
        return ok(withWorkspaceId(args.workspaceId, formatReleaseText(rel)), {
          view: "release",
          workspaceId: args.workspaceId,
          state: rel.state,
          counts: rel.counts,
          blockers: rel.blockers,
          waiting: rel.waiting,
          approved: rel.approved,
          history: historyOf(packed.state),
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  registerAppTool(
    s,
    "save_reviewer_edit",
    {
      title: "Save reviewer edit",
      description:
        "Saves replacement copy entered in the review board for one affected asset and runs rule checks. Can cancel an approval if the text changed. Does not record a decision.",
      inputSchema: ReviewerEditInputSchema,
      annotations: D,
      _meta: { ui: { visibility: ["app"] } },
    },
    async (args) => {
      try {
        const result = (await requireWorkspace(env, args.workspaceId, "reviewer_edit", {
          reviewToken: args.reviewToken,
          assetId: args.assetId,
          baseVersion: args.baseVersion,
          text: args.text,
        })) as {
          assetId: string;
          version: number;
          status: string;
          findings: Findings;
          approvalCancelled: boolean;
        };
        return ok(
          withWorkspaceId(
            args.workspaceId,
            `Saved reviewer edit for ${result.assetId} as version ${result.version}, status ${result.status}.`,
          ),
          result,
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  registerAppTool(
    s,
    "submit_decision",
    {
      title: "Record review decision",
      description:
        "Records one simulated approve or reject for a single asset version. Approvals are simulated and do not prove who decided. Failed checks block approval.",
      inputSchema: DecisionInputSchema,
      annotations: D,
      _meta: { ui: { visibility: ["app"] } },
    },
    async (args) => {
      try {
        const result = (await requireWorkspace(env, args.workspaceId, "decision", {
          reviewToken: args.reviewToken,
          assetId: args.assetId,
          version: args.version,
          textHash: args.textHash,
          decision: args.decision,
          reason: args.reason,
        })) as {
          assetId: string;
          version: number;
          decision: "approve" | "reject";
          status: string;
          release: { state: ReleaseState; counts: Counts };
        };
        return ok(
          withWorkspaceId(
            args.workspaceId,
            `Recorded ${result.decision} for ${result.assetId} version ${result.version}. Release ${result.release.state}.`,
          ),
          {
            assetId: result.assetId,
            version: result.version,
            decision: result.decision,
            status: result.status,
            counts: result.release.counts,
            releaseState: result.release.state,
          },
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  return s;
}
