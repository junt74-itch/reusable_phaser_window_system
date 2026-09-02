import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const SOURCE = readFileSync(join(ROOT, "src/selection/SelectableWindow.ts"), "utf8");
const TYPES = readFileSync(join(ROOT, "src/selection/types.ts"), "utf8");

function refreshRowVisualsBody(): string {
  const start = SOURCE.indexOf("private refreshRowVisuals(): void {");
  const end = SOURCE.indexOf("private ensureRowLabelCount(", start);
  return SOURCE.slice(start, end);
}

describe("SelectableWindow rich label contract", () => {
  test("SelectableItem.label is string | RichText", () => {
    expect(TYPES.includes("label: string | RichText")).toBe(true);
  });

  test("refreshRowVisuals uses layoutRichText with unbounded width not layoutText", () => {
    const body = refreshRowVisualsBody();
    expect(body.includes("layoutRichText(")).toBe(true);
    expect(body.includes("layoutText(")).toBe(false);
    expect(body.includes("ROW_LABEL_LAYOUT_WIDTH")).toBe(true);
    expect(body.includes("ensureMeasurerForContents(")).toBe(true);
    const loopStart = body.indexOf("for (let index = visibleRange.start");
    expect(loopStart).toBeGreaterThan(-1);
    expect(body.slice(loopStart).includes("ensureMeasurerForContent(")).toBe(false);
    expect(body.slice(loopStart).includes("ensureMeasurerForContents(")).toBe(false);
  });

  test("refreshRowVisuals preflights glyphs and uses scaleFontMetrics baseline", () => {
    const body = refreshRowVisualsBody();
    expect(body.includes("flattenRichText(")).toBe(true);
    expect(body.includes("assertMeasurerHasGlyphs(")).toBe(true);
    expect(body.includes("scaleFontMetrics(")).toBe(true);
    expect(body.includes("run.fontSize")).toBe(true);
    expect(body.includes("computeRowLabelAlignOffset(")).toBe(true);
  });

  test("refreshRowVisuals does not set RichText directly on BitmapText", () => {
    const body = refreshRowVisualsBody();
    expect(body.includes("label.setText(item.label)")).toBe(false);
    expect(body.includes("label.setText(run.text)")).toBe(true);
    expect(body.includes("add.text")).toBe(false);
  });
});
