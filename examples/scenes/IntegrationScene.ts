import Phaser from "phaser";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { MessageWindow } from "../../src/message/MessageWindow.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

export class IntegrationScene extends Phaser.Scene {
  private messageWindow: MessageWindow | null = null;
  private choiceWindow: ChoiceWindow | null = null;
  private messageInput: PhaserWindowInput | null = null;
  private choiceInput: PhaserWindowInput | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private iteration = 0;

  public constructor() {
    super("integration");
  }

  public preload(): void {
    this.load.bitmapFont(
      DEFAULT_BITMAP_FONT_ASSET.key,
      DEFAULT_BITMAP_FONT_ASSET.textureURL,
      DEFAULT_BITMAP_FONT_ASSET.fontDataURL,
    );
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.messageInput = new PhaserWindowInput(this);
    this.choiceInput = new PhaserWindowInput(this);
    this.messageWindow = new MessageWindow(
      this,
      { x: 40, y: 40, width: 520, height: 140, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.messageInput, ownsInput: true },
    );
    this.choiceWindow = new ChoiceWindow(
      this,
      { x: 120, y: 200, width: 280, height: 120, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.choiceInput, ownsInput: true },
    );
    this.logText = this.add.bitmapText(40, 340, DEFAULT_BITMAP_FONT_ASSET.key, "Event log:", 12);
    void this.runLoop();
  }

  public override update(time: number, delta: number): void {
    this.messageInput?.update(delta);
    this.choiceInput?.update(delta);
    this.messageWindow?.update(time, delta);
    this.choiceWindow?.update(time, delta);
  }

  private async runLoop(): Promise<void> {
    const message = this.messageWindow;
    const choice = this.choiceWindow;
    if (message === null || choice === null || this.logText === null) {
      return;
    }
    while (this.iteration < 3) {
      this.iteration += 1;
      message.activate();
      choice.deactivate();
      await message.say(null, `Integration step ${this.iteration}.`);
      message.deactivate();
      choice.activate();
      const result = await choice.choose(["Continue", "Stop"]);
      if (result.status === "cancelled" || result.item.label === "Stop") {
        this.logText.setText("Event log: stopped");
        return;
      }
      this.logText.setText(`Event log: iteration ${this.iteration}`);
    }
  }
}
