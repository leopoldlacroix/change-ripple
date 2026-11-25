import { createMcpHandler } from "@modelcontextprotocol/server";
import { MAX_BODY_BYTES } from "../contracts.js";
import type { Env } from "./env.js";
import { LimiterDO } from "./limiter.js";
import { buildMcp } from "./mcp.js";
import { staticPages } from "./pages.js";
import { WorkspaceDO } from "./workspace-do.js";

export { LimiterDO, WorkspaceDO };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      const len = Number(request.headers.get("content-length") ?? "0");
      if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
        return new Response("INVALID_INPUT: Request body is too large. Keep it under 64 KB.", {
          status: 413,
        });
      }
      if (request.method === "POST") {
        const buf = await request.clone().arrayBuffer();
        if (buf.byteLength > MAX_BODY_BYTES) {
          return new Response("INVALID_INPUT: Request body is too large. Keep it under 64 KB.", {
            status: 413,
          });
        }
      }
      return createMcpHandler(() => buildMcp(env)).fetch(request);
    }
    return staticPages(request);
  },
};
