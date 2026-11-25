import type { Finding, Findings } from "../contracts.js";
import { findDurationMentions, hasDurationMention, mentionMatchesValue } from "./duration.js";
import { graphemeCount, nfc, normalizeForPhrase } from "./text.js";

export interface CheckContext {
  market: {
    id: string;
    bannedPhrases: string[];
    disclaimer: string;
  };
  channel: {
    id: string;
    maxChars: number;
    requiresDisclaimer: boolean;
  };
  claimValue: number;
  assetWasAffected: boolean;
}

function finding(code: string, message: string, detail?: string): Finding {
  return detail ? { code, message, detail } : { code, message };
}

function phraseOccurs(haystackNorm: string, phraseNorm: string): boolean {
  if (!phraseNorm) return false;
  const escaped = phraseNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
  return re.test(haystackNorm);
}

export function runChecks(text: string, ctx: CheckContext): Findings {
  const blocking: Finding[] = [];
  const warnings: Finding[] = [];
  const normalized = nfc(text);
  const mentions = findDurationMentions(normalized);
  const hasMention = mentions.length > 0;

  const chars = graphemeCount(normalized);
  if (chars > ctx.channel.maxChars) {
    blocking.push(
      finding(
        "TOO_LONG",
        `Shorten the copy to at most ${ctx.channel.maxChars} characters. It is ${chars} now.`,
      ),
    );
  }

  const wrong = mentions.some((m) => !mentionMatchesValue(m.rawNumber, ctx.claimValue));
  if (wrong) {
    blocking.push(
      finding(
        "STALE_OR_WRONG_VALUE",
        `Replace every duration mention so it is exactly ${ctx.claimValue} hours (write the integer, not a decimal).`,
      ),
    );
  }

  const disclaimer = ctx.market.disclaimer;
  const disclaimerPresent = disclaimer.length > 0 && normalized.includes(disclaimer);
  if (hasMention && ctx.channel.requiresDisclaimer && !disclaimerPresent) {
    blocking.push(
      finding(
        "MISSING_DISCLAIMER",
        `Add this exact footnote: ${disclaimer}`,
      ),
    );
  }

  if (disclaimerPresent) {
    const without = normalized.replace(disclaimer, "");
    if (!without.includes("*")) {
      blocking.push(
        finding(
          "MISSING_FOOTNOTE_MARKER",
          "Keep an asterisk (*) in the copy once the footnote is present.",
        ),
      );
    }
  }

  const hay = normalizeForPhrase(normalized);
  for (const phrase of ctx.market.bannedPhrases) {
    const needle = normalizeForPhrase(phrase);
    if (phraseOccurs(hay, needle)) {
      blocking.push(
        finding("BANNED_PHRASE", `Remove the banned phrase “${phrase}”.`, phrase),
      );
    }
  }

  if (/<[^>]+>/.test(normalized) || /https?:\/\//i.test(normalized) || /\bwww\./i.test(normalized)) {
    blocking.push(
      finding("FORBIDDEN_MARKUP", "Remove HTML tags and URLs (http://, https://, www.)."),
    );
  }

  if (ctx.assetWasAffected && !hasDurationMention(normalized)) {
    warnings.push(
      finding(
        "CLAIM_NOT_MENTIONED",
        "This asset was affected by the claim change but the text has no hours duration.",
      ),
    );
  }

  return { blocking, warnings };
}
