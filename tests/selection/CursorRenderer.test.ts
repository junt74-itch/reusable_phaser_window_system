import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cursorBlinkVisible } from "../../src/selection/cursorBlink.ts";
import { resolveWindowTheme } from "../../src/core/theme.ts";

const ROOT = resolve(import.meta.dir, "../..");

describe("cursorBlinkVisible", () => {
  test("period zero keeps the cursor visible", () => {
    expect(cursorBlinkVisible(0, 0)).toBe(true);
    expect(cursorBlinkVisible(999, 0)).toBe(true);
  });

  test("period splits elapsed time into on and off halves", () => {
    expect(cursorBlinkVisible(0, 800)).toBe(true);
    expect(cursorBlinkVisible(399, 800)).toBe(true);
    expect(cursorBlinkVisible(400, 800)).toBe(false);
    expect(cursorBlinkVisible(799, 800)).toBe(false);
    expect(cursorBlinkVisible(800, 800)).toBe(true);
  });
});

describe("CursorStyle blink defaults", () => {
  test("omitted blinkPeriodMs preserves a steady cursor", () => {
    const theme = resolveWindowTheme({ cursor: { color: 0xffffff, alpha: 0.3 } });
    expect(theme.cursor.blinkPeriodMs).toBe(0);
    expect(cursorBlinkVisible(120, theme.cursor.blinkPeriodMs)).toBe(true);
  });

  test("blink is owned by CursorRenderer not WindowBase", () => {
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    const cursor = readFileSync(join(ROOT, "src/selection/CursorRenderer.ts"), "utf8");
    expect(windowBase.includes("blink")).toBe(false);
    expect(cursor.includes("cursorBlinkVisible")).toBe(true);
    expect(cursor.includes("public update(deltaMs: number)")).toBe(true);
  });

  test("choice and long-list scenes omit blink so Phase 1 look is unchanged", () => {
    const choice = readFileSync(join(ROOT, "examples/scenes/ChoiceScene.ts"), "utf8");
    const longList = readFileSync(join(ROOT, "examples/scenes/LongListScene.ts"), "utf8");
    expect(choice.includes("blinkPeriodMs")).toBe(false);
    expect(longList.includes("blinkPeriodMs")).toBe(false);
  });
});
