import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { ScrollableWindow } from "../../src/scroll/ScrollableWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

/** Demo window with tall bitmap-text content inside {@link ScrollableWindow}. */
class DemoScrollWindow extends ScrollableWindow {
  private readonly lines: Phaser.GameObjects.BitmapText[] = [];

  public constructor(scene: Phaser.Scene, input: PhaserWindowInput) {
    super(
      scene,
      {
        x: 80,
        y: 60,
        width: 360,
        height: 180,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { input, ownsInput: false, showScrollbar: true },
    );
    this.populateLines();
    this.activate();
    this.show();
    void this.open();
  }

  private populateLines(): void {
    const body = this.getScrollBody();
    const lineHeight = 18;
    const labels = Array.from({ length: 24 }, (_, index) => `Log line ${index + 1}: scroll me`);
    for (let index = 0; index < labels.length; index += 1) {
      const label = this.scene.add.bitmapText(
        8,
        index * lineHeight,
        DEFAULT_BITMAP_FONT_ASSET.key,
        labels[index] ?? "",
        12,
      );
      body.add(label);
      this.lines.push(label);
    }
    this.setScrollContentSize(labels.length * lineHeight);
  }

  public override destroy(): void {
    for (const line of this.lines) {
      line.destroy();
    }
    this.lines.length = 0;
    super.destroy();
  }
}

export class ScrollScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private scrollWindow: DemoScrollWindow | null = null;
  private hintText: Phaser.GameObjects.BitmapText | null = null;

  public constructor() {
    super("scroll");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    this.scrollWindow = new DemoScrollWindow(this, this.windowInput);
    this.hintText = this.add.bitmapText(
      40,
      280,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Wheel / drag / PageUp/PageDown to scroll. Arrows show overflow.",
      12,
    );
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.scrollWindow?.update(time, delta);
  }
}
