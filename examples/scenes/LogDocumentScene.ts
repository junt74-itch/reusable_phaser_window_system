import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { DocumentWindow } from "../../src/document/DocumentWindow.ts";
import { LogWindow } from "../../src/log/LogWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

const SAMPLE_DOCUMENT = [
  "DocumentWindow layouts the full wrapped text, then scrolls.",
  "There is no typewriter. Use wheel, drag, or PageUp/PageDown.",
  "",
  "Missing glyphs throw. Lines stay clipped inside the content rectangle.",
  "This sample is taller than the viewport so you can confirm scrolling.",
  "",
  ...Array.from({ length: 48 }, (_, index) => `Paragraph ${index + 1}: keep scrolling to the end.`),
].join("\n");

export class LogDocumentScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private logWindow: LogWindow | null = null;
  private documentWindow: DocumentWindow | null = null;
  private hintText: Phaser.GameObjects.BitmapText | null = null;
  private lineIndex = 0;

  public constructor() {
    super("log-document");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    this.logWindow = new LogWindow(
      this,
      {
        x: 40,
        y: 24,
        width: 360,
        height: 160,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { input: this.windowInput, ownsInput: false, showScrollbar: true },
    );
    this.documentWindow = new DocumentWindow(
      this,
      {
        x: 420,
        y: 24,
        width: 500,
        height: 400,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { input: this.windowInput, ownsInput: true, showScrollbar: true },
    );
    this.hintText = this.add.bitmapText(
      40,
      200,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "L focus log  D focus document. Log sticks to bottom unless you scroll up.",
      12,
    );
    void this.logWindow.open();
    this.logWindow.show();
    void this.documentWindow.open();
    this.documentWindow.show();
    this.documentWindow.activate();
    this.documentWindow.setDocument(SAMPLE_DOCUMENT);
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.lineIndex += 1;
        this.logWindow?.append(`Log line ${this.lineIndex}: appended`);
      },
    });
    this.input.keyboard?.on("keydown-L", () => {
      this.documentWindow?.deactivate();
      this.logWindow?.activate();
      this.hintText?.setText("Log focused. Scroll up to stop stick-to-bottom.");
    });
    this.input.keyboard?.on("keydown-D", () => {
      this.logWindow?.deactivate();
      this.documentWindow?.activate();
      this.hintText?.setText("Document focused. Wheel / page / drag to scroll.");
    });
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.logWindow?.update(time, delta);
    this.documentWindow?.update(time, delta);
  }
}
