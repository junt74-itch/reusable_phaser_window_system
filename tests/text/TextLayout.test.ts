import { describe, expect, test } from "bun:test";
import { layoutText } from "../../src/text/TextLayout.ts";
import type { BitmapTextMeasurer, BitmapTextMeasureStyle } from "../../src/text/types.ts";
import { MissingBitmapGlyphError } from "../../src/text/types.ts";

const style: BitmapTextMeasureStyle = {
  fontKey: "test",
  fontSize: 12,
  scale: 1,
  letterSpacing: 0,
};

class FakeMeasurer implements BitmapTextMeasurer {
  public readonly fontKey: string;
  public readonly fontKeys: readonly string[];
  public readonly nativeFontSize = 12;
  public readonly lineHeight = 14;
  public readonly base = 11;
  private readonly supported = new Set<number>();

  public constructor(chars: string, fontKey = "test") {
    this.fontKey = fontKey;
    this.fontKeys = [fontKey];
    for (const char of chars) {
      const codePoint = char.codePointAt(0);
      if (codePoint !== undefined) {
        this.supported.add(codePoint);
      }
    }
  }

  public hasGlyph(codePoint: number): boolean {
    return this.supported.has(codePoint);
  }

  public fontKeyFor(_codePoint: number): string {
    return this.fontKey;
  }

  public fontMetrics() {
    return {
      fontKey: this.fontKey,
      nativeFontSize: this.nativeFontSize,
      lineHeight: this.lineHeight,
      base: this.base,
    };
  }

  public measure(text: string, measureStyle: BitmapTextMeasureStyle): { width: number; height: number } {
    void measureStyle;
    return { width: text.length * 6, height: 14 };
  }

  public measureRun(text: string, measureStyle: BitmapTextMeasureStyle): { width: number; height: number } {
    return this.measure(text, measureStyle);
  }
}

describe("layoutText", () => {
  test("wraps ascii and preserves blank lines", () => {
    const measurer = new FakeMeasurer("abcdefghijklmnopqrstuvwxyz \n");
    const result = layoutText("hello world\n\nnext", measurer, {
      width: 30,
      height: 100,
      style,
      lineSpacing: 0,
    });
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.some((line) => line.text === "")).toBe(true);
  });

  test("throws for unsupported emoji and bullet", () => {
    const measurer = new FakeMeasurer("abc");
    expect(() => layoutText("a😀", measurer, { width: 20, height: 40, style, lineSpacing: 0 })).toThrow(
      MissingBitmapGlyphError,
    );
    try {
      layoutText("•", measurer, { width: 20, height: 40, style, lineSpacing: 0 });
      throw new Error("expected MissingBitmapGlyphError");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingBitmapGlyphError);
      if (error instanceof MissingBitmapGlyphError) {
        expect(error.triedKeys).toEqual(["test"]);
        expect(error.fontKey).toBe("test");
      }
    }
  });

  test("allows explicit newline without a newline glyph", () => {
    const measurer = new FakeMeasurer("abc");
    const result = layoutText("a\nb", measurer, { width: 20, height: 40, style, lineSpacing: 0 });
    expect(result.lines.length).toBe(2);
  });
});


describe("vertical layout", () => {
  test("flows glyphs top-to-bottom and columns right-to-left by default vertical mode", () => {
    const measurer = new FakeMeasurer("abcdef");
    const result = layoutText("abcdef", measurer, {
      width: 42,
      height: 28,
      style,
      lineSpacing: 0,
      writingMode: "vertical-rl",
    });
    expect(result.lines.length).toBe(3);
    expect(result.lines.map((line) => line.text)).toEqual(["ab", "cd", "ef"]);
    expect((result.lines[0]?.x ?? 0)).toBeGreaterThan(result.lines[1]?.x ?? 0);
    expect(result.lines[0]?.runs.map((run) => run.y)).toEqual([0, 14]);
  });

  test("explicit newline starts the next column", () => {
    const measurer = new FakeMeasurer("abcd");
    const result = layoutText("ab\ncd", measurer, {
      width: 42,
      height: 100,
      style,
      lineSpacing: 0,
      writingMode: "vertical-rl",
    });
    expect(result.lines.map((line) => line.text)).toEqual(["ab", "cd"]);
    expect((result.lines[0]?.x ?? 0)).toBeGreaterThan(result.lines[1]?.x ?? 0);
  });
});
