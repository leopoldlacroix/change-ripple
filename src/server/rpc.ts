import { BOARD_URI } from "../contracts.js";
import { BusinessError } from "../domain/errors.js";
import { newReviewToken, newWorkspaceId } from "../domain/text.js";
import type { Env } from "./env.js";

export async function limiterCall(
  env: Env,
  op: "has" | "create" | "drop",
  workspaceId: string,
): Promise<{ ok: boolean; code?: string }> {
  const stub = env.LIMITER.get(env.LIMITER.idFromName("global"));
  const res = await stub.fetch(
    new Request("https://limiter/", {
      method: "POST",
      body: JSON.stringify({ op, workspaceId }),
    }),
  );
  return (await res.json()) as { ok: boolean; code?: string };
}

export async function workspaceCall(
  env: Env,
  workspaceId: string,
  op: string,
  args: Record<string, unknown> = {},
): Promise<{ ok: boolean; result?: unknown; code?: string; text?: string }> {
  const stub = env.WORKSPACES.get(env.WORKSPACES.idFromName(workspaceId));
  const res = await stub.fetch(
    new Request("https://workspace/", {
      method: "POST",
      body: JSON.stringify({ op, args }),
    }),
  );
  return (await res.json()) as { ok: boolean; result?: unknown; code?: string; text?: string };
}

export class RpcError extends Error {
  readonly code: string;
  readonly toolText: string;
  constructor(code: string, toolText: string) {
    super(toolText);
    this.code = code;
    this.toolText = toolText;
  }
}

export async function requireWorkspace(
  env: Env,
  workspaceId: string,
  op: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const known = await limiterCall(env, "has", workspaceId);
  if (!known.ok) {
    throw new RpcError(
      "WORKSPACE_NOT_FOUND",
      "WORKSPACE_NOT_FOUND: Workspace not found. Start a new demo workspace.",
    );
  }
  const res = await workspaceCall(env, workspaceId, op, args);
  if (!res.ok) {
    throw new RpcError(res.code ?? "INTERNAL", res.text ?? "INTERNAL: Something went wrong. Try again.");
  }
  return res.result;
}

export async function createWorkspace(env: Env): Promise<{
  workspaceId: string;
  expiresAt: string;
  reviewToken: string;
}> {
  const workspaceId = newWorkspaceId();
  const created = await limiterCall(env, "create", workspaceId);
  if (!created.ok) {
    throw new BusinessError(
      "DEMO_CAPACITY",
      "The daily demo limit was reached",
      "Try again after 00:00 UTC.",
    );
  }
  const res = await workspaceCall(env, workspaceId, "init", {
    workspaceId,
    reviewToken: newReviewToken(),
  });
  if (!res.ok || !res.result) {
    throw new BusinessError("INTERNAL", "Could not create the workspace", "Try again.");
  }
  return res.result as { workspaceId: string; expiresAt: string; reviewToken: string };
}

export { BOARD_URI };
