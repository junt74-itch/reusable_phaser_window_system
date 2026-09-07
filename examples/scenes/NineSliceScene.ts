import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { WindowBase } from "../../src/core/WindowBase.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";
import { createNineSliceWindowRenderer } from "../../src/skin/NineSliceWindowRenderer.ts";

export const PLACEHOLDER_WINDOW_SKIN_KEY = "window-placeholder";
export const PLACEHOLDER_WINDOW_SKIN_URL = "/examples/assets/skins/window-placeholder.png";

const WINDOW_SKINS = [
  { key: "windowbase-1", url: "/assets/window_base_png/windowbase_1_padding-12.png" },
  { key: "windowbase-8.1", url: "/assets/window_base_png/windowbase_8.1_padding-12.png" },
] as const;

export class NineSliceScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private chromeWindow: WindowBase | null = null;
  private choiceWindow: ChoiceWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private widthPx = 320;
  private heightPx = 160;

  public constructor() {
    super("nineslice");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
    this.load.image(PLACEHOLDER_WINDOW_SKIN_KEY, PLACEHOLDER_WINDOW_SKIN_URL);
    for (const skin of WINDOW_SKINS) this.load.image(skin.key, skin.url);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    const createRenderer = createNineSliceWindowRenderer({
      textureKey: WINDOW_SKINS[0].key,
      padding: [12, 12, 12, 12],
    });

    this.chromeWindow = new WindowBase(
      this,
      {
        x: 40,
        y: 40,
        width: this.widthPx,
        height: this.heightPx,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { createRenderer },
    );
    this.choiceWindow = new ChoiceWindow(
      this,
      {
        x: 400,
        y: 40,
        width: 240,
        height: 160,
        theme: {
          text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key },
          cursor: { blinkPeriodMs: 800 },
        },
      },
      {
        input: this.windowInput,
        ownsInput: true,
        createRenderer: createNineSliceWindowRenderer({ textureKey: WINDOW_SKINS[1].key, padding: 12 }),
      },
    );
    this.logText = this.add.bitmapText(
      40,
      240,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "NineSlice chrome. Keys: [ ] resize  O open  C close",
      12,
    );
    this.bindKeys();
    void this.chromeWindow.open();
    this.chromeWindow.activate();
    void this.runChoice();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.chromeWindow?.update(time, delta);
    this.choiceWindow?.update(time, delta);
  }

  private bindKeys(): void {
    this.input.keyboard?.on("keydown-OPEN_BRACKET", () => {
      this.widthPx = Math.max(96, this.widthPx - 16);
      this.heightPx = Math.max(64, this.heightPx - 16);
      this.chromeWindow?.setSize(this.widthPx, this.heightPx);
      this.logText?.setText(`Resized to ${this.widthPx}x${this.heightPx}`);
    });
    this.input.keyboard?.on("keydown-CLOSED_BRACKET", () => {
      this.widthPx = Math.min(480, this.widthPx + 16);
      this.heightPx = Math.min(280, this.heightPx + 16);
      this.chromeWindow?.setSize(this.widthPx, this.heightPx);
      this.logText?.setText(`Resized to ${this.widthPx}x${this.heightPx}`);
    });
    this.input.keyboard?.on("keydown-O", () => {
      void this.chromeWindow?.open();
      this.logText?.setText("Open");
    });
    this.input.keyboard?.on("keydown-C", () => {
      void this.chromeWindow?.close();
      this.logText?.setText("Close");
    });
  }

  private async runChoice(): Promise<void> {
    const windowRef = this.choiceWindow;
    if (windowRef === null) {
      return;
    }
    const result = await windowRef.choose(["Attack", "Item", "Escape"]);
    this.logText?.setText(
      result.status === "selected" ? `Selected ${result.item.label}` : "Cancelled",
    );
  }
}
