import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

export class ChoiceScene extends Phaser.Scene {
  private choiceWindow: ChoiceWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private windowInput: PhaserWindowInput | null = null;

  public constructor() {
    super("choice");
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
      { x: 120, y: 80, width: 280, height: 140, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.windowInput, ownsInput: true },
    );
    this.logText = this.add.bitmapText(40, 260, DEFAULT_BITMAP_FONT_ASSET.key, "Event log:", 12);
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
    const result = await windowRef.choose(["Attack", "Defend", "Run"]);
    if (result.status === "selected") {
      this.logText.setText(`Event log: selected ${result.item.label}`);
    } else {
      this.logText.setText("Event log: cancelled");
    }
  }
}
