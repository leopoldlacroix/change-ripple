import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callTool, startWorker, textOf } from "./helpers.js";
import type { Client } from "@modelcontextprotocol/client";
import type { Unstable_DevWorker } from "wrangler";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const drafts = JSON.parse(readFileSync(join(root, "fixtures/demo-drafts.json"), "utf8")) as {
  goodDraftsAt24: Record<string, string>;
  badAgencyDraft: { assetId: string; text: string };
};

const EXPECTED_TOOLS = [
  "start_demo_workspace",
  "preview_claim_change",
  "open_change",
  "get_drafting_brief",
  "save_drafts",
  "open_review_board",
  "get_release_status",
  "save_reviewer_edit",
  "submit_decision",
];

describe("MCP integration", () => {
  let worker: Unstable_DevWorker;
  let client: Client;
  let origin: string;

  beforeAll(async () => {
    const started = await startWorker();
    worker = started.worker;
    client = started.client;
    origin = `http://${worker.address}:${worker.port}`;
  }, 60_000);

  afterAll(async () => {
    await client?.close();
    await worker?.stop();
  });

  it("healthz and static pages", async () => {
    const health = await fetch(`${origin}/healthz`);
    expect(health.status).toBe(200);
    for (const path of ["/", "/docs", "/privacy", "/terms", "/icon.svg"]) {
      const res = await fetch(`${origin}${path}`);
      expect(res.status, path).toBe(200);
    }
    expect((await fetch(`${origin}/nope`)).status).toBe(404);
  });

  it("tools/list has 9 tools with visibility and resourceUri", async () => {
    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name);
    expect(names).toEqual(EXPECTED_TOOLS);
    const preview = listed.tools.find((t) => t.name === "preview_claim_change");
    const ui = preview?._meta?.ui as { resourceUri?: string; visibility?: string[] } | undefined;
    expect(ui?.resourceUri).toBe("ui://change-ripple/board.html");
    const decision = listed.tools.find((t) => t.name === "submit_decision");
    const vis = (decision?._meta?.ui as { visibility?: string[] } | undefined)?.visibility;
    expect(vis).toEqual(["app"]);
  });

  it("resources/read returns the board HTML", async () => {
    const res = await client.readResource({ uri: "ui://change-ripple/board.html" });
    const text = res.contents[0] && "text" in res.contents[0] ? res.contents[0].text : "";
    expect(text).toContain("<div id=\"app\">");
    expect(String(res.contents[0]?.mimeType ?? "")).toContain("text/html");
  });

  it("exposes a briefing resource matching initialize instructions", async () => {
    const listed = await client.listResources();
    const uris = listed.resources.map((r) => r.uri);
    expect(uris).toContain("docs://change-ripple/briefing.md");
    const res = await client.readResource({ uri: "docs://change-ripple/briefing.md" });
    const text = res.contents[0] && "text" in res.contents[0] ? res.contents[0].text : "";
    expect(text).toContain("NO_OPEN_CHANGE");
    expect(text).toContain("20 of 24");
    expect(text).toContain("MISSING_DISCLAIMER");
  });

  it("replays the integration scenario", async () => {
    const start = await callTool(client, "start_demo_workspace");
    expect(start.isError).toBeFalsy();
    const sc = start.structuredContent as { workspaceId: string; assetCount: number };
    expect(sc.assetCount).toBe(24);
    const ws = sc.workspaceId;
    expect(textOf(start)).toContain(`Workspace ID ${ws}`);

    const preview = await callTool(client, "preview_claim_change", {
      workspaceId: ws,
      claimId: "hydration_duration",
      newValue: 24,
    });
    expect((preview.structuredContent as { affectedCount: number }).affectedCount).toBe(20);

    const before = await callTool(client, "get_release_status", { workspaceId: ws });
    expect((before.structuredContent as { state: string }).state).toBe("NO_OPEN_CHANGE");

    const badVal = await callTool(client, "preview_claim_change", {
      workspaceId: ws,
      claimId: "hydration_duration",
      newValue: 72,
    });
    expect(badVal.isError).toBe(true);
    expect(textOf(badVal)).toMatch(/^VALUE_NOT_APPROVED:/);

    const opened = await callTool(client, "open_change", {
      workspaceId: ws,
      claimId: "hydration_duration",
      newValue: 24,
    });
    expect((opened.structuredContent as { alreadyOpen: boolean; affectedCount: number }).alreadyOpen).toBe(
      false,
    );
    expect((opened.structuredContent as { affectedCount: number }).affectedCount).toBe(20);

    const again = await callTool(client, "open_change", {
      workspaceId: ws,
      claimId: "hydration_duration",
      newValue: 24,
    });
    expect((again.structuredContent as { alreadyOpen: boolean }).alreadyOpen).toBe(true);

    const bad = await callTool(client, "save_drafts", {
      workspaceId: ws,
      drafts: [{ assetId: drafts.badAgencyDraft.assetId, text: drafts.badAgencyDraft.text }],
    });
    const badRow = (bad.structuredContent as { results: Array<{ status: string; version: number; findings: { blocking: Array<{ code: string }> } }> }).results[0]!;
    expect(badRow.status).toBe("draft_failed");
    expect(badRow.version).toBe(2);
    expect(badRow.findings.blocking.map((f) => f.code)).toContain("MISSING_DISCLAIMER");

    const firstMarkets = ["FR", "DE", "ES"];
    const firstDrafts = Object.entries(drafts.goodDraftsAt24)
      .filter(([id]) => firstMarkets.includes(id.slice(0, 2)))
      .map(([assetId, text]) => ({ assetId, text }));
    expect(firstDrafts).toHaveLength(10);
    const batch = await callTool(client, "save_drafts", { workspaceId: ws, drafts: firstDrafts });
    const rows = (batch.structuredContent as { results: Array<{ status: string; assetId: string; version: number }> }).results;
    expect(rows.filter((r) => r.status === "pending_review")).toHaveLength(10);
    expect(rows.find((r) => r.assetId === "DE-product_page")?.version).toBe(3);

    const una = await callTool(client, "save_drafts", {
      workspaceId: ws,
      drafts: [{ assetId: "GB-social_post", text: "x" }],
    });
    expect((una.structuredContent as { results: Array<{ error?: string }> }).results[0]?.error).toBe(
      "NOT_AFFECTED",
    );

    const blocked = await callTool(client, "get_release_status", { workspaceId: ws });
    expect((blocked.structuredContent as { state: string; counts: Record<string, number> }).state).toBe(
      "BLOCKED",
    );
    expect((blocked.structuredContent as { counts: Record<string, number> }).counts).toMatchObject({
      stale: 10,
      pending_review: 10,
      approved: 0,
      rejected: 0,
      draft_failed: 0,
      unaffected: 4,
    });

    const deBoard = await callTool(client, "open_review_board", { workspaceId: ws, marketIds: ["DE"] });
    const deItems = (deBoard.structuredContent as { items: unknown[] }).items;
    expect(deItems).toHaveLength(3);
    expect((deBoard._meta as { reviewToken?: string }).reviewToken).toBeTruthy();
    expect(JSON.stringify(deBoard.structuredContent)).not.toContain(
      (deBoard._meta as { reviewToken: string }).reviewToken,
    );

    const stale = await callTool(client, "submit_decision", {
      workspaceId: ws,
      reviewToken: (deBoard._meta as { reviewToken: string }).reviewToken,
      assetId: "DE-product_page",
      version: 2,
      textHash: "deadbeef",
      decision: "approve",
    });
    expect(stale.isError).toBe(true);
    expect(textOf(stale)).toMatch(/^STALE_VERSION:/);

    const frBoard = await callTool(client, "open_review_board", { workspaceId: ws, marketIds: ["FR"] });
    const token = (frBoard._meta as { reviewToken: string }).reviewToken;
    const frPage = (
      frBoard.structuredContent as {
        items: Array<{ assetId: string; version: number; textHash: string; text: string }>;
      }
    ).items.find((i) => i.assetId === "FR-product_page")!;

    const wrongTok = await callTool(client, "submit_decision", {
      workspaceId: ws,
      reviewToken: "AAAAAAAAAAAAAAAAAAAAAA",
      assetId: "FR-product_page",
      version: frPage.version,
      textHash: frPage.textHash,
      decision: "approve",
    });
    expect(wrongTok.isError).toBe(true);
    expect(textOf(wrongTok)).toMatch(/^INVALID_REVIEW_TOKEN:/);

    const approveFr = await callTool(client, "submit_decision", {
      workspaceId: ws,
      reviewToken: token,
      assetId: "FR-product_page",
      version: frPage.version,
      textHash: frPage.textHash,
      decision: "approve",
    });
    expect((approveFr.structuredContent as { status: string }).status).toBe("approved");

    const deBullet = (
      (await callTool(client, "open_review_board", { workspaceId: ws, marketIds: ["DE"] })).structuredContent as {
        items: Array<{ assetId: string; version: number; textHash: string }>;
      }
    ).items.find((i) => i.assetId === "DE-marketplace_bullet")!;
    const noReason = await callTool(client, "submit_decision", {
      workspaceId: ws,
      reviewToken: token,
      assetId: "DE-marketplace_bullet",
      version: deBullet.version,
      textHash: deBullet.textHash,
      decision: "reject",
    });
    expect(noReason.isError).toBe(true);
    expect(textOf(noReason)).toMatch(/^REASON_REQUIRED:/);

    const rejectDe = await callTool(client, "submit_decision", {
      workspaceId: ws,
      reviewToken: token,
      assetId: "DE-marketplace_bullet",
      version: deBullet.version,
      textHash: deBullet.textHash,
      decision: "reject",
      reason: "Tone is too stiff",
    });
    expect((rejectDe.structuredContent as { status: string }).status).toBe("rejected");

    const mid = await callTool(client, "get_release_status", { workspaceId: ws });
    expect((mid.structuredContent as { counts: Record<string, number> }).counts).toMatchObject({
      stale: 10,
      pending_review: 8,
      approved: 1,
      rejected: 1,
      draft_failed: 0,
      unaffected: 4,
    });

    const edit = await callTool(client, "save_reviewer_edit", {
      workspaceId: ws,
      reviewToken: token,
      assetId: "FR-product_page",
      baseVersion: frPage.version,
      text: `${frPage.text} Nouveau.`,
    });
    expect((edit.structuredContent as { status: string; approvalCancelled: boolean }).status).toBe(
      "pending_review",
    );
    expect((edit.structuredContent as { approvalCancelled: boolean }).approvalCancelled).toBe(true);

    const remaining = Object.entries(drafts.goodDraftsAt24)
      .filter(([id]) => !firstMarkets.includes(id.slice(0, 2)))
      .map(([assetId, text]) => ({ assetId, text }));
    remaining.push({
      assetId: "DE-marketplace_bullet",
      text: `Neu: ${drafts.goodDraftsAt24["DE-marketplace_bullet"]}`,
    });
    const rest = await callTool(client, "save_drafts", { workspaceId: ws, drafts: remaining });
    const restRows = (rest.structuredContent as { results: Array<{ status: string; error?: string }> }).results;
    expect(restRows.every((r) => r.status === "pending_review" || r.error)).toBe(true);
    expect(restRows.filter((r) => r.status === "pending_review").length).toBeGreaterThanOrEqual(10);

    const waiting = await callTool(client, "get_release_status", { workspaceId: ws });
    expect((waiting.structuredContent as { state: string }).state).toBe("WAITING");
    expect((waiting.structuredContent as { counts: Record<string, number> }).counts.pending_review).toBe(20);

    const board = await callTool(client, "open_review_board", { workspaceId: ws });
    const all = (
      board.structuredContent as {
        items: Array<{ assetId: string; version: number; textHash: string; status: string }>;
      }
    ).items;
    const tok = (board._meta as { reviewToken: string }).reviewToken;
    for (const item of all) {
      const dec = await callTool(client, "submit_decision", {
        workspaceId: ws,
        reviewToken: tok,
        assetId: item.assetId,
        version: item.version,
        textHash: item.textHash,
        decision: "approve",
      });
      expect((dec.structuredContent as { status: string }).status).toBe("approved");
    }
    const ready = await callTool(client, "get_release_status", { workspaceId: ws });
    expect((ready.structuredContent as { state: string }).state).toBe("READY");
    const blob = JSON.stringify(ready);
    expect(blob.length).toBeLessThan(40_000);
  }, 120_000);

  it("schema-invalid call is rejected without leaking internals", async () => {
    const result = await callTool(client, "preview_claim_change", { workspaceId: "nope" });
    expect(result.isError).toBe(true);
    const t = textOf(result);
    expect(t.toLowerCase()).not.toContain("stack");
    expect(t.toLowerCase()).not.toContain("at object");
  });
});
