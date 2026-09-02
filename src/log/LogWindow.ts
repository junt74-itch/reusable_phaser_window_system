import Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import { ScrollableWindow, type ScrollableWindowOptions } from "../scroll/ScrollableWindow.ts";
import { layoutRichText } from "../text/TextLayout.ts";
import { createBitmapTextMeasurer } from "../text/FallbackBitmapTextMeasurer.ts";
import { fontKeyChainsEqual } from "../text/fontFallback.ts";
import { scaleFontMetrics } from "../text/fontMetrics.ts";
import { flattenRichText } from "../text/richText.ts";
import { BitmapFontNotLoadedError } from "../text/types.ts";
import type { OwnedBitmapTextMeasurer, RichText, TextLayoutOptions } from "../text/types.ts";
import { shouldStickToLatest } from "./stickToLatest.ts";

const UNBOUNDED_LAYOUT_HEIGHT = 1_000_000;

function uniqueFontKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of keys) {
    if (!seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }
  return result;
}

/**
 * Append-only log. Sticks to the latest line only when the viewer is already at the bottom.
 */
export class LogWindow extends ScrollableWindow {
  private measurer: OwnedBitmapTextMeasurer;
  private readonly entries: (string | RichText)[] = [];
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

  public append(content: string | RichText): void {
    this.entries.push(content);
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

  public getEntries(): readonly (string | RichText)[] {
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
    if (this.entries.length === 0) {
      this.setScrollContentSize(0);
      return;
    }
    this.ensureMeasurerForEntries();
    const content = this.getContentBounds();
    const style = this.theme.text;
    const layoutOptions = this.createLayoutOptions(content.width);
    let cursorY = 0;
    for (const entry of this.entries) {
      const layout = layoutRichText(entry, this.measurer, layoutOptions);
      for (const line of layout.lines) {
        for (const run of line.runs) {
          const label = this.scene.add.bitmapText(
            Math.trunc(run.x),
            0,
            run.fontKey,
            run.text,
            run.fontSize,
          );
          label.setScale(style.scale);
          label.setTint(style.tint);
          label.setLetterSpacing(style.letterSpacing);
          const runAscent = scaleFontMetrics(
            this.measurer.fontMetrics(run.fontKey),
            run.fontSize,
            style.scale,
          ).ascent;
          label.setY(Math.trunc(cursorY + line.y + line.ascent - runAscent));
          this.scrollBody.add(label);
          this.labels.push(label);
        }
      }
      const last = layout.lines[layout.lines.length - 1];
      cursorY += last !== undefined ? Math.trunc(last.y + last.height + style.lineSpacing) : 0;
    }
    this.setScrollContentSize(cursorY);
  }

  private ensureMeasurerForEntries(): void {
    const specifiedKeys: string[] = [];
    const seenSpecified = new Set<string>();
    for (const entry of this.entries) {
      const flattened = flattenRichText(entry);
      for (const charEntry of flattened.chars) {
        if (charEntry.fontKey === undefined || seenSpecified.has(charEntry.fontKey)) {
          continue;
        }
        seenSpecified.add(charEntry.fontKey);
        specifiedKeys.push(charEntry.fontKey);
      }
    }
    for (const key of specifiedKeys) {
      if (this.scene.cache.bitmapFont.get(key) === undefined) {
        throw new BitmapFontNotLoadedError(key);
      }
    }
    const fontKeys = uniqueFontKeys([...this.theme.text.fontKeys, ...specifiedKeys]);
    if (!fontKeyChainsEqual(this.measurer.fontKeys, fontKeys)) {
      this.replaceMeasurer(fontKeys);
    }
  }

  private replaceMeasurer(fontKeys: readonly string[]): void {
    this.measurer.destroy();
    this.measurer = createBitmapTextMeasurer(this.scene, fontKeys);
    this.applyBitmapSampling();
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

  private applyBitmapSampling(): void {
    for (const fontKey of this.measurer.fontKeys) {
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
