import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { shouldStickToLatest } from "../../src/log/stickToLatest.ts";

const ROOT = resolve(import.meta.dir, "../..");
const SOURCE = readFileSync(join(ROOT, "src/log/LogWindow.ts"), "utf8");
const WINDOW_BASE = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");

function rebuildLabelsBody(): string {
  const start = SOURCE.indexOf("private rebuildLabels(): void {");
  const end = SOURCE.indexOf("private ensureMeasurerForEntries(", start);
  return SOURCE.slice(start, end);
}

function ensureMeasurerBody(): string {
  const start = SOURCE.indexOf("private ensureMeasurerForEntries(");
  const end = SOURCE.indexOf("private replaceMeasurer(", start);
  return SOURCE.slice(start, end);
}

describe("shouldStickToLatest", () => {
  test("sticks only when already at the bottom", () => {
    expect(shouldStickToLatest(0, 0)).toBe(true);
    expect(shouldStickToLatest(80, 80)).toBe(true);
    expect(shouldStickToLatest(40, 80)).toBe(false);
  });
});

describe("LogWindow isolation", () => {
  test("composes ScrollableWindow and does not add a WindowBase log API", () => {
    expect(SOURCE.includes("extends ScrollableWindow")).toBe(true);
    expect(SOURCE.includes("append(content: string | RichText)")).toBe(true);
    expect(SOURCE.includes("getEntries(): readonly (string | RichText)[]")).toBe(true);
    expect(SOURCE.includes("clear()")).toBe(true);
    expect(SOURCE.includes("shouldStickToLatest")).toBe(true);
    expect(SOURCE.includes("destroyLabels()")).toBe(true);
    expect(SOURCE.includes("add.text")).toBe(false);
    expect(WINDOW_BASE.includes("append(")).toBe(false);
    expect(WINDOW_BASE.includes("LogWindow")).toBe(false);
    expect(WINDOW_BASE.includes("log/")).toBe(false);
  });
});

describe("LogWindow rich-text rendering contract", () => {
  test("rebuildLabels calls layoutRichText per entry not layoutText", () => {
    const body = rebuildLabelsBody();
    expect(body.includes("layoutRichText(")).toBe(true);
    expect(body.includes("layoutText(")).toBe(false);
    expect(body.includes("for (const entry of this.entries)")).toBe(true);
  });

  test("rebuildLabels iterates line.runs with baseline positioning and entry stacking", () => {
    const body = rebuildLabelsBody();
    expect(body.includes("splitTextFontRuns")).toBe(false);
    expect(body.includes("line.runs")).toBe(true);
    expect(body.includes("line.ascent")).toBe(true);
    expect(body.includes("scaleFontMetrics(")).toBe(true);
    expect(body.includes("run.fontSize")).toBe(true);
    expect(body.includes("cursorY")).toBe(true);
    expect(body.includes("last.y + last.height + style.lineSpacing")).toBe(true);
  });

  test("append preserves shouldStickToLatest before rebuild and setOffset after", () => {
    const appendStart = SOURCE.indexOf("public append(content: string | RichText): void {");
    const appendEnd = SOURCE.indexOf("public clear(): void {", appendStart);
    const appendBody = SOURCE.slice(appendStart, appendEnd);
    expect(appendBody.includes("shouldStickToLatest")).toBe(true);
    expect(appendBody.indexOf("shouldStickToLatest")).toBeLessThan(appendBody.indexOf("rebuildLabels"));
    expect(appendBody.indexOf("rebuildLabels")).toBeLessThan(appendBody.indexOf("setOffset"));
  });

  test("ensureMeasurerForEntries throws BitmapFontNotLoadedError for unloaded specified font keys", () => {
    const body = ensureMeasurerBody();
    expect(body.includes("cache.bitmapFont.get")).toBe(true);
    expect(body.includes("BitmapFontNotLoadedError")).toBe(true);
  });

  test("ensureMeasurerForEntries does not call setTheme", () => {
    const body = ensureMeasurerBody();
    expect(body.includes("setTheme(")).toBe(false);
  });

  test("LogWindow avoids OS/CSS/Phaser Text fallbacks", () => {
    expect(SOURCE.includes("Arial")).toBe(false);
    expect(SOURCE.includes("sans-serif")).toBe(false);
    expect(SOURCE.includes("add.text")).toBe(false);
    expect(SOURCE.includes("GameObjects.Text")).toBe(false);
  });
});
