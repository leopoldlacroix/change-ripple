import { nfc } from "./text.js";

const UNIT =
  "(?:stunden|stunde|stündig\\p{L}*|heures|heure|hours|hour|horas|hora|ore|ora|hrs|std|hr|h)";
const SEP = "[ \\t\\u00A0\\u202F\\-\\u2010\\u2011\\u2013\\u2014]*";
const NUMBER = "(?<![\\p{L}\\p{N}])(?<!\\d[.,])(\\d{1,3}(?:[.,]\\d+)?)";

export interface DurationMention {
  rawNumber: string;
  index: number;
}

export function findDurationMentions(text: string): DurationMention[] {
  const re = new RegExp(`${NUMBER}${SEP}${UNIT}(?![\\p{L}\\p{N}])`, "giu");
  const out: DurationMention[] = [];
  const src = nfc(text);
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const rawNumber = m[1];
    if (rawNumber === undefined) continue;
    out.push({ rawNumber, index: m.index });
  }
  return out;
}

/** True when the captured number string is exactly the integer value, e.g. "24" not "24.0". */
export function mentionMatchesValue(rawNumber: string, value: number): boolean {
  return rawNumber === String(value);
}

export function hasDurationMention(text: string): boolean {
  return findDurationMentions(text).length > 0;
}

export function mentionsDifferFromValue(text: string, value: number): boolean {
  const mentions = findDurationMentions(text);
  if (mentions.length === 0) return false;
  return mentions.some((m) => !mentionMatchesValue(m.rawNumber, value));
}
