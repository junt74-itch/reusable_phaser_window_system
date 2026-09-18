/** Descriptor for Phaser standard bitmap-font loading. */
export interface BitmapFontAsset {
  readonly key: string;
  readonly textureURL: string;
  readonly fontDataURL: string;
}

export const DEFAULT_BITMAP_FONT_ASSET: BitmapFontAsset = {
  key: "jf-dot-mplus12",
  textureURL: new URL("../../examples/assets/fonts/jf-dot-mplus12/font.png", import.meta.url).href,
  fontDataURL: new URL("../../examples/assets/fonts/jf-dot-mplus12/font.xml", import.meta.url).href,
};
