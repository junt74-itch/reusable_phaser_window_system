import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { HelpWindow } from "../../src/help/HelpWindow.ts";
import { MessageWindow } from "../../src/message/MessageWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";
import { FontSwapBusyError } from "../../src/text/types.ts";

/** Same builder artifact registered under a second cache key (no second font in-repo). */
export const FALLBACK_ALIAS_KEY = `${DEFAULT_BITMAP_FONT_ASSET.key}-alias`;

/**
 * Demonstrates an application-supplied builder-font fallback chain.
 *
 * A second distinct builder font is not in this repository. This scene loads the
 * same `jf-dot-mplus12` artifact twice so `fontKeys` and `setFontKey` can be
 * exercised. Exhaustion (`MissingBitmapGlyphError` with tried keys) is covered
 * by unit tests with fake measurers, not by this scene.
 */
export class FontFallbackScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private helpWindow: HelpWindow | null = null;
  private messageWindow: MessageWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;

  public constructor() {
    super("font-fallback");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
    this.load.bitmapFont(
      FALLBACK_ALIAS_KEY,
      DEFAULT_BITMAP_FONT_ASSET.textureURL,
      DEFAULT_BITMAP_FONT_ASSET.fontDataURL,
    );
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    const fontKeys = [DEFAULT_BITMAP_FONT_ASSET.key, FALLBACK_ALIAS_KEY] as const;
    this.helpWindow = new HelpWindow(this, {
      x: 40,
      y: 24,
      width: 560,
      height: 72,
      theme: {
        text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key, fontKeys },
      },
    });
    this.messageWindow = new MessageWindow(
      this,
      {
        x: 40,
        y: 108,
        width: 560,
        height: 160,
        theme: {
          text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key, fontKeys },
        },
      },
      { input: this.windowInput, ownsInput: true },
    );
    this.logText = this.add.bitmapText(
      40,
      288,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Same artifact, two keys. Confirm to swap primary while idle.",
      12,
    );
    void this.helpWindow.open();
    this.helpWindow.show();
    this.helpWindow.setHelp("Chain: primary then alias. Both keys are builder bitmaps.");
    void this.runSample();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.messageWindow?.update(time, delta);
  }

  private async runSample(): Promise<void> {
    const message = this.messageWindow;
    const help = this.helpWindow;
    if (message === null || help === null) {
      return;
    }
    help.setFontKey(FALLBACK_ALIAS_KEY);
    this.logText?.setText(`Idle setFontKey -> ${FALLBACK_ALIAS_KEY}`);
    const pending = message.say("NPC", "Fallback chain is builder keys only.\fNext page.");
    try {
      message.setFontKey(DEFAULT_BITMAP_FONT_ASSET.key);
      this.logText?.setText("Unexpected: busy swap succeeded.");
    } catch (error) {
      if (error instanceof FontSwapBusyError) {
        this.logText?.setText("Busy say() rejected setFontKey (FontSwapBusyError). Confirm to finish.");
      } else {
        this.logText?.setText(`Busy swap: ${error instanceof Error ? error.name : "error"}`);
      }
    }
    await pending;
    message.setFontKey(DEFAULT_BITMAP_FONT_ASSET.key);
    this.logText?.setText("Message completed. Idle swap back to primary.");
  }
}
