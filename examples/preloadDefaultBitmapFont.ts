import type Phaser from "phaser";
import { DEFAULT_BITMAP_FONT_ASSET } from "../src/text/BitmapFontAsset.ts";

/** Shared sandbox preload for the default builder bitmap font. */
export function preloadDefaultBitmapFont(scene: Phaser.Scene): void {
  scene.load.bitmapFont(
    DEFAULT_BITMAP_FONT_ASSET.key,
    DEFAULT_BITMAP_FONT_ASSET.textureURL,
    DEFAULT_BITMAP_FONT_ASSET.fontDataURL,
  );
}
