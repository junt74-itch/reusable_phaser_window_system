import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { WindowLayoutError } from "../../src/core/types.ts";
import { layoutWindowInViewport } from "../../src/layout/viewportLayout.ts";

const ROOT = resolve(import.meta.dir, "../..");

describe("layoutWindowInViewport", () => {
  test("returns integer bounds for bottom-center and top-center anchors", () => {
    const message = layoutWindowInViewport({
      viewportWidth: 960,
      viewportHeight: 540,
      width: 520,
      height: 140,
      margin: 40,
      anchor: "top-center",
    });
    expect(message).toEqual({ x: 220, y: 40, width: 520, height: 140 });
    expect(Number.isInteger(message.x)).toBe(true);
    expect(Number.isInteger(message.y)).toBe(true);

    const choice = layoutWindowInViewport({
      viewportWidth: 960,
      viewportHeight: 540,
      width: 280,
      height: 120,
      margin: 40,
      anchor: "bottom-center",
    });
    expect(choice).toEqual({ x: 340, y: 380, width: 280, height: 120 });
  });

  test("clamps to the inner viewport and throws when the box cannot stay positive", () => {
    const clamped = layoutWindowInViewport({
      viewportWidth: 200,
      viewportHeight: 100,
      width: 520,
      height: 140,
      margin: 10,
      anchor: "center",
    });
    expect(clamped.width).toBe(180);
    expect(clamped.height).toBe(80);
    expect(clamped.x).toBe(10);
    expect(clamped.y).toBe(10);

    expect(() =>
      layoutWindowInViewport({
        viewportWidth: 20,
        viewportHeight: 20,
        width: 100,
        height: 80,
        margin: 12,
      }),
    ).toThrow(WindowLayoutError);

    expect(() =>
      layoutWindowInViewport({
        viewportWidth: 100,
        viewportHeight: 80,
        width: 60,
        height: 40,
        margin: 8,
        padding: 40,
      }),
    ).toThrow(WindowLayoutError);
  });
});

describe("viewport layout isolation", () => {
  test("WindowBase does not subscribe to the camera or import layout helpers", () => {
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    const helper = readFileSync(join(ROOT, "src/layout/viewportLayout.ts"), "utf8");
    expect(windowBase.includes("viewportLayout")).toBe(false);
    expect(windowBase.includes("layoutWindowInViewport")).toBe(false);
    expect(windowBase.includes("cameras")).toBe(false);
    expect(helper.includes('from "phaser"')).toBe(false);
    expect(helper.includes("WindowBase")).toBe(false);
  });
});
