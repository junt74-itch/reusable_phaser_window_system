/** Thrown when a code point is absent from the configured bitmap font. */
export class MissingBitmapGlyphError extends Error {
  public override readonly name = "MissingBitmapGlyphError";

  public constructor(
    public readonly fontKey: string,
    public readonly codePoint: number,
    public readonly character: string,
    public readonly sourceIndex: number,
  ) {
    super(
      `Missing glyph U+${codePoint.toString(16).toUpperCase().padStart(4, "0")} (${character}) at index ${sourceIndex} for font "${fontKey}".`,
    );
  }
}

/** Thrown when Phaser cache lacks the configured bitmap font key. */
export class BitmapFontNotLoadedError extends Error {
  public override readonly name = "BitmapFontNotLoadedError";

  public constructor(public readonly fontKey: string) {
    super(
      `Bitmap font "${fontKey}" is not loaded. Call scene.load.bitmapFont("${fontKey}", textureURL, fontDataURL) in preload().`,
    );
  }
}

export interface BitmapTextMeasureStyle {
  readonly fontKey: string;
  readonly fontSize: number;
  readonly scale: number;
  readonly letterSpacing: number;
}

export interface BitmapTextMeasurement {
  readonly width: number;
  readonly height: number;
}

/** Phaser-free measurement surface for layout. */
export interface BitmapTextMeasurer {
  readonly fontKey: string;
  readonly nativeFontSize: number;
  readonly lineHeight: number;
  hasGlyph(codePoint: number): boolean;
  measure(text: string, style: BitmapTextMeasureStyle): BitmapTextMeasurement;
}

export interface TextLineRange {
  readonly start: number;
  readonly end: number;
}

export interface LayoutLine {
  readonly text: string;
  readonly sourceRange: TextLineRange;
  readonly width: number;
  readonly y: number;
  readonly pageIndex: number;
}

export interface TextLayoutResult {
  readonly lines: readonly LayoutLine[];
  readonly pageCount: number;
}

export interface TextLayoutOptions {
  readonly width: number;
  readonly height: number;
  readonly style: BitmapTextMeasureStyle;
  readonly lineSpacing: number;
}
