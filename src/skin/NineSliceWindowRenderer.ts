import Phaser from "phaser";
import type { ResolvedWindowTheme } from "../core/types.ts";
import type {
  GraphicsLike,
  WindowRenderer,
  WindowRendererFactoryContext,
} from "../core/WindowRenderer.ts";
import { MissingWindowSkinError, type NineSliceSkinOptions } from "./types.ts";

class UnusedChromeGraphics implements GraphicsLike {
  public clear(): void {}
  public fillStyle(): this {
    return this;
  }
  public lineStyle(): this {
    return this;
  }
  public fillRect(): this {
    return this;
  }
  public strokeRect(): this {
    return this;
  }
  public setVisible(): void {}
  public setAlpha(): void {}
  public destroy(): void {}
}

/**
 * WindowRenderer that draws consumer-owned NineSlice chrome.
 * Missing textures throw; there is no Graphics fallback.
 * Isolation: constructed only via WindowBaseOptions.createRenderer. WindowBase must not import this module.
 */
export class NineSliceWindowRenderer implements WindowRenderer {
  public readonly background: GraphicsLike = new UnusedChromeGraphics();
  public readonly frame: GraphicsLike = new UnusedChromeGraphics();
  private readonly chrome: Phaser.GameObjects.NineSlice;
  private readonly options: NineSliceSkinOptions;
  private width = 0;
  private height = 0;
  private openness = 1;
  private destroyed = false;

  public constructor(context: WindowRendererFactoryContext, options: NineSliceSkinOptions) {
    if (!context.scene.textures.exists(options.textureKey)) {
      throw new MissingWindowSkinError(options.textureKey);
    }
    this.options = options;
    const texture = context.scene.textures.get(options.textureKey);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const frame = options.frame ?? 0;
    this.chrome = context.scene.add.nineslice(
      0,
      0,
      options.textureKey,
      frame,
      Math.max(options.leftWidth + options.rightWidth, 1),
      Math.max(options.topHeight + options.bottomHeight, 1),
      options.leftWidth,
      options.rightWidth,
      options.topHeight,
      options.bottomHeight,
      options.tileX ?? false,
      options.tileY ?? false,
    );
    this.chrome.setOrigin(0, 0);
    this.chrome.setPosition(0, 0);
    context.root.add(this.chrome);
  }

  public resize(width: number, height: number): void {
    this.width = Math.trunc(width);
    this.height = Math.trunc(height);
    this.applySize();
  }

  public applyTheme(_theme: ResolvedWindowTheme): void {
    // Skin pixels are consumer-owned; theme colors do not recolor the atlas.
  }

  public setOpenness(openness: number): void {
    this.openness = Math.max(0, Math.min(1, openness));
  }

  public getOpenness(): number {
    return this.openness;
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.chrome.destroy();
  }

  private applySize(): void {
    if (this.destroyed || this.width <= 0 || this.height <= 0) {
      return;
    }
    const minWidth = this.options.leftWidth + this.options.rightWidth;
    const minHeight = this.options.topHeight + this.options.bottomHeight;
    this.chrome.setSize(Math.max(this.width, minWidth), Math.max(this.height, minHeight));
  }
}

export function createNineSliceWindowRenderer(
  context: WindowRendererFactoryContext,
  options: NineSliceSkinOptions,
): WindowRenderer {
  return new NineSliceWindowRenderer(context, options);
}
