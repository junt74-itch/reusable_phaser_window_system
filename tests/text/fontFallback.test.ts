import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveWindowTheme } from "../../src/core/theme.ts";
import { WindowConfigError } from "../../src/core/types.ts";
import { FallbackBitmapTextMeasurer } from "../../src/text/FallbackBitmapTextMeasurer.ts";
import {
  assertFontSwapAllowed,
  resolveLabelFontRuns,
  splitTextFontRuns,
} from "../../src/text/fontFallback.ts";
import { layoutText } from "../../src/text/TextLayout.ts";
import type { BitmapTextMeasureStyle, OwnedBitmapTextMeasurer } from "../../src/text/types.ts";
import { FontSwapBusyError, MissingBitmapGlyphError } from "../../src/text/types.ts";

const ROOT = resolve(import.meta.dir, "../..");

const style: BitmapTextMeasureStyle = {
  fontKey: "primary",
  fontSize: 12,
  scale: 1,
  letterSpacing: 0,
};

class FakeMeasurer implements OwnedBitmapTextMeasurer {
  public readonly fontKeys: readonly string[];
  public readonly nativeFontSize = 12;
  public readonly lineHeight = 14;
  public readonly base = 11;
  private readonly supported = new Set<number>();

  public constructor(
    public readonly fontKey: string,
    chars: string,
    private readonly glyphWidth: number,
  ) {
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

  public hasGlyphFor(fontKey: string, codePoint: number): boolean {
    return fontKey === this.fontKey && this.hasGlyph(codePoint);
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
    return { width: text.length * this.glyphWidth, height: 14 };
  }

  public measureRun(text: string, measureStyle: BitmapTextMeasureStyle): { width: number; height: number } {
    return this.measure(text, measureStyle);
  }

  public destroy(): void {}
}

describe("font fallback", () => {
  test("uses the next builder key for a glyph missing from the primary", () => {
    const chain = new FallbackBitmapTextMeasurer([
      new FakeMeasurer("primary", "a ", 6),
      new FakeMeasurer("fallback", "ab ", 10),
    ]);
    const result = layoutText("ab", chain, { width: 200, height: 40, style, lineSpacing: 0 });
    expect(result.lines[0]?.text).toBe("ab");
    expect(result.lines[0]?.width).toBe(16);
    expect(chain.fontKeyFor("a".codePointAt(0) ?? 0)).toBe("primary");
    expect(chain.fontKeyFor("b".codePointAt(0) ?? 0)).toBe("fallback");
  });

  test("exhaustion throws with every tried builder key and no system font", () => {
    const chain = new FallbackBitmapTextMeasurer([
      new FakeMeasurer("primary", "a", 6),
      new FakeMeasurer("fallback", "a", 6),
    ]);
    try {
      layoutText("z", chain, { width: 40, height: 40, style, lineSpacing: 0 });
      throw new Error("expected MissingBitmapGlyphError");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingBitmapGlyphError);
      if (error instanceof MissingBitmapGlyphError) {
        expect(error.triedKeys).toEqual(["primary", "fallback"]);
        expect(error.fontKey).toBe("primary");
        expect(error.message.includes("Tried keys: primary, fallback")).toBe(true);
      }
    }
  });

  test("splitTextFontRuns groups contiguous glyphs that share a key", () => {
    const runs = splitTextFontRuns(
      "aaB",
      (codePoint) => (codePoint === 66 ? "fallback" : "primary"),
      "primary",
    );
    expect(runs).toEqual([
      { text: "aa", fontKey: "primary" },
      { text: "B", fontKey: "fallback" },
    ]);
  });

  test("resolveLabelFontRuns preflights then assigns fallback keys per glyph", () => {
    const chain = new FallbackBitmapTextMeasurer([
      new FakeMeasurer("primary", "a ", 6),
      new FakeMeasurer("fallback", "ab ", 10),
    ]);
    expect(resolveLabelFontRuns("ab", chain)).toEqual([
      { text: "a", fontKey: "primary" },
      { text: "b", fontKey: "fallback" },
    ]);
    try {
      resolveLabelFontRuns("az", chain);
      throw new Error("expected MissingBitmapGlyphError");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingBitmapGlyphError);
      if (error instanceof MissingBitmapGlyphError) {
        expect(error.triedKeys).toEqual(["primary", "fallback"]);
        expect(error.character).toBe("z");
      }
    }
  });

