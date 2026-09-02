import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";

export class BitmapFontSpikeScene extends Phaser.Scene {
  public constructor() {
    super("bitmap-font-spike");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    const texture = this.textures.get(DEFAULT_BITMAP_FONT_ASSET.key);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.add
      .bitmapText(40, 40, DEFAULT_BITMAP_FONT_ASSET.key, "こんにちは ABC 123", 12)
      .setTint(0xffffff);
    this.add
      .bitmapText(40, 80, DEFAULT_BITMAP_FONT_ASSET.key, "2x scale sample", 12)
      .setScale(2)
      .setPosition(40, 80);
  }
}
