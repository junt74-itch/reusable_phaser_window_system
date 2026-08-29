import Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import { ScrollableWindow, type ScrollableWindowOptions } from "../scroll/ScrollableWindow.ts";
import { layoutText } from "../text/TextLayout.ts";
import { createBitmapTextMeasurer } from "../text/FallbackBitmapTextMeasurer.ts";
import { splitTextFontRuns } from "../text/fontFallback.ts";
import { stackedTextHeight } from "../text/stackedText.ts";
import type { OwnedBitmapTextMeasurer, TextLayoutOptions } from "../text/types.ts";
import { shouldStickToLatest } from "./stickToLatest.ts";

const UNBOUNDED_LAYOUT_HEIGHT = 1_000_000;

/**
 * Append-only log. Sticks to the latest line only when the viewer is already at the bottom.
 */
export class LogWindow extends ScrollableWindow {
  private readonly measurer: OwnedBitmapTextMeasurer;
  private readonly entries: string[] = [];
  private readonly labels: Phaser.GameObjects.BitmapText[] = [];
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

  public append(line: string): void {
    this.entries.push(line);
    const bounds = this.scrollController.getBounds();
    const stick = shouldStickToLatest(bounds.offset, bounds.maxOffset);
    this.rebuildLabels();
    if (stick) {
      this.scrollController.setOffset(this.scrollController.getBounds().maxOffset);
    }
  }

  public clear(): void {
    this.entries.length = 0;
    this.destroyLabels();
    this.setScrollContentSize(0);
    this.setScrollOffset(0);
  }

  public getEntries(): readonly string[] {
    return this.entries;
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
    const bounds = this.scrollController.getBounds();
    const stick = shouldStickToLatest(bounds.offset, bounds.maxOffset);
    this.rebuildLabels();
    if (stick) {
      this.scrollController.setOffset(this.scrollController.getBounds().maxOffset);
    }
  }

  private rebuildLabels(): void {
    this.destroyLabels();
    const content = this.getContentBounds();
    const lineStep = this.lineStep();
    let cursorY = 0;
    for (const entry of this.entries) {
      const layout = layoutText(entry, this.measurer, this.createLayoutOptions(content.width));
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
            Math.trunc(cursorY + line.y),
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
      cursorY += stackedTextHeight(layout.lines[layout.lines.length - 1]?.y, lineStep);
    }
    this.setScrollContentSize(cursorY);
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
