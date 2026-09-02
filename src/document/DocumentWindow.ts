import Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import { ScrollableWindow, type ScrollableWindowOptions } from "../scroll/ScrollableWindow.ts";
import { layoutRichText } from "../text/TextLayout.ts";
import { createBitmapTextMeasurer } from "../text/FallbackBitmapTextMeasurer.ts";
import { fontKeyChainsEqual } from "../text/fontFallback.ts";
import { scaleFontMetrics } from "../text/fontMetrics.ts";
import { flattenRichText } from "../text/richText.ts";
import { BitmapFontNotLoadedError } from "../text/types.ts";
import type {
  OwnedBitmapTextMeasurer,
  RichText,
  TextLayoutOptions,
  WindowTextContent,
} from "../text/types.ts";

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
 * Read-only wrapped document. Input is page/wheel/drag only; there is no typewriter.
 */
export class DocumentWindow extends ScrollableWindow {
  private measurer: OwnedBitmapTextMeasurer;
  private readonly labels: Phaser.GameObjects.BitmapText[] = [];
  private source: string | RichText = "";
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

  public setDocument(content: string | RichText): void {
    this.source = content;
    this.rebuildLabels();
    this.setScrollOffset(0);
  }

  public getDocument(): string | RichText {
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
    if (!this.isContentEmpty()) {
      this.rebuildLabels();
    }
  }

  private isContentEmpty(): boolean {
    return flattenRichText(this.source).text.length === 0;
  }

  private rebuildLabels(): void {
    this.destroyLabels();
    if (this.isContentEmpty()) {
      this.setScrollContentSize(0);
      return;
    }
    this.ensureMeasurerForContent(this.source);
    const content = this.getContentBounds();
    const layout = layoutRichText(this.source, this.measurer, this.createLayoutOptions(content.width));
    const style = this.theme.text;
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
        label.setY(Math.trunc(line.y + line.ascent - runAscent));
        this.scrollBody.add(label);
        this.labels.push(label);
      }
    }
    const last = layout.lines[layout.lines.length - 1];
    if (last !== undefined) {
      this.setScrollContentSize(Math.trunc(last.y + last.height + style.lineSpacing));
    }
  }

  private ensureMeasurerForContent(content: WindowTextContent): void {
    const flattened = flattenRichText(content);
    const specifiedKeys: string[] = [];
    const seenSpecified = new Set<string>();
    for (const entry of flattened.chars) {
      if (entry.fontKey === undefined || seenSpecified.has(entry.fontKey)) {
        continue;
      }
      seenSpecified.add(entry.fontKey);
      specifiedKeys.push(entry.fontKey);
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
