import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { MessageWindow } from "../../src/message/MessageWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

export const PLACEHOLDER_PORTRAIT_KEY = "portrait-placeholder";
export const PLACEHOLDER_PORTRAIT_URL = "/examples/assets/skins/window-placeholder.png";

export class MessagePortraitScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private messageWindow: MessageWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private typeCount = 0;

  public constructor() {
    super("message-portrait");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
    this.load.image(PLACEHOLDER_PORTRAIT_KEY, PLACEHOLDER_PORTRAIT_URL);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    this.messageWindow = new MessageWindow(
      this,
      {
        x: 40,
        y: 40,
        width: 560,
        height: 180,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { input: this.windowInput, ownsInput: true },
    );
    this.logText = this.add.bitmapText(
      40,
      240,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Portrait + color/speed. Auto-advance on page two.",
      12,
    );
    void this.runSample();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.messageWindow?.update(time, delta);
  }

  private async runSample(): Promise<void> {
    const windowRef = this.messageWindow;
    if (windowRef === null) {
      return;
    }
    await windowRef.say(
      "NPC",
      "{color:FFCC66}Hello.{color} {speed:20}This is slow.\fNext page auto-advances.",
      {
        portrait: {
          textureKey: PLACEHOLDER_PORTRAIT_KEY,
          width: 64,
          height: 64,
        },
        autoAdvanceMs: 700,
        onType: () => {
          this.typeCount += 1;
        },
        onPage: () => {
          this.logText?.setText(`Page change. typed=${this.typeCount}`);
        },
        onConfirm: () => {
          this.logText?.setText("Confirm won over auto-advance.");
        },
      },
    );
    this.logText?.setText(`Done. typed=${this.typeCount}`);
    await windowRef.say("NPC", "No portrait. Phase 1 look.", { charsPerSecond: 60 });
    this.logText?.setText("Second say had no portrait.");
  }
}
