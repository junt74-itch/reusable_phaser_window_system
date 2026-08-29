/**
 * Typecheck target for the README consumer example.
 * Uses only public package exports — no deep src/ imports.
 */
import Phaser from "phaser";
import {
  MessageWindow,
  ChoiceWindow,
  PhaserWindowInput,
  DEFAULT_BITMAP_FONT_ASSET,
  resolveWindowTheme,
  type ChoiceResult,
} from "reusable-phaser4-window-system";

class ReadmeExampleScene extends Phaser.Scene {
  private messageWindow!: MessageWindow;
  private choiceWindow!: ChoiceWindow;
  private sharedInput!: PhaserWindowInput;

  preload(): void {
    this.load.bitmapFont(
      DEFAULT_BITMAP_FONT_ASSET.key,
      DEFAULT_BITMAP_FONT_ASSET.textureURL,
      DEFAULT_BITMAP_FONT_ASSET.fontDataURL,
    );
  }

  create(): void {
    this.cameras.main.roundPixels = true;
    this.sharedInput = new PhaserWindowInput(this);
    const theme = resolveWindowTheme({
      text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key },
    });
    this.messageWindow = new MessageWindow(
      this,
      { x: 40, y: 40, width: 520, height: 160, theme },
      { input: this.sharedInput, ownsInput: true },
    );
    this.choiceWindow = new ChoiceWindow(
      this,
      { x: 120, y: 220, width: 280, height: 140, theme },
      { input: this.sharedInput, ownsInput: false },
    );
    void this.runDialogue();
  }

  override update(time: number, delta: number): void {
    this.sharedInput.update(delta);
    this.messageWindow.update(time, delta);
    this.choiceWindow.update(time, delta);
  }

  private async runDialogue(): Promise<void> {
    this.messageWindow.activate();
    this.choiceWindow.deactivate();
    await this.messageWindow.say("NPC", "こんにちは。次のページです。\n改行もできます。");
    this.messageWindow.deactivate();
    this.choiceWindow.activate();
    const result: ChoiceResult<string> = await this.choiceWindow.choose([
      "Attack",
      "Defend",
      "Run",
    ]);
    if (result.status === "selected") {
      console.log(result.item.label);
    }
  }
}

export { ReadmeExampleScene };
