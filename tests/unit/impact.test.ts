import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { computeImpact } from "../../src/domain/impact.js";
import type { SeedData } from "../../src/domain/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seed = JSON.parse(readFileSync(join(root, "data/maison-aube.json"), "utf8")) as SeedData;
const expected = JSON.parse(readFileSync(join(root, "fixtures/expected-impact.json"), "utf8")) as {
  from: number;
  to: number;
  totalAssets: number;
  affectedCount: number;
  affected: string[];
  unaffected: string[];
  detectedBy: { tag: string[]; textScanOnly: string[] };
  affectedByMarket: Record<string, number>;
};

describe("impact", () => {
  it("matches expected-impact.json including detection reasons", () => {
    const claim = seed.claims[0];
    if (!claim) throw new Error("no claim");
    const impact = computeImpact(seed.assets, claim, 24, "DEMO-STUDY-B");
    expect(impact.totalAssets).toBe(expected.totalAssets);
    expect(impact.affectedCount).toBe(expected.affectedCount);
    expect(impact.from).toBe(expected.from);
    expect(impact.to).toBe(expected.to);
    const affected = impact.cells.filter((c) => c.affected).map((c) => c.assetId);
    const unaffected = impact.cells.filter((c) => !c.affected).map((c) => c.assetId);
    expect(affected).toEqual(expected.affected);
    expect([...unaffected].sort()).toEqual([...expected.unaffected].sort());
    const tag = impact.cells.filter((c) => c.detectedBy === "tag").map((c) => c.assetId);
    const scan = impact.cells.filter((c) => c.detectedBy === "text_scan").map((c) => c.assetId);
    expect(tag).toEqual(expected.detectedBy.tag);
    expect(scan).toEqual(expected.detectedBy.textScanOnly);
    expect(impact.affectedByMarket).toEqual(expected.affectedByMarket);
  });
});
