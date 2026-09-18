import { describe, expect, test } from "bun:test";
import {
  DEFAULT_VERTICAL_WRITING_MODE,
  DEFAULT_WRITING_MODE,
  isVerticalWritingMode,
  resolveWritingMode,
  verticalColumnIndex,
} from "../../src/text/writingMode.ts";

describe("writing mode", () => {
  test("keeps the library default horizontal", () => {
    expect(DEFAULT_WRITING_MODE).toBe("horizontal-tb");
    expect(resolveWritingMode()).toBe("horizontal-tb");
  });

  test("uses Japanese right-to-left flow as the vertical default", () => {
    expect(DEFAULT_VERTICAL_WRITING_MODE).toBe("vertical-rl");
    expect(resolveWritingMode({ vertical: true })).toBe("vertical-rl");
  });

  test("allows an explicit vertical-lr override", () => {
    expect(resolveWritingMode({ vertical: true, writingMode: "vertical-lr" })).toBe("vertical-lr");
    expect(isVerticalWritingMode("vertical-lr")).toBe(true);
  });

  test("maps vertical-rl logical columns from right to left", () => {
    expect([0, 1, 2].map((index) => verticalColumnIndex(index, 3, "vertical-rl"))).toEqual([2, 1, 0]);
    expect([0, 1, 2].map((index) => verticalColumnIndex(index, 3, "vertical-lr"))).toEqual([0, 1, 2]);
  });
});
