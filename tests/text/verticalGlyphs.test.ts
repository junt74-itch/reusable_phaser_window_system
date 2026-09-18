import { describe, expect, test } from "bun:test";
import { getVerticalGlyphTransform, verticalPresentationForm } from "../../src/text/verticalGlyphs.ts";

describe("Japanese vertical glyph policy", () => {
  test("maps Japanese punctuation and brackets to Unicode vertical forms", () => {
    expect(verticalPresentationForm("、")).toBe("︑");
    expect(verticalPresentationForm("。")).toBe("︒");
    expect(verticalPresentationForm("「")).toBe("﹁");
    expect(verticalPresentationForm("」")).toBe("﹂");
    expect(verticalPresentationForm("（")).toBe("︵");
    expect(verticalPresentationForm("）")).toBe("︶");
  });

  test("rotates prolonged sound and dash-like marks clockwise", () => {
    expect(getVerticalGlyphTransform("ー").rotationDeg).toBe(90);
    expect(getVerticalGlyphTransform("―").rotationDeg).toBe(90);
    expect(getVerticalGlyphTransform("…").rotationDeg).toBe(90);
  });

  test("offsets small kana toward the vertical top-right optical position", () => {
    const small = getVerticalGlyphTransform("ゃ");
    expect(small.xEm).toBeGreaterThan(0);
    expect(small.yEm).toBeLessThan(0);
  });

  test("ordinary Japanese glyphs remain upright and unshifted", () => {
    expect(getVerticalGlyphTransform("縦")).toEqual({
      text: "縦",
      xEm: 0,
      yEm: 0,
      rotationDeg: 0,
    });
  });
});
