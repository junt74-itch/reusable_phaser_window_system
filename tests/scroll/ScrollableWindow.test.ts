import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ManualWindowInput } from "../helpers/ManualWindowInput.ts";
import { ScrollController } from "../../src/scroll/ScrollController.ts";
import { bindScrollInput } from "../../src/scroll/scrollInputBinding.ts";
import {
  computeScrollOffsetToReveal,
  computeVisibleRowRange,
  hitTestRowAtContentLocal,
} from "../../src/scroll/scrollVisibility.ts";
import {
  computeScrollbarTrackRect,
  isPointInContentViewport,
} from "../../src/scroll/scrollChrome.ts";
import { createScrollbarContentDragGate } from "../../src/scroll/scrollInputBinding.ts";
import type { WindowDragEvent } from "../../src/input/types.ts";

const ROOT = resolve(import.meta.dir, "../..");

describe("scrollVisibility helpers", () => {
  test("computeScrollOffsetToReveal scrolls down when row is below viewport", () => {
    expect(computeScrollOffsetToReveal(180, 200, 100, 0)).toBe(100);
  });

  test("computeVisibleRowRange bounds rendered rows", () => {
    const tops = Array.from({ length: 200 }, (_, index) => index * 20);
    const heights = Array.from({ length: 200 }, () => 20);
    const range = computeVisibleRowRange(tops, heights, 100, 100, 20);
    expect(range.end - range.start + 1).toBeLessThanOrEqual(9);
  });

  test("hitTestRowAtContentLocal adds scroll offset and clips to viewport", () => {
    const rows = [{ index: 3, x: 0, y: 80, width: 100, height: 20 }];
    expect(hitTestRowAtContentLocal(10, 10, 80, 100, 100, null, rows)).toBe(3);
    expect(hitTestRowAtContentLocal(10, 10, 0, 100, 100, null, rows)).toBeNull();
    expect(hitTestRowAtContentLocal(10, 150, 0, 100, 100, null, rows)).toBeNull();
  });

  test("hitTestRowAtContentLocal ignores the scrollbar track region", () => {
    const rows = [{ index: 0, x: 0, y: 0, width: 100, height: 20 }];
    const track = computeScrollbarTrackRect(100, 100, 8);
    expect(hitTestRowAtContentLocal(95, 10, 0, 100, 100, track, rows)).toBeNull();
    expect(isPointInContentViewport(95, 10, 100, 100, track)).toBe(false);
  });
});

describe("createScrollbarContentDragGate", () => {
  test("blocks content drag while the scrollbar owns the pointer", () => {
    let captured = false;
    const scrollbar = {
      isPointerCaptured: () => captured,
      containsContentLocalPoint: () => false,
    };
    const gate = createScrollbarContentDragGate(scrollbar, (worldX, worldY) => ({
      x: worldX,
      y: worldY,
    }));
    const event = { worldX: 10, worldY: 10 } as WindowDragEvent;
    expect(gate(event)).toBe(true);
    captured = true;
    expect(gate(event)).toBe(false);
  });

  test("blocks content drag over the track even before capture is set", () => {
    const track = computeScrollbarTrackRect(100, 100, 8);
    const scrollbar = {
      isPointerCaptured: () => false,
      containsContentLocalPoint: (x: number, y: number) =>
        isPointInContentViewport(x, y, 100, 100, track) === false && x >= track.x,
    };
    const gate = createScrollbarContentDragGate(scrollbar, (worldX, worldY) => ({
      x: worldX,
      y: worldY,
    }));
    expect(gate({ worldX: 95, worldY: 10 } as WindowDragEvent)).toBe(false);
    expect(gate({ worldX: 10, worldY: 10 } as WindowDragEvent)).toBe(true);
  });
});

describe("bindScrollInput", () => {
  test("routes page, wheel, and drag to ScrollController", () => {
    const input = new ManualWindowInput();
    const controller = new ScrollController();
    controller.setContentSize(200);
    controller.setViewportSize(80);
    bindScrollInput(input, controller, { canConsumeInput: () => true });
    input.pushAction("pageDown");
    expect(controller.getBounds().offset).toBeGreaterThan(0);
    input.pushWheel(0, 1);
    const afterWheel = controller.getBounds().offset;
    input.pushDrag("started", 1, 0, 0, 100, 100);
    input.pushDrag("moved", 1, 0, 10, 100, 90);
    expect(controller.getBounds().offset).toBeGreaterThan(afterWheel);
  });
});

describe("ScrollableWindow composition contract", () => {
  test("ScrollableWindow wraps scroll body in ScrollContentClip", () => {
    const scrollable = readFileSync(join(ROOT, "src/scroll/ScrollableWindow.ts"), "utf8");
    const clip = readFileSync(join(ROOT, "src/scroll/ScrollContentClip.ts"), "utf8");
    expect(scrollable.includes("ScrollContentClip")).toBe(true);
    expect(scrollable.includes("scrollClip.getViewport().add(this.scrollBody)")).toBe(true);
    expect(clip.includes("ContentClipper")).toBe(true);
    expect(clip.includes("cullChildren")).toBe(true);
  });

  test("ScrollableWindow composes ScrollController without WindowBase scroll API", () => {
    const scrollable = readFileSync(join(ROOT, "src/scroll/ScrollableWindow.ts"), "utf8");
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(scrollable.includes("extends WindowBase")).toBe(true);
    expect(scrollable.includes("scrollController")).toBe(true);
    expect(windowBase.includes("scroll")).toBe(false);
  });
});

describe("SelectableWindow scroll contract", () => {
  test("SelectableWindow composes scroll instead of throwing on overflow", () => {
    const source = readFileSync(join(ROOT, "src/selection/SelectableWindow.ts"), "utf8");
    expect(source.includes("ScrollController")).toBe(true);
    expect(source.includes("computeVisibleRowRange")).toBe(true);
    expect(source.includes("Phase 1")).toBe(false);
    expect(source.includes("hitTestRowAtContentLocal")).toBe(true);
    expect(source.includes("isPointerInInteractiveContent")).toBe(true);
    expect(source.includes("createScrollbarContentDragGate")).toBe(true);
    expect(source.includes('phase === "repeated"')).toBe(true);
    expect(source.includes("ScrollContentClip")).toBe(true);
  });

  test("200-item scripted offsets keep visible row count bounded", () => {
    const tops = Array.from({ length: 200 }, (_, index) => index * 20);
    const heights = Array.from({ length: 200 }, () => 20);
    let maxVisible = 0;
    for (let offset = 0; offset <= tops.length * 20 - 100; offset += 15) {
      const range = computeVisibleRowRange(tops, heights, offset, 100, 24);
      if (range.end >= range.start) {
        maxVisible = Math.max(maxVisible, range.end - range.start + 1);
      }
    }
    expect(maxVisible).toBeLessThan(15);
    expect(maxVisible).toBeGreaterThan(0);
  });
});

describe("ScrollbarRenderer contract", () => {
  test("scrollbar is optional and owns pointer capture helpers", () => {
    const scrollable = readFileSync(join(ROOT, "src/scroll/ScrollableWindow.ts"), "utf8");
    const scrollbar = readFileSync(join(ROOT, "src/scroll/ScrollbarRenderer.ts"), "utf8");
    expect(scrollable.includes("showScrollbar")).toBe(true);
    expect(scrollable.includes("createScrollbarContentDragGate")).toBe(true);
    expect(scrollbar.includes("isPointerCaptured")).toBe(true);
    expect(scrollbar.includes("pointerCaptured")).toBe(true);
  });
});