  test("busy font swap rejects without implying a system fallback", () => {
    expect(() => assertFontSwapAllowed(true)).toThrow(FontSwapBusyError);
    assertFontSwapAllowed(false);
  });
});

describe("fontKeys theme", () => {
  test("defaults fontKeys to the primary fontKey", () => {
    const theme = resolveWindowTheme({ text: { fontKey: "custom" } });
    expect(theme.text.fontKey).toBe("custom");
    expect(theme.text.fontKeys).toEqual(["custom"]);
  });

  test("uses fontKeys as the chain and sets fontKey to the first entry", () => {
    const theme = resolveWindowTheme({ text: { fontKeys: ["one", "two", "one"] } });
    expect(theme.text.fontKey).toBe("one");
    expect(theme.text.fontKeys).toEqual(["one", "two"]);
  });

  test("rejects empty font keys", () => {
    expect(() => resolveWindowTheme({ text: { fontKeys: [""] } })).toThrow(WindowConfigError);
  });
});

describe("font fallback isolation", () => {
  test("WindowBase has no font map, fallback, or setFontKey API", () => {
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(windowBase.includes("fontKeys")).toBe(false);
    expect(windowBase.includes("setFontKey")).toBe(false);
    expect(windowBase.includes("FontSwapBusyError")).toBe(false);
    expect(windowBase.includes("FallbackBitmapTextMeasurer")).toBe(false);
    expect(windowBase.includes("font-fallback")).toBe(false);
  });

  test("fallback modules never mention system or web fonts", () => {
    const files = [
      "src/text/fontFallback.ts",
      "src/text/FallbackBitmapTextMeasurer.ts",
      "src/text/TextLayout.ts",
      "src/text/TextWindowBase.ts",
      "src/selection/SelectableWindow.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(ROOT, relative), "utf8");
      expect(source.includes("Arial")).toBe(false);
      expect(source.includes("sans-serif")).toBe(false);
      expect(source.includes("add.text")).toBe(false);
      expect(source.includes("GameObjects.Text")).toBe(false);
    }
  });

  test("TextWindowBase owns setFontKey and checks busy before swapping", () => {
    const source = readFileSync(join(ROOT, "src/text/TextWindowBase.ts"), "utf8");
    const swapStart = source.indexOf("public setFontKey(");
    const swapBody = source.slice(swapStart, source.indexOf("protected isTextOperationBusy("));
    const busyAt = swapBody.indexOf("assertFontSwapAllowed");
    expect(busyAt).toBeGreaterThan(-1);
    expect(swapBody.indexOf("replaceMeasurer")).toBeGreaterThan(busyAt);
    expect(swapBody.indexOf("this.setTheme(")).toBeGreaterThan(busyAt);
  });

  test("SelectableWindow row labels use rich layout without wrap or primary-only setText", () => {
    const source = readFileSync(join(ROOT, "src/selection/SelectableWindow.ts"), "utf8");
    expect(source.includes("layoutRichText(")).toBe(true);
    expect(source.includes("layoutText(")).toBe(false);
    expect(source.includes("assertMeasurerHasGlyphs")).toBe(true);
    expect(source.includes("flattenRichText(")).toBe(true);
    expect(source.includes("scaleFontMetrics(")).toBe(true);
    expect(source.includes("label.setFont(run.fontKey)")).toBe(true);
    expect(source.includes("label.setFontSize(run.fontSize)")).toBe(true);
    expect(source.includes("label.setFont(this.theme.text.fontKey)")).toBe(false);
    expect(source.includes("label.setText(item.label)")).toBe(false);
  });
});
