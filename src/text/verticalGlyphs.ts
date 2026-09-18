export interface VerticalGlyphTransform {
  /** Replacement character when the font exposes a Unicode vertical presentation form. */
  readonly text: string;
  /** Offset in em units, applied after normal vertical centering. */
  readonly xEm: number;
  readonly yEm: number;
  /** Clockwise rotation in degrees around the glyph center. */
  readonly rotationDeg: number;
}

const VERTICAL_FORMS: Readonly<Record<string, string>> = {
  "、": "︑",
  "。": "︒",
  "，": "︐",
  "：": "︓",
  "；": "︔",
  "！": "︕",
  "？": "︖",
  "「": "﹁",
  "」": "﹂",
  "『": "﹃",
  "』": "﹄",
  "（": "︵",
  "）": "︶",
  "〔": "︹",
  "〕": "︺",
  "【": "︻",
  "】": "︼",
  "《": "︽",
  "》": "︾",
  "〈": "︿",
  "〉": "﹀",
};

const ROTATE_CLOCKWISE = new Set(["ー", "―", "‐", "–", "—", "…", "‥"]);
const SMALL_KANA = new Set([
  "ぁ","ぃ","ぅ","ぇ","ぉ","っ","ゃ","ゅ","ょ","ゎ",
  "ァ","ィ","ゥ","ェ","ォ","ッ","ャ","ュ","ョ","ヮ","ヵ","ヶ",
]);

/**
 * Returns font-independent Japanese vertical-layout hints.
 *
 * Prefer Unicode vertical presentation forms when the active bitmap font has
 * them. The caller may fall back to the original glyph and positional hints.
 */
export function getVerticalGlyphTransform(char: string): VerticalGlyphTransform {
  const vertical = VERTICAL_FORMS[char];
  if (vertical !== undefined) {
    return { text: vertical, xEm: 0, yEm: 0, rotationDeg: 0 };
  }
  if (ROTATE_CLOCKWISE.has(char)) {
    return { text: char, xEm: 0, yEm: 0, rotationDeg: 90 };
  }
  if (char === "、" || char === "。") {
    return { text: char, xEm: 0.2, yEm: -0.2, rotationDeg: 0 };
  }
  if (SMALL_KANA.has(char)) {
    return { text: char, xEm: 0.12, yEm: -0.12, rotationDeg: 0 };
  }
  return { text: char, xEm: 0, yEm: 0, rotationDeg: 0 };
}

export function verticalPresentationForm(char: string): string | null {
  return VERTICAL_FORMS[char] ?? null;
}
