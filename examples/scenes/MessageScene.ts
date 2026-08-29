import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { MessageWindow } from "../../src/message/MessageWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

export class MessageScene extends Phaser.Scene {
  private messageWindow: MessageWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private windowInput: PhaserWindowInput | null = null;

  public constructor() {
    super("message");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    this.messageWindow = new MessageWindow(
      this,
      { x: 40, y: 40, width: 520, height: 160, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.windowInput, ownsInput: true },
    );
    this.logText = this.add.bitmapText(40, 220, DEFAULT_BITMAP_FONT_ASSET.key, "Event log:", 12);
    void this.runSample();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.messageWindow?.update(time, delta);
  }

  private async runSample(): Promise<void> {
    const windowRef = this.messageWindow;
    if (windowRef === null || this.logText === null) {
      return;
    }
    try {
      const result = await windowRef.say("NPC", "こんにちは。次のページです。\n改行もできます。");
      this.logText.setText(`Event log: completed page ${result.pageIndex}`);
    } catch (error) {
      this.logText.setText(`Event log: ${error instanceof Error ? error.name : "error"}`);
    }
  }
}
