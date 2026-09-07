/** Consumer-owned NineSlice chrome. Texture must already be loaded. */
export interface NineSliceSkinOptions {
  /** Multiplicative 24-bit RGB tint (0x000000–0xffffff). Defaults to white. */
  readonly tint?: number;
  readonly textureKey: string;
  readonly frame?: string | number;
  readonly leftWidth: number;
  readonly rightWidth: number;
  readonly topHeight: number;
  readonly bottomHeight: number;
  readonly tileX?: boolean;
  readonly tileY?: boolean;
}

/** Source-image border widths in pixels, clockwise: top, right, bottom, left. */
export type NineSlicePadding = number | readonly [top: number, right: number, bottom: number, left: number];

/** Image skin with slicing padding, independent of the window's content padding. */
export interface NineSliceImageSkinOptions {
  /** Multiplicative 24-bit RGB tint (0x000000–0xffffff). Defaults to white. */
  readonly tint?: number;
  readonly textureKey: string;
  readonly frame?: string | number;
  readonly padding: NineSlicePadding;
  readonly tileX?: boolean;
  readonly tileY?: boolean;
}

export class MissingWindowSkinError extends Error {
  public override readonly name = "MissingWindowSkinError";
  public readonly textureKey: string;

  public constructor(textureKey: string) {
    super(`Window skin texture "${textureKey}" is not loaded.`);
    this.textureKey = textureKey;
  }
}
