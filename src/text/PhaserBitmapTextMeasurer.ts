import Phaser from "phaser";
import { resolveBitmapFontBase } from "./fontMetrics.ts";
import type {
  BitmapFontNativeMetrics,
  BitmapTextMeasurement,
  BitmapTextMeasureStyle,
  OwnedBitmapTextMeasurer,
} from "./types.ts";
import { BitmapFontNotLoadedError } from "./types.ts";

/**
 * Phaser-backed bitmap text measurer using loaded cache entries only.
 */
export class PhaserBitmapTextMeasurer implements OwnedBitmapTextMeasurer {
  public readonly nativeFontSize: number;
  public readonly lineHeight: number;
  public readonly base: number;
  public readonly fontKeys: readonly string[];
  private readonly probe: Phaser.GameObjects.BitmapText;
  private destroyed = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    public readonly fontKey: string,
  ) {
    const entry = scene.cache.bitmapFont.get(fontKey);
    if (entry === undefined) {
      throw new BitmapFontNotLoadedError(fontKey);
    }
    this.fontKeys = [fontKey];
    this.nativeFontSize = entry.data.size;
    this.lineHeight = entry.data.lineHeight;
    this.base = resolveBitmapFontBase(entry.data);
    this.probe = scene.make.bitmapText({
      x: -10000,
      y: -10000,
      font: fontKey,
      text: "",
      size: this.nativeFontSize,
    });
    this.probe.setVisible(false);
  }

  public hasGlyph(codePoint: number): boolean {
    const entry = this.scene.cache.bitmapFont.get(this.fontKey);
    if (entry === undefined) {
      return false;
    }
    return entry.data.chars[codePoint] !== undefined;
  }

  public hasGlyphFor(fontKey: string, codePoint: number): boolean {
    return fontKey === this.fontKey && this.hasGlyph(codePoint);
  }

  public fontKeyFor(_codePoint: number): string {
    return this.fontKey;
  }

  public fontMetrics(_fontKey?: string): BitmapFontNativeMetrics {
    return {
      fontKey: this.fontKey,
      nativeFontSize: this.nativeFontSize,
      lineHeight: this.lineHeight,
      base: this.base,
    };
  }

  public measure(text: string, style: BitmapTextMeasureStyle): BitmapTextMeasurement {
    this.applyStyle(style);
    this.probe.setText(text);
    const bounds = this.probe.getTextBounds(true);
    return {
      width: Math.ceil(bounds.global.width),
      height: Math.ceil(bounds.global.height),
    };
  }

  public measureRun(text: string, style: BitmapTextMeasureStyle): BitmapTextMeasurement {
    return this.measure(text, style);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.probe.destroy();
  }

  private applyStyle(style: BitmapTextMeasureStyle): void {
    this.probe.setFontSize(style.fontSize);
    this.probe.setScale(style.scale);
    this.probe.setLetterSpacing(style.letterSpacing);
  }
}
