import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

export class LongListScene extends Phaser.Scene {
  private choiceWindow: ChoiceWindow | null = null;
  private windowInput: PhaserWindowInput | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;

  public constructor() {
    super("long-list");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    this.choiceWindow = new ChoiceWindow(
      this,
      {
        x: 120,
        y: 60,
        width: 320,
        height: 160,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { input: this.windowInput, ownsInput: true, showScrollbar: true },
    );
    this.logText = this.add.bitmapText(
      40,
      260,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Event log: loading 40-item list...",
      12,
    );
    void this.runSample();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.choiceWindow?.update(time, delta);
  }

  private async runSample(): Promise<void> {
    const windowRef = this.choiceWindow;
    if (windowRef === null || this.logText === null) {
      return;
    }
    const items = Array.from({ length: 40 }, (_, index) => `Command ${index + 1}`);
    const result = await windowRef.choose(items);
    if (result.status === "selected") {
      this.logText.setText(`Event log: selected ${result.item.label}`);
    } else {
      this.logText.setText("Event log: cancelled");
    }
  }
}
