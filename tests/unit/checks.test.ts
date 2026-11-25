import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runChecks } from "../../src/domain/checks.js";
import { createWorkspaceState } from "../../src/domain/workspace.js";
import type { SeedData } from "../../src/domain/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seed = JSON.parse(readFileSync(join(root, "data/maison-aube.json"), "utf8")) as SeedData;
const checkCases = JSON.parse(
  readFileSync(join(root, "fixtures/check-cases.json"), "utf8"),
) as {
  cases: Array<{
    id: string;
    marketId: string;
    channelId: string;
    claimValue: number;
    assetWasAffected: boolean;
    text: string;
    expectBlocking: string[];
    expectWarnings: string[];
  }>;
};
const drafts = JSON.parse(readFileSync(join(root, "fixtures/demo-drafts.json"), "utf8")) as {
  goodDraftsAt24: Record<string, string>;
  badAgencyDraft: { assetId: string; text: string; expectedBlocking: string[] };
};

function ctx(
  marketId: string,
  channelId: string,
  claimValue: number,
  assetWasAffected: boolean,
) {
  const market = seed.markets.find((m) => m.id === marketId);
  const channel = seed.channels.find((c) => c.id === channelId);
  if (!market || !channel) throw new Error("missing seed row");
  return { market, channel, claimValue, assetWasAffected };
}

describe("runChecks fixtures", () => {
  for (const c of checkCases.cases) {
    it(c.id, () => {
      const result = runChecks(c.text, ctx(c.marketId, c.channelId, c.claimValue, c.assetWasAffected));
      expect(result.blocking.map((f) => f.code).sort()).toEqual([...c.expectBlocking].sort());
      expect(result.warnings.map((f) => f.code).sort()).toEqual([...c.expectWarnings].sort());
    });
  }
});

describe("baseline and reference drafts", () => {
  it("all baseline assets have no blocking findings at value 48", async () => {
    const state = await createWorkspaceState({
      workspaceId: "ws_AAAAAAAAAAAAAAAAAAAAAA",
      reviewToken: "token",
      seed,
      clock: { now: () => new Date("2026-11-25T12:00:00.000Z") },
    });
    for (const asset of state.assets) {
      const v = asset.versions[0];
      expect(v?.checks.blocking, asset.id).toEqual([]);
    }
  });

  it("all goodDraftsAt24 pass with no findings", () => {
    for (const [assetId, text] of Object.entries(drafts.goodDraftsAt24)) {
      const asset = seed.assets.find((a) => a.id === assetId);
      if (!asset) throw new Error(assetId);
      const result = runChecks(text, ctx(asset.marketId, asset.channelId, 24, true));
      expect(result.blocking, assetId).toEqual([]);
      expect(result.warnings, assetId).toEqual([]);
    }
  });

  it("badAgencyDraft yields exactly its expected codes", () => {
    const { assetId, text, expectedBlocking } = drafts.badAgencyDraft;
    const asset = seed.assets.find((a) => a.id === assetId);
    if (!asset) throw new Error(assetId);
    const result = runChecks(text, ctx(asset.marketId, asset.channelId, 24, true));
    expect(result.blocking.map((f) => f.code)).toEqual(expectedBlocking);
  });
});
