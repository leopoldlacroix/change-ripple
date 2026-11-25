import { describe, expect, it } from "vitest";
import { SERVER_INSTRUCTIONS } from "../../src/server/briefing.js";

describe("MCP initialize briefing", () => {
  it("states the job, seed, and expected first flow", () => {
    expect(SERVER_INSTRUCTIONS).toMatch(/Maison Aube/);
    expect(SERVER_INSTRUCTIONS).toMatch(/hydration_duration/);
    expect(SERVER_INSTRUCTIONS).toMatch(/48 hours/);
    expect(SERVER_INSTRUCTIONS).toMatch(/\b24\b/);
    expect(SERVER_INSTRUCTIONS).toMatch(/24 assets/);
    expect(SERVER_INSTRUCTIONS).toMatch(/Workspace ID/);
    expect(SERVER_INSTRUCTIONS).toMatch(/NO_OPEN_CHANGE/);
    expect(SERVER_INSTRUCTIONS).toMatch(/20 of 24/);
    expect(SERVER_INSTRUCTIONS).toMatch(/ES-email_subject/);
    expect(SERVER_INSTRUCTIONS).toMatch(/MISSING_DISCLAIMER/);
    expect(SERVER_INSTRUCTIONS).toMatch(/BLOCKED/);
    expect(SERVER_INSTRUCTIONS).not.toMatch(/compliant/);
  });
});
