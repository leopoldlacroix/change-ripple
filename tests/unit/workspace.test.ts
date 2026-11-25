import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BusinessError } from "../../src/domain/errors.js";
import {
  createWorkspaceState,
  openChange,
  saveDrafts,
  saveReviewerEdit,
  submitDecision,
  releaseStatus,
} from "../../src/domain/workspace.js";
import type { SeedData } from "../../src/domain/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seed = JSON.parse(readFileSync(join(root, "data/maison-aube.json"), "utf8")) as SeedData;
const drafts = JSON.parse(readFileSync(join(root, "fixtures/demo-drafts.json"), "utf8")) as {
  goodDraftsAt24: Record<string, string>;
};

const token = "tokentokentokentoken12";
const ws = "ws_AAAAAAAAAAAAAAAAAAAAAA";
const clock = { now: () => new Date("2026-11-25T12:00:00.000Z") };

async function fresh() {
  const state = await createWorkspaceState({ workspaceId: ws, reviewToken: token, seed, clock });
  openChange(state, "hydration_duration", 24, clock);
  return state;
}

describe("save blank text", () => {
  it("creates no version through save_drafts", async () => {
    const state = await fresh();
    const before = state.assets.find((a) => a.id === "DE-product_page")!.versions.length;
    const results = await saveDrafts(state, [{ assetId: "DE-product_page", text: "   " }], clock);
    expect(results[0]?.error).toBe("INVALID_INPUT");
    expect(state.assets.find((a) => a.id === "DE-product_page")!.versions.length).toBe(before);
  });

  it("creates no version through save_reviewer_edit", async () => {
    const state = await fresh();
    const asset = state.assets.find((a) => a.id === "DE-product_page")!;
    await expect(
      saveReviewerEdit(
        state,
        { reviewToken: token, assetId: "DE-product_page", baseVersion: asset.versions[0]!.n, text: "" },
        clock,
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(asset.versions.length).toBe(1);
  });
});

describe("state machine", () => {
  it("change opened marks affected stale", async () => {
    const state = await fresh();
    expect(state.assets.filter((a) => a.status === "stale")).toHaveLength(20);
    expect(state.assets.filter((a) => a.status === "unaffected")).toHaveLength(4);
  });

  it("save with blocking findings -> draft_failed", async () => {
    const state = await fresh();
    const results = await saveDrafts(
      state,
      [
        {
          assetId: "DE-product_page",
          text: "Aube Dew Cream versorgt die Haut 24 Stunden lang mit Feuchtigkeit. Leichte Textur für jeden Tag.",
        },
      ],
      clock,
    );
    expect(results[0]?.status).toBe("draft_failed");
  });

  it("save without blocking -> pending_review then approve", async () => {
    const state = await fresh();
    const text = drafts.goodDraftsAt24["DE-product_page"]!;
    await saveDrafts(state, [{ assetId: "DE-product_page", text }], clock);
    const asset = state.assets.find((a) => a.id === "DE-product_page")!;
    expect(asset.status).toBe("pending_review");
    const v = asset.versions[asset.versions.length - 1]!;
    submitDecision(
      state,
      {
        reviewToken: token,
        assetId: "DE-product_page",
        version: v.n,
        textHash: v.textHash,
        decision: "approve",
      },
      clock,
    );
    expect(asset.status).toBe("approved");
  });

  it("reject from pending_review with reason", async () => {
    const state = await fresh();
    const text = drafts.goodDraftsAt24["DE-marketplace_bullet"]!;
    await saveDrafts(state, [{ assetId: "DE-marketplace_bullet", text }], clock);
    const asset = state.assets.find((a) => a.id === "DE-marketplace_bullet")!;
    const v = asset.versions[asset.versions.length - 1]!;
    submitDecision(
      state,
      {
        reviewToken: token,
        assetId: "DE-marketplace_bullet",
        version: v.n,
        textHash: v.textHash,
        decision: "reject",
        reason: "Tone is too stiff",
      },
      clock,
    );
    expect(asset.status).toBe("rejected");
  });

  it("reject without reason -> REASON_REQUIRED", async () => {
    const state = await fresh();
    const text = drafts.goodDraftsAt24["FR-product_page"]!;
    await saveDrafts(state, [{ assetId: "FR-product_page", text }], clock);
    const asset = state.assets.find((a) => a.id === "FR-product_page")!;
    const v = asset.versions[asset.versions.length - 1]!;
    expect(() =>
      submitDecision(
        state,
        {
          reviewToken: token,
          assetId: "FR-product_page",
          version: v.n,
          textHash: v.textHash,
          decision: "reject",
        },
        clock,
      ),
    ).toThrow(BusinessError);
  });

  it("cannot approve stale version", async () => {
    const state = await fresh();
    const text = drafts.goodDraftsAt24["FR-product_page"]!;
    await saveDrafts(state, [{ assetId: "FR-product_page", text }], clock);
    await saveDrafts(state, [{ assetId: "FR-product_page", text: `${text} ` }], clock);
    const first = state.assets.find((a) => a.id === "FR-product_page")!.versions[1]!;
    expect(() =>
      submitDecision(
        state,
        {
          reviewToken: token,
          assetId: "FR-product_page",
          version: first.n,
          textHash: first.textHash,
          decision: "approve",
        },
        clock,
      ),
    ).toThrow(expect.objectContaining({ code: "STALE_VERSION" }));
  });

  it("unaffected cannot be drafted", async () => {
    const state = await fresh();
    const results = await saveDrafts(
      state,
      [{ assetId: "GB-social_post", text: drafts.goodDraftsAt24["GB-product_page"]! }],
      clock,
    );
    expect(results[0]?.error).toBe("NOT_AFFECTED");
  });

  it("identical save after pending_review is a no-op", async () => {
    const state = await fresh();
    const text = drafts.goodDraftsAt24["IT-product_page"]!;
    await saveDrafts(state, [{ assetId: "IT-product_page", text }], clock);
    const asset = state.assets.find((a) => a.id === "IT-product_page")!;
    const n = asset.versions.length;
    await saveDrafts(state, [{ assetId: "IT-product_page", text }], clock);
    expect(asset.versions.length).toBe(n);
    expect(asset.status).toBe("pending_review");
  });

  it("while stale, saving baseline text still creates a version", async () => {
    const state = await fresh();
    const asset = state.assets.find((a) => a.id === "GB-email_subject")!;
    const baseline = asset.versions[0]!.text;
    await saveDrafts(state, [{ assetId: "GB-email_subject", text: baseline }], clock);
    expect(asset.versions.length).toBe(2);
  });

  it("different text on approved cancels approval", async () => {
    const state = await fresh();
    const text = drafts.goodDraftsAt24["US-email_subject"]!;
    await saveDrafts(state, [{ assetId: "US-email_subject", text }], clock);
    const asset = state.assets.find((a) => a.id === "US-email_subject")!;
    const v = asset.versions[asset.versions.length - 1]!;
    submitDecision(
      state,
      {
        reviewToken: token,
        assetId: "US-email_subject",
        version: v.n,
        textHash: v.textHash,
        decision: "approve",
      },
      clock,
    );
    await saveDrafts(state, [{ assetId: "US-email_subject", text: `${text}!` }], clock);
    expect(asset.status).not.toBe("approved");
    expect(state.events.some((e) => e.type === "approval_cancelled")).toBe(true);
  });
});

describe("properties", () => {
  it("no approved asset ever has blocking findings", async () => {
    const state = await fresh();
    for (const [id, text] of Object.entries(drafts.goodDraftsAt24)) {
      await saveDrafts(state, [{ assetId: id, text }], clock);
      const asset = state.assets.find((a) => a.id === id)!;
      const v = asset.versions[asset.versions.length - 1]!;
      if (asset.status === "pending_review") {
        submitDecision(
          state,
          {
            reviewToken: token,
            assetId: id,
            version: v.n,
            textHash: v.textHash,
            decision: "approve",
          },
          clock,
        );
      }
    }
    for (const a of state.assets.filter((x) => x.status === "approved")) {
      const v = a.versions[a.versions.length - 1]!;
      expect(v.checks.blocking, a.id).toEqual([]);
    }
    expect(releaseStatus(state).state).toBe("READY");
  });

  it("history only grows (newest first, max 20)", async () => {
    const state = await fresh();
    const start = state.events.length;
    const text = drafts.goodDraftsAt24["ES-email_subject"]!;
    await saveDrafts(state, [{ assetId: "ES-email_subject", text }], clock);
    expect(state.events.length).toBeGreaterThan(start);
    expect(state.events[0]?.seq).toBeGreaterThan(state.events[state.events.length - 1]!.seq);
  });
});
