import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stackedTextHeight } from "../../src/text/stackedText.ts";

const ROOT = resolve(import.meta.dir, "../..");
const SOURCE = readFileSync(join(ROOT, "src/document/DocumentWindow.ts"), "utf8");
const WINDOW_BASE = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");

function rebuildLabelsBody(): string {
  const start = SOURCE.indexOf("private rebuildLabels(): void {");
  const end = SOURCE.indexOf("private ensureMeasurerForContent(", start);
  return SOURCE.slice(start, end);
}

function ensureMeasurerBody(): string {
  const start = SOURCE.indexOf("private ensureMeasurerForContent(");
  const end = SOURCE.indexOf("private replaceMeasurer(", start);
  return SOURCE.slice(start, end);
}

describe("DocumentWindow isolation", () => {
  test("layouts the full document on a ScrollableWindow body", () => {
    expect(SOURCE.includes("extends ScrollableWindow")).toBe(true);
    expect(SOURCE.includes("setDocument(content: string | RichText)")).toBe(true);
    expect(SOURCE.includes("getDocument(): string | RichText")).toBe(true);
    expect(SOURCE.includes("layoutRichText(")).toBe(true);
    expect(SOURCE.includes("setScrollContentSize")).toBe(true);
    expect(SOURCE.includes("setScrollOffset(0)")).toBe(true);
    expect(SOURCE.includes("say(")).toBe(false);
    expect(SOURCE.includes("add.text")).toBe(false);
    expect(WINDOW_BASE.includes("setDocument")).toBe(false);
    expect(WINDOW_BASE.includes("DocumentWindow")).toBe(false);
    expect(WINDOW_BASE.includes("document/")).toBe(false);
  });

  test("document height stacks wrapped lines for scrolling", () => {
    expect(stackedTextHeight(160, 16)).toBe(176);
  });
});

describe("DocumentWindow rich-text rendering contract", () => {
  test("rebuildLabels calls layoutRichText not layoutText", () => {
    const body = rebuildLabelsBody();
    expect(body.includes("layoutRichText(")).toBe(true);
    expect(body.includes("layoutText(")).toBe(false);
  });

  test("rebuildLabels iterates line.runs with baseline positioning", () => {
    const body = rebuildLabelsBody();
    expect(body.includes("splitTextFontRuns")).toBe(false);
    expect(body.includes("line.runs")).toBe(true);
    expect(body.includes("line.ascent")).toBe(true);
    expect(body.includes("scaleFontMetrics(")).toBe(true);
    expect(body.includes("run.fontSize")).toBe(true);
  });

  test("ensureMeasurerForContent throws BitmapFontNotLoadedError for unloaded specified font keys", () => {
    const body = ensureMeasurerBody();
    expect(body.includes("cache.bitmapFont.get")).toBe(true);
    expect(body.includes("BitmapFontNotLoadedError")).toBe(true);
  });

  test("ensureMeasurerForContent does not call setTheme", () => {
    const body = ensureMeasurerBody();
    expect(body.includes("setTheme(")).toBe(false);
  });

  test("DocumentWindow avoids OS/CSS/Phaser Text fallbacks", () => {
    expect(SOURCE.includes("Arial")).toBe(false);
    expect(SOURCE.includes("sans-serif")).toBe(false);
    expect(SOURCE.includes("add.text")).toBe(false);
    expect(SOURCE.includes("GameObjects.Text")).toBe(false);
  });
});
