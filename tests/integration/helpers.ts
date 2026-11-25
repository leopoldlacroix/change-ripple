import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { unstable_dev, type Unstable_DevWorker } from "wrangler";

export async function startWorker(): Promise<{
  worker: Unstable_DevWorker;
  url: URL;
  client: Client;
}> {
  const worker = await unstable_dev("src/server/index.ts", {
    config: "wrangler.toml",
    persist: false,
    experimental: { disableExperimentalWarning: true },
  });
  const url = new URL(`http://${worker.address}:${worker.port}/mcp`);
  const transport = new StreamableHTTPClientTransport(url);
  const client = new Client({ name: "change-ripple-tests", version: "0.0.0" });
  await client.connect(transport);
  return { worker, url, client };
}

export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
) {
  return client.callTool({ name, arguments: args });
}

export function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.map((c) => (c.type === "text" ? (c.text ?? "") : "")).join("\n");
}
