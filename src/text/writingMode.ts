/**
 * Logical writing direction used by text and selectable-window layout.
 *
 * The library remains horizontal by default. When a caller opts into vertical
 * writing without specifying a direction, Japanese-style right-to-left column
 * flow is used.
 */
export type WritingMode = "horizontal-tb" | "vertical-rl" | "vertical-lr";

export const DEFAULT_WRITING_MODE: WritingMode = "horizontal-tb";
export const DEFAULT_VERTICAL_WRITING_MODE: WritingMode = "vertical-rl";

export interface WritingModeOptions {
  /** Explicit CSS-compatible writing mode. */
  readonly writingMode?: WritingMode;
  /**
   * Convenience opt-in for vertical writing.
   * Ignored when writingMode is explicitly supplied.
   */
  readonly vertical?: boolean;
}

/** Resolve public options while preserving horizontal backwards compatibility. */
export function resolveWritingMode(options: WritingModeOptions = {}): WritingMode {
  if (options.writingMode !== undefined) {
    return options.writingMode;
  }
  return options.vertical === true ? DEFAULT_VERTICAL_WRITING_MODE : DEFAULT_WRITING_MODE;
}

export function isVerticalWritingMode(mode: WritingMode): boolean {
  return mode === "vertical-rl" || mode === "vertical-lr";
}

/**
 * Maps a logical vertical column index to its physical column index.
 * vertical-rl starts at the right edge; vertical-lr starts at the left edge.
 */
export function verticalColumnIndex(
  logicalIndex: number,
  columnCount: number,
  mode: Extract<WritingMode, "vertical-rl" | "vertical-lr">,
): number {
  if (!Number.isInteger(logicalIndex) || logicalIndex < 0) {
    throw new Error("logicalIndex must be a non-negative integer.");
  }
  if (!Number.isInteger(columnCount) || columnCount <= 0) {
    throw new Error("columnCount must be a positive integer.");
  }
  return mode === "vertical-rl" ? columnCount - 1 - logicalIndex : logicalIndex;
}
