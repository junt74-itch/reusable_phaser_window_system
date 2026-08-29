import Phaser from "phaser";
import { WindowBase } from "../core/WindowBase.ts";
import type { WindowConfig } from "../core/types.ts";
import type { WindowBaseOptions } from "../core/WindowBase.ts";
import { layoutText } from "./TextLayout.ts";
import { PhaserBitmapTextMeasurer } from "./PhaserBitmapTextMeasurer.ts";
import type { LayoutLine, TextLayoutOptions, TextLayoutResult } from "./types.ts";

/**
 * Bitmap-text rendering base without message progression.
 */
export abstract class TextWindowBase extends WindowBase {
  protected readonly measurer: PhaserBitmapTextMeasurer;
  private readonly textObjects: Phaser.GameObjects.BitmapText[] = [];
  private currentLayout: TextLayoutResult | null = null;

  public constructor(scene: Phaser.Scene, config: WindowConfig, options: WindowBaseOptions = {}) {
    super(scene, config, options);
    this.measurer = new PhaserBitmapTextMeasurer(scene, this.theme.text.fontKey);
    this.applyBitmapSamplingToContent();
  }

  protected getTextBodyOffsetY(): number {
    return 0;
  }

  protected getTextLayoutHeight(): number {
    return this.getContentBounds().height;
  }

  protected layoutTextContent(text: string): TextLayoutResult {
    const bounds = this.getContentBounds();
    const options: TextLayoutOptions = {
      width: bounds.width,
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
    this.ensureTextObjectCount(lines.length);
    const style = this.theme.text;
    const contentBounds = this.getContentBounds();
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const textObject = this.textObjects[index];
      if (line === undefined || textObject === undefined) {
        continue;
      }
      textObject.setText(line.text);
      textObject.setFontSize(style.fontSize);
      textObject.setScale(style.scale);
      textObject.setTint(style.tint);
      textObject.setLetterSpacing(style.letterSpacing);
      textObject.setPosition(0, Math.trunc(line.y + this.getTextBodyOffsetY()));
      textObject.setVisible(true);
    }
    for (let index = lines.length; index < this.textObjects.length; index += 1) {
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

  protected override onLayoutChanged(): void {
    if (this.currentLayout !== null) {
      // Derived classes may re-layout source text on resize.
    }
  }

  public override destroy(): void {
    for (const textObject of this.textObjects) {
      textObject.destroy();
    }
    this.textObjects.length = 0;
    this.measurer.destroy();
    super.destroy();
  }

  private createLayoutOptions(): TextLayoutOptions {
    const bounds = this.getContentBounds();
    const style = this.theme.text;
    return {
      width: bounds.width,
      height: this.getTextLayoutHeight(),
      style: {
        fontKey: style.fontKey,
        fontSize: style.fontSize,
        scale: style.scale,
        letterSpacing: style.letterSpacing,
      },
      lineSpacing: style.lineSpacing,
    };
  }

  private ensureTextObjectCount(count: number): void {
    const style = this.theme.text;
    while (this.textObjects.length < count) {
      const textObject = this.scene.add.bitmapText(0, 0, style.fontKey, "", style.fontSize);
      textObject.setScale(style.scale);
      this.applyBitmapSampling(textObject);
      this.content.add(textObject);
      this.textObjects.push(textObject);
    }
  }

  private applyBitmapSamplingToContent(): void {
    const texture = this.scene.textures.get(this.theme.text.fontKey);
    if (texture !== undefined) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  private applyBitmapSampling(target: Phaser.GameObjects.BitmapText): void {
    const texture = this.scene.textures.get(this.theme.text.fontKey);
    if (texture !== undefined) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    target.setPosition(Math.trunc(target.x), Math.trunc(target.y));
  }
}
