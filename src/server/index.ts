const VERSION = "0.1.0";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return Response.json({ version: VERSION, commit: "dev" });
    }
    return new Response("Not found", { status: 404 });
  },
};
