import type {
  BitmapTextMeasurer,
  BitmapTextMeasureStyle,
  LayoutLine,
  TextLayoutOptions,
  TextLayoutResult,
} from "./types.ts";
import { assertMeasurerHasGlyphs } from "./fontFallback.ts";

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function splitGraphemes(text: string): string[] {
  if (segmenter !== null) {
    return [...segmenter.segment(text)].map((part) => part.segment);
  }
  return [...text];
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Greedy bitmap-font-aware text layout without Phaser dependencies.
 * MVP does not implement Japanese kinsoku rules.
 */
export function layoutText(text: string, measurer: BitmapTextMeasurer, options: TextLayoutOptions): TextLayoutResult {
  if (options.width <= 0 || options.height <= 0) {
    throw new Error("Layout width and height must be positive.");
  }
  if (options.lineSpacing < 0 || !Number.isFinite(options.lineSpacing)) {
    throw new Error("lineSpacing must be a non-negative finite number.");
  }
  if (!Number.isInteger(options.style.scale) || options.style.scale <= 0) {
    throw new Error("style.scale must be a positive integer.");
  }

  const normalized = normalizeNewlines(text);
  for (const paragraph of normalized.split("\n")) {
    assertMeasurerHasGlyphs(paragraph, measurer);
  }

  const lineHeight = measurer.lineHeight * options.style.scale + options.lineSpacing;
  if (lineHeight <= 0) {
    throw new Error("Computed line height must be positive.");
  }
  const pageCapacity = Math.max(1, Math.floor(options.height / lineHeight));

  const paragraphs = normalized.split("\n");
  const lines: LayoutLine[] = [];
  let pageIndex = 0;
  let lineInPage = 0;
  let sourceCursor = 0;

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex] ?? "";
    const paragraphStart = sourceCursor;
    if (paragraph.length === 0) {
      lines.push({
        text: "",
        sourceRange: { start: paragraphStart, end: paragraphStart },
        width: 0,
        y: lineInPage * lineHeight,
        pageIndex,
      });
      lineInPage += 1;
      if (lineInPage >= pageCapacity) {
        pageIndex += 1;
        lineInPage = 0;
      }
    } else {
      const wrapped = wrapParagraph(paragraph, paragraphStart, measurer, options.style, options.width);
      for (const line of wrapped) {
        lines.push({
          ...line,
          y: lineInPage * lineHeight,
          pageIndex,
        });
        lineInPage += 1;
        if (lineInPage >= pageCapacity) {
          pageIndex += 1;
          lineInPage = 0;
        }
      }
    }
    sourceCursor += paragraph.length;
    if (paragraphIndex < paragraphs.length - 1) {
      sourceCursor += 1;
    }
  }

  return {
    lines,
    pageCount: pageIndex + 1,
  };
}

function wrapParagraph(
  paragraph: string,
  paragraphStart: number,
  measurer: BitmapTextMeasurer,
  style: BitmapTextMeasureStyle,
  maxWidth: number,
): LayoutLine[] {
  const tokens = tokenizeWords(paragraph);
  const lines: LayoutLine[] = [];
  let current = "";
  let currentStart = paragraphStart;
  let tokenOffset = paragraphStart;

  const flush = (): void => {
    lines.push({
      text: current,
      sourceRange: { start: currentStart, end: currentStart + current.length },
      width: current.length === 0 ? 0 : measurer.measure(current, style).width,
      y: 0,
      pageIndex: 0,
    });
    current = "";
    currentStart = tokenOffset;
  };

  for (const token of tokens) {
    const candidate = current.length === 0 ? token.text : `${current}${token.text}`;
    const width = measurer.measure(candidate, style).width;
    if (width <= maxWidth || current.length === 0) {
      if (current.length === 0) {
        currentStart = tokenOffset;
      }
      current = candidate;
    } else {
      flush();
      current = token.text;
      currentStart = tokenOffset;
      if (measurer.measure(current, style).width > maxWidth) {
        const graphemeLines = wrapLongToken(current, currentStart, measurer, style, maxWidth);
        for (const line of graphemeLines) {
          lines.push(line);
        }
        current = "";
        currentStart = tokenOffset + token.text.length;
      }
    }
    tokenOffset += token.text.length;
  }

  if (current.length > 0 || lines.length === 0) {
    flush();
  }

  return lines;
}

function wrapLongToken(
  token: string,
  tokenStart: number,
  measurer: BitmapTextMeasurer,
  style: BitmapTextMeasureStyle,
  maxWidth: number,
): LayoutLine[] {
  const graphemes = splitGraphemes(token);
  const lines: LayoutLine[] = [];
  let current = "";
  let currentStart = tokenStart;
  let index = tokenStart;

  for (const grapheme of graphemes) {
    const candidate = `${current}${grapheme}`;
    if (measurer.measure(candidate, style).width <= maxWidth || current.length === 0) {
      if (current.length === 0) {
        currentStart = index;
      }
      current = candidate;
    } else {
      lines.push({
        text: current,
        sourceRange: { start: currentStart, end: currentStart + current.length },
        width: measurer.measure(current, style).width,
        y: 0,
        pageIndex: 0,
      });
      current = grapheme;
      currentStart = index;
    }
    index += grapheme.length;
  }

  if (current.length > 0) {
    lines.push({
      text: current,
      sourceRange: { start: currentStart, end: currentStart + current.length },
      width: measurer.measure(current, style).width,
      y: 0,
      pageIndex: 0,
    });
  }

  return lines;
}

function tokenizeWords(paragraph: string): Array<{ text: string }> {
  const parts = paragraph.split(/(\s+)/);
  return parts.filter((part) => part.length > 0).map((text) => ({ text }));
}
