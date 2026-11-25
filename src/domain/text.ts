export function nfc(text: string): string {
  return text.normalize("NFC");
}

export function graphemeCount(text: string): number {
  const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
  return [...segmenter.segment(nfc(text))].length;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(nfc(text));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

export function utf16Length(text: string): number {
  return text.length;
}

/** NFC, lower case, each run of whitespace or hyphens/dashes becomes one space. */
export function normalizeForPhrase(text: string): string {
  return nfc(text)
    .toLowerCase()
    .replace(/[\s\u00A0\u202F\-\u2010\u2011\u2013\u2014]+/g, " ")
    .trim();
}

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ba.length, bb.length);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export function randomBase64Url16(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function newWorkspaceId(): string {
  return `ws_${randomBase64Url16()}`;
}

export function newReviewToken(): string {
  return randomBase64Url16();
}
