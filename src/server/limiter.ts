import { DurableObject } from "cloudflare:workers";
import { DEFAULT_DAILY_CAP } from "../contracts.js";
import type { Env } from "./env.js";

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export class LimiterDO extends DurableObject<Env> {
  private ready = false;

  private initSql(): void {
    if (this.ready) return;
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS days (day TEXT PRIMARY KEY, n INTEGER NOT NULL)",
    );
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS ids (id TEXT PRIMARY KEY, day TEXT NOT NULL)",
    );
    this.ready = true;
  }

  cap(): number {
    const raw = this.env.DEMO_DAILY_CAP;
    const n = raw ? Number(raw) : DEFAULT_DAILY_CAP;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_CAP;
  }

  override async fetch(request: Request): Promise<Response> {
    try {
    this.initSql();
    const body = (await request.json()) as { op: string; workspaceId?: string };
    if (body.op === "has") {
      const id = body.workspaceId ?? "";
      const rows = this.ctx.storage.sql.exec("SELECT 1 AS ok FROM ids WHERE id = ?", id).toArray();
      return Response.json({ ok: rows.length > 0 });
    }
    if (body.op === "create") {
      const id = body.workspaceId ?? "";
      const day = utcDay(new Date());
      const existing = this.ctx.storage.sql
        .exec("SELECT n FROM days WHERE day = ?", day)
        .toArray() as Array<{ n: number }>;
      const n = existing[0]?.n ?? 0;
      if (n >= this.cap()) {
        return Response.json({ ok: false, code: "DEMO_CAPACITY" });
      }
      this.ctx.storage.sql.exec(
        "INSERT INTO days (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1",
        day,
      );
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO ids (id, day) VALUES (?, ?)", id, day);
      return Response.json({ ok: true });
    }
    if (body.op === "drop") {
      const id = body.workspaceId ?? "";
      this.ctx.storage.sql.exec("DELETE FROM ids WHERE id = ?", id);
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false }, { status: 400 });
    } catch {
      return Response.json({ ok: false, code: "INTERNAL" }, { status: 500 });
    }
  }
}
