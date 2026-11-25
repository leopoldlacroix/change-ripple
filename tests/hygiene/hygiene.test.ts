import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".wrangler",
  "dist",
  "playwright-report",
  "test-results",
  "coverage",
  "blob-report",
]);

const TEXT_EXT = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".toml",
  ".yml",
  ".yaml",
  ".txt",
  ".svg",
  ".css",
  ".html",
  ".example",
]);

const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "anthropic key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "github pat", re: /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { name: "aws access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: "cloudflare token assignment",
    re: /\b(?:CF_API_TOKEN|CLOUDFLARE_API_TOKEN)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/,
  },
];

const INNER_HTML_APIS = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval)\s*[=(]/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function hasHead(): boolean {
  try {
    git(["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

function isBannedDotfile(rel: string): boolean {
  const base = rel.split("/").pop() ?? rel;
  if (base === ".env.example") return false;
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (base === ".dev.vars") return true;
  return extname(rel).toLowerCase() === ".pdf";
}

describe("hygiene", () => {
  it("does not track .pdf, .env, or .dev.vars", () => {
    if (!hasHead()) {
      const banned = walk(ROOT).map((p) => relative(ROOT, p)).filter(isBannedDotfile);
      expect(banned, `banned files in working tree: ${banned.join(", ")}`).toEqual([]);
      return;
    }
    const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);
    const banned = tracked.filter(isBannedDotfile);
    expect(banned, `tracked banned files: ${banned.join(", ")}`).toEqual([]);
  });

  it("has no .pdf files in the working tree", () => {
    const pdfs = walk(ROOT).filter((p) => extname(p).toLowerCase() === ".pdf");
    expect(pdfs, pdfs.join(", ")).toEqual([]);
  });

  it("scans the working tree for secret-like material", () => {
    const hits: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file);
      if (rel === "tests/hygiene/hygiene.test.ts") continue;
      if (!TEXT_EXT.has(extname(file)) && !file.endsWith(".gitignore")) continue;
      const text = readFileSync(file, "utf8");
      for (const { name, re } of SECRET_PATTERNS) {
        if (re.test(text)) hits.push(`${rel}: ${name}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("scans git history for secret-like material", () => {
    if (!hasHead()) {
      console.warn("hygiene: git history SKIPPED (no commits yet)");
      return;
    }
    const log = git(["log", "-p", "--all", "--", "."]);
    const hits: string[] = [];
    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(log)) hits.push(name);
    }
    expect(hits, `found in git history: ${hits.join(", ")}`).toEqual([]);
  });

  it("confidential-term scan", () => {
    const path = process.env.CONFIDENTIAL_TERMS_FILE;
    if (!path) {
      console.warn(
        "CONFIDENTIAL_TERMS_FILE unset: SKIPPED (must pass before release; file stays outside the repo)",
      );
      return;
    }
    expect(existsSync(path), `CONFIDENTIAL_TERMS_FILE not found: ${path}`).toBe(true);
    const terms = readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    expect(terms.length, "confidential terms file is empty").toBeGreaterThan(0);
    const hits: string[] = [];
    const files = walk(ROOT);
    for (const file of files) {
      const rel = relative(ROOT, file);
      if (!TEXT_EXT.has(extname(file))) continue;
      const text = readFileSync(file, "utf8");
      for (const term of terms) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          hits.push(`${rel}: ${term}`);
        }
      }
    }
    if (hasHead()) {
      const log = git(["log", "--all", "--format=%s%n%b"]);
      for (const term of terms) {
        if (log.toLowerCase().includes(term.toLowerCase())) {
          hits.push(`git history: ${term}`);
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("does not use innerHTML-family APIs in src/ui", () => {
    const uiRoot = join(ROOT, "src/ui");
    if (!existsSync(uiRoot)) return;
    const hits: string[] = [];
    for (const file of walk(uiRoot)) {
      if (extname(file) !== ".ts") continue;
      const text = readFileSync(file, "utf8");
      if (INNER_HTML_APIS.test(text)) hits.push(relative(ROOT, file));
    }
    expect(hits, hits.join(", ")).toEqual([]);
  });
});
