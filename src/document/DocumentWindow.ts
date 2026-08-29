import Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import { ScrollableWindow, type ScrollableWindowOptions } from "../scroll/ScrollableWindow.ts";
import { layoutText } from "../text/TextLayout.ts";
import { createBitmapTextMeasurer } from "../text/FallbackBitmapTextMeasurer.ts";
import { splitTextFontRuns } from "../text/fontFallback.ts";
import { stackedTextHeight } from "../text/stackedText.ts";
import type { OwnedBitmapTextMeasurer, TextLayoutOptions } from "../text/types.ts";

const UNBOUNDED_LAYOUT_HEIGHT = 1_000_000;

/**
 * Read-only wrapped document. Input is page/wheel/drag only; there is no typewriter.
 */
export class DocumentWindow extends ScrollableWindow {
  private readonly measurer: OwnedBitmapTextMeasurer;
  private readonly labels: Phaser.GameObjects.BitmapText[] = [];
  private source = "";
  private readonly ready: boolean;

  public constructor(
    scene: Phaser.Scene,
    config: WindowConfig,
    options: ScrollableWindowOptions = {},
  ) {
    super(scene, config, options);
    this.measurer = createBitmapTextMeasurer(scene, this.theme.text.fontKeys);
    this.applyBitmapSampling();
    this.ready = true;
  }

  public setDocument(text: string): void {
    this.source = text;
    this.rebuildLabels();
    this.setScrollOffset(0);
  }

  public getDocument(): string {
    return this.source;
  }

  public override destroy(): void {
    this.destroyLabels();
    this.measurer.destroy();
    super.destroy();
  }

  protected override onLayoutChanged(): void {
    super.onLayoutChanged();
    if (!this.ready) {
      return;
    }
    if (this.source.length > 0) {
      this.rebuildLabels();
    }
  }

  private rebuildLabels(): void {
    this.destroyLabels();
    if (this.source.length === 0) {
      this.setScrollContentSize(0);
      return;
    }
    const content = this.getContentBounds();
    const layout = layoutText(this.source, this.measurer, this.createLayoutOptions(content.width));
    for (const line of layout.lines) {
      const runs = splitTextFontRuns(
        line.text,
        (codePoint) => this.measurer.fontKeyFor(codePoint),
        this.measurer.fontKey,
      );
      let x = 0;
      for (const run of runs) {
        const label = this.scene.add.bitmapText(
          Math.trunc(x),
          Math.trunc(line.y),
          run.fontKey,
          run.text,
          this.theme.text.fontSize,
        );
        label.setScale(this.theme.text.scale);
        label.setTint(this.theme.text.tint);
        label.setLetterSpacing(this.theme.text.letterSpacing);
        this.scrollBody.add(label);
        this.labels.push(label);
        if (run.text.length > 0) {
          x += this.measurer.measure(run.text, {
            fontKey: run.fontKey,
            fontSize: this.theme.text.fontSize,
            scale: this.theme.text.scale,
            letterSpacing: this.theme.text.letterSpacing,
          }).width;
        }
      }
    }
    this.setScrollContentSize(
      stackedTextHeight(layout.lines[layout.lines.length - 1]?.y, this.lineStep()),
    );
  }

  private createLayoutOptions(width: number): TextLayoutOptions {
    return {
      width,
      height: UNBOUNDED_LAYOUT_HEIGHT,
      style: {
        fontKey: this.theme.text.fontKey,
        fontSize: this.theme.text.fontSize,
        scale: this.theme.text.scale,
        letterSpacing: this.theme.text.letterSpacing,
      },
      lineSpacing: this.theme.text.lineSpacing,
    };
  }

  private lineStep(): number {
    return this.measurer.lineHeight * this.theme.text.scale + this.theme.text.lineSpacing;
  }

  private applyBitmapSampling(): void {
    for (const fontKey of this.theme.text.fontKeys) {
      const texture = this.scene.textures.get(fontKey);
      if (texture !== undefined) {
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  private destroyLabels(): void {
    for (const label of this.labels) {
      label.destroy();
    }
    this.labels.length = 0;
  }
}
