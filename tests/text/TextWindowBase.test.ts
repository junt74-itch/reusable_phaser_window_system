import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const SOURCE = readFileSync(join(ROOT, "src/text/TextWindowBase.ts"), "utf8");

function layoutTextContentBody(): string {
  const start = SOURCE.indexOf("protected layoutTextContent(");
  const end = SOURCE.indexOf("protected renderLines(", start);
  const helperStart = SOURCE.indexOf("protected ensureMeasurerForContent(");
  const helperEnd = SOURCE.indexOf("private replaceMeasurer(", helperStart);
  return SOURCE.slice(start, end) + SOURCE.slice(helperStart, helperEnd);
}

function renderLinesBody(): string {
  const start = SOURCE.indexOf("protected renderLines(");
  const end = SOURCE.indexOf("protected clearText(", start);
  return SOURCE.slice(start, end);
}

describe("TextWindowBase rich-text rendering contract", () => {
  test("layoutTextContent calls layoutRichText", () => {
    const body = layoutTextContentBody();
    expect(body.includes("layoutRichText(")).toBe(true);
    expect(body.includes("layoutText(")).toBe(false);
  });

  test("renderLines iterates line.runs and sets run fontSize", () => {
    const body = renderLinesBody();
    expect(body.includes("splitTextFontRuns")).toBe(false);
    expect(body.includes("line.runs")).toBe(true);
    expect(body.includes("setFontSize(run.fontSize)")).toBe(true);
  });

  test("renderLines y position uses line.ascent and scaleFontMetrics", () => {
    const body = renderLinesBody();
    expect(body.includes("line.ascent")).toBe(true);
    expect(body.includes("scaleFontMetrics(")).toBe(true);
  });

  test("layoutTextContent throws BitmapFontNotLoadedError for unloaded specified font keys", () => {
    const body = layoutTextContentBody();
    expect(body.includes("cache.bitmapFont.get")).toBe(true);
    expect(body.includes("BitmapFontNotLoadedError")).toBe(true);
  });

  test("layoutTextContent does not call setTheme", () => {
    const body = layoutTextContentBody();
    expect(body.includes("setTheme(")).toBe(false);
  });

  test("TextWindowBase avoids OS/CSS/Phaser Text fallbacks", () => {
    expect(SOURCE.includes("Arial")).toBe(false);
    expect(SOURCE.includes("sans-serif")).toBe(false);
    expect(SOURCE.includes("add.text")).toBe(false);
    expect(SOURCE.includes("GameObjects.Text")).toBe(false);
  });
});
