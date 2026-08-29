import Phaser from "phaser";
import { WindowBase } from "../core/WindowBase.ts";
import type { WindowBounds, WindowConfig } from "../core/types.ts";
import { WindowDestroyedError, WindowConfigError } from "../core/types.ts";
import type { WindowBaseOptions } from "../core/WindowBase.ts";
import { layoutText } from "./TextLayout.ts";
import { createBitmapTextMeasurer } from "./FallbackBitmapTextMeasurer.ts";
import { BitmapFontNotLoadedError } from "./types.ts";
import type { LayoutLine, OwnedBitmapTextMeasurer, TextLayoutOptions, TextLayoutResult } from "./types.ts";
import { assertFontSwapAllowed, fontKeyChainsEqual, splitTextFontRuns } from "./fontFallback.ts";

/**
 * Bitmap-text rendering base without message progression.
 */
export abstract class TextWindowBase extends WindowBase {
  protected measurer: OwnedBitmapTextMeasurer;
  protected readonly textObjects: Phaser.GameObjects.BitmapText[] = [];
  private currentLayout: TextLayoutResult | null = null;

  public constructor(scene: Phaser.Scene, config: WindowConfig, options: WindowBaseOptions = {}) {
    super(scene, config, options);
    this.measurer = createBitmapTextMeasurer(scene, this.theme.text.fontKeys);
    this.applyBitmapSamplingToContent();
  }

  public setFontKey(key: string): this {
    if (this.isDestroyed()) {
      throw new WindowDestroyedError("Window has been destroyed.");
    }
    assertFontSwapAllowed(this.isTextOperationBusy());
    if (key.length === 0) {
      throw new WindowConfigError("text.fontKey must not be empty.");
    }
    if (this.scene.cache.bitmapFont.get(key) === undefined) {
      throw new BitmapFontNotLoadedError(key);
    }
    const fontKeys = [key, ...this.theme.text.fontKeys.filter((existing) => existing !== key)];
    this.replaceMeasurer(fontKeys);
    this.setTheme({
      text: {
        fontKey: key,
        fontKeys,
        fontSize: this.theme.text.fontSize,
        scale: this.theme.text.scale,
        tint: this.theme.text.tint,
        letterSpacing: this.theme.text.letterSpacing,
        lineSpacing: this.theme.text.lineSpacing,
      },
    });
    return this;
  }

  protected isTextOperationBusy(): boolean {
    return false;
  }

  protected getTextBodyOffsetY(): number {
    return 0;
  }

  protected getTextBodyOffsetX(): number {
    return 0;
  }

  protected getTextLayoutWidth(): number {
    return this.getContentBounds().width;
  }

  protected getTextLayoutHeight(): number {
    return this.getContentBounds().height;
  }

  protected layoutTextContent(text: string): TextLayoutResult {
    const options: TextLayoutOptions = {
      width: this.getTextLayoutWidth(),
      height: this.getTextLayoutHeight(),
      style: {
        fontKey: this.theme.text.fontKey,
        fontSize: this.theme.text.fontSize,
        scale: this.theme.text.scale,
        letterSpacing: this.theme.text.letterSpacing,
      },
      lineSpacing: this.theme.text.lineSpacing,
    };
    const result = layoutText(text, this.measurer, options);
    this.currentLayout = result;
    return result;
  }

  protected renderLines(lines: readonly LayoutLine[]): void {
    const style = this.theme.text;
    const contentBounds = this.getContentBounds();
    let slot = 0;
    for (const line of lines) {
      const runs = splitTextFontRuns(
        line.text,
        (codePoint) => this.measurer.fontKeyFor(codePoint),
        this.measurer.fontKey,
      );
      let x = this.getTextBodyOffsetX();
      for (const run of runs) {
        this.ensureTextObjectCount(slot + 1);
        const textObject = this.textObjects[slot];
        if (textObject === undefined) {
          continue;
        }
        textObject.setFont(run.fontKey);
        textObject.setText(run.text);
        textObject.setFontSize(style.fontSize);
        textObject.setScale(style.scale);
        textObject.setTint(style.tint);
        textObject.setLetterSpacing(style.letterSpacing);
        textObject.setPosition(Math.trunc(x), Math.trunc(line.y + this.getTextBodyOffsetY()));
        textObject.setVisible(true);
        if (run.text.length > 0) {
          x += this.measurer.measure(run.text, {
            fontKey: run.fontKey,
            fontSize: style.fontSize,
            scale: style.scale,
            letterSpacing: style.letterSpacing,
          }).width;
        }
        slot += 1;
      }
    }
    for (let index = slot; index < this.textObjects.length; index += 1) {
      this.textObjects[index]?.setVisible(false);
    }
    void contentBounds;
  }

  protected clearText(): void {
    for (const textObject of this.textObjects) {
      textObject.setText("");
      textObject.setVisible(false);
    }
    this.currentLayout = null;
  }

  protected getCurrentLayout(): TextLayoutResult | null {
    return this.currentLayout;
  }

  protected override onLayoutChanged(_contentBounds: WindowBounds): void {
    this.syncMeasurerToTheme();
  }

  public override destroy(): void {
    for (const textObject of this.textObjects) {
      textObject.destroy();
    }
    this.textObjects.length = 0;
    this.measurer.destroy();
    super.destroy();
  }

  protected ensureTextObjectCount(count: number): void {
    const style = this.theme.text;
    while (this.textObjects.length < count) {
      const textObject = this.scene.add.bitmapText(0, 0, style.fontKey, "", style.fontSize);
      textObject.setScale(style.scale);
      this.applyBitmapSampling(textObject);
      this.content.add(textObject);
      this.textObjects.push(textObject);
    }
  }

  private replaceMeasurer(fontKeys: readonly string[]): void {
    this.measurer.destroy();
    this.measurer = createBitmapTextMeasurer(this.scene, fontKeys);
    this.applyBitmapSamplingToContent();
  }

  private syncMeasurerToTheme(): void {
    if (fontKeyChainsEqual(this.measurer.fontKeys, this.theme.text.fontKeys)) {
      return;
    }
    this.replaceMeasurer(this.theme.text.fontKeys);
  }

  private applyBitmapSamplingToContent(): void {
    for (const fontKey of this.theme.text.fontKeys) {
      const texture = this.scene.textures.get(fontKey);
      if (texture !== undefined) {
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  private applyBitmapSampling(target: Phaser.GameObjects.BitmapText): void {
    this.applyBitmapSamplingToContent();
    target.setPosition(Math.trunc(target.x), Math.trunc(target.y));
  }
}
