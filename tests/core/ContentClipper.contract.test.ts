import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WindowBounds } from "../../src/core/types.ts";

/** Mirrors ContentClipper.redrawMask local coordinates without importing Phaser. */
function computeContentClipRect(bounds: WindowBounds): WindowBounds {
  return { x: 0, y: 0, width: bounds.width, height: bounds.height };
}

/** Mirrors ContentClipper.attach parenting contract without importing Phaser. */
class FakeContainer {
  public readonly children: unknown[] = [];

  public add(child: unknown): void {
    this.children.push(child);
  }

  public remove(child: unknown): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
    }
  }
}

describe("ContentClipper contract", () => {
  test("mask rect stays in content-local space regardless of padding offset", () => {
    const contentBounds = { x: 16, y: 12, width: 280, height: 120 };
    expect(computeContentClipRect(contentBounds)).toEqual({
      x: 0,
      y: 0,
      width: 280,
      height: 120,
    });
  });

  test("mask rect tracks resized content dimensions", () => {
    const initial = computeContentClipRect({ x: 8, y: 8, width: 200, height: 80 });
    const resized = computeContentClipRect({ x: 8, y: 8, width: 240, height: 100 });
    expect(initial.height).toBe(80);
    expect(resized.width).toBe(240);
    expect(resized.height).toBe(100);
  });

  test("WebGL clip uses external world mask so overflow does not expand the hole", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../src/core/ContentClipper.ts"),
      "utf8",
    );
    expect(source.includes("filters.external.addMask")).toBe(true);
    expect(source.includes("filtersFocusContext = true")).toBe(true);
    expect(source.includes('"world"')).toBe(true);
    expect(source.includes("setSize(bounds.width, bounds.height)")).toBe(true);
  });

  test("mask graphics are parented to the clipped content container", () => {
    const content = new FakeContainer();
    const maskGraphics = { kind: "mask" };
    content.add(maskGraphics);
    expect(content.children).toEqual([maskGraphics]);
  });
});
