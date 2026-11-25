import { DurableObject } from "cloudflare:workers";
import seedJson from "../../data/maison-aube.json" with { type: "json" };
import { WORKSPACE_TTL_MS } from "../contracts.js";
import { BusinessError } from "../domain/errors.js";
import type { SeedData, WorkspaceState } from "../domain/types.js";
import {
  assertNotExpired,
  boardItems,
  createWorkspaceState,
  openChange,
  previewChange,
  releaseStatus,
  saveDrafts,
  saveReviewerEdit,
  submitDecision,
  type Clock,
} from "../domain/workspace.js";
import { currentMeta, currentText } from "../domain/workspace.js";
import type { Env } from "./env.js";

const seed = seedJson as SeedData;

function clock(): Clock {
  return { now: () => new Date() };
}

export class WorkspaceDO extends DurableObject<Env> {
  private ready = false;

  private initSql(): void {
    if (this.ready) return;
    this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    this.ready = true;
  }

  private load(): WorkspaceState | null {
    this.initSql();
    const rows = this.ctx.storage.sql
      .exec("SELECT v FROM kv WHERE k = ?", "state")
      .toArray() as Array<{ v: string }>;
    const row = rows[0];
    if (!row) return null;
    return JSON.parse(row.v) as WorkspaceState;
  }

  private save(state: WorkspaceState): void {
    this.initSql();
    this.ctx.storage.sql.exec(
      "INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
      "state",
      JSON.stringify(state),
    );
  }

  override async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  override async fetch(request: Request): Promise<Response> {
    const body = (await request.json()) as { op: string; args?: Record<string, unknown> };
    try {
      const result = await this.dispatch(body.op, body.args ?? {});
      return Response.json({ ok: true, result });
    } catch (err) {
      if (err instanceof BusinessError) {
        return Response.json({ ok: false, code: err.code, text: err.toToolText() });
      }
      const requestId = crypto.randomUUID().slice(0, 8);
      return Response.json({
        ok: false,
        code: "INTERNAL",
        text: `INTERNAL: Something went wrong. Try again or start a new demo workspace. Request ID ${requestId}.`,
      });
    }
  }

  private async dispatch(op: string, args: Record<string, unknown>): Promise<unknown> {
    if (op === "init") {
      const existing = this.load();
      if (existing) return { workspaceId: existing.workspaceId, expiresAt: existing.expiresAt };
      const workspaceId = String(args.workspaceId);
      const reviewToken = String(args.reviewToken);
      const state = await createWorkspaceState({
        workspaceId,
        reviewToken,
        seed,
        clock: clock(),
      });
      this.save(state);
      await this.ctx.storage.setAlarm(Date.now() + WORKSPACE_TTL_MS);
      return {
        workspaceId: state.workspaceId,
        expiresAt: state.expiresAt,
        reviewToken: state.reviewToken,
      };
    }

    const state = this.load();
    if (!state) {
      throw new BusinessError("WORKSPACE_NOT_FOUND", "Workspace not found", "Start a new demo workspace.");
    }
    assertNotExpired(state, clock());

    switch (op) {
      case "preview":
        return previewChange(state, String(args.claimId), Number(args.newValue));
      case "open": {
        const opened = openChange(state, String(args.claimId), Number(args.newValue), clock());
        this.save(state);
        return opened;
      }
      case "get":
        return state;
      case "save_drafts": {
        const drafts = args.drafts as Array<{ assetId: string; text: string }>;
        const results = await saveDrafts(state, drafts, clock());
        this.save(state);
        return { results, counts: state.assets.map((a) => a.status) };
      }
      case "reviewer_edit": {
        const result = await saveReviewerEdit(
          state,
          {
            reviewToken: String(args.reviewToken),
            assetId: String(args.assetId),
            baseVersion: Number(args.baseVersion),
            text: String(args.text),
          },
          clock(),
        );
        this.save(state);
        return result;
      }
      case "decision": {
        const decisionArgs: {
          reviewToken: string;
          assetId: string;
          version: number;
          textHash: string;
          decision: "approve" | "reject";
          reason?: string;
        } = {
          reviewToken: String(args.reviewToken),
          assetId: String(args.assetId),
          version: Number(args.version),
          textHash: String(args.textHash),
          decision: args.decision as "approve" | "reject",
        };
        if (args.reason !== undefined) decisionArgs.reason = String(args.reason);
        const result = submitDecision(state, decisionArgs, clock());
        this.save(state);
        return { ...result, release: releaseStatus(state) };
      }
      case "board": {
        const filters: { marketIds?: string[]; assetId?: string } = {};
        if (Array.isArray(args.marketIds)) filters.marketIds = args.marketIds as string[];
        if (args.assetId !== undefined) filters.assetId = String(args.assetId);
        const items = boardItems(state, filters);
        return { state, items };
      }
      case "release":
        return { state, release: releaseStatus(state) };
      case "current": {
        const asset = state.assets.find((a) => a.id === String(args.assetId));
        return asset ? { version: currentMeta(asset), text: currentText(asset) } : null;
      }
      default:
        throw new BusinessError("INVALID_INPUT", "Unknown operation", "Use a documented tool.");
    }
  }
}
