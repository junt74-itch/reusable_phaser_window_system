import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { HelpWindow } from "../../src/help/HelpWindow.ts";
import { LogWindow } from "../../src/log/LogWindow.ts";
import { MessageWindow } from "../../src/message/MessageWindow.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import type { SelectableItem } from "../../src/selection/types.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";
import type { RichText } from "../../src/text/types.ts";

const HELP_RICH: RichText = {
  align: "center",
  spans: [
    { text: "Rich text demo " },
    { text: "24px", fontSize: 24 },
  ],
};

const LOG_LINES: readonly RichText[] = [
  { align: "left", spans: [{ text: "Left aligned log line." }] },
  { align: "center", spans: [{ text: "Center aligned log line." }] },
  { align: "right", spans: [{ text: "Right aligned log line." }] },
];

const MESSAGE_RICH: RichText = {
  spans: [
    { text: "Mixed " },
    { text: "sizes", fontSize: 20 },
    { text: " and {color:FFAA44}color{color}." },
  ],
};

const CHOICE_ITEMS: readonly SelectableItem<string>[] = [
  {
    id: "large",
    label: {
      spans: [
        { text: "Large ", fontSize: 20 },
        { text: "choice" },
      ],
    },
    value: "large",
    enabled: true,
  },
  {
    id: "plain",
    label: "Plain string",
    value: "plain",
    enabled: true,
  },
  {
    id: "small",
    label: { spans: [{ text: "Small", fontSize: 10 }] },
    value: "small",
    enabled: true,
  },
];

/** Demonstrates RichText across Help, Log, Message, and Choice windows. */
export class RichTextScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private helpWindow: HelpWindow | null = null;
  private logWindow: LogWindow | null = null;
  private messageWindow: MessageWindow | null = null;
  private choiceWindow: ChoiceWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;

  public constructor() {
    super("rich-text");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    const theme = { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } };

    this.helpWindow = new HelpWindow(this, {
      x: 40,
      y: 24,
      width: 880,
      height: 72,
      theme,
    });
    this.logWindow = new LogWindow(
      this,
      { x: 40, y: 108, width: 400, height: 120, theme },
      { input: this.windowInput, ownsInput: false, showScrollbar: true },
    );
    this.messageWindow = new MessageWindow(
      this,
      { x: 40, y: 244, width: 520, height: 100, theme },
      { input: this.windowInput, ownsInput: true },
    );
    this.choiceWindow = new ChoiceWindow(
      this,
      { x: 460, y: 108, width: 460, height: 140, theme },
      { input: this.windowInput, ownsInput: false },
    );

    this.logText = this.add.bitmapText(
      40,
      360,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Confirm advances message. Then pick a choice.",
      12,
    );

    void this.helpWindow.open(0);
    this.helpWindow.show();
    this.helpWindow.setHelp(HELP_RICH);

    void this.logWindow.open(0);
    this.logWindow.show();
    for (const line of LOG_LINES) {
      this.logWindow.append(line);
    }

    void this.messageWindow.open(0);
    this.messageWindow.show();

    void this.choiceWindow.open(0);
    this.choiceWindow.show();
    this.choiceWindow.setItems(CHOICE_ITEMS);

    void this.runSample();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.helpWindow?.update(time, delta);
    this.logWindow?.update(time, delta);
    this.messageWindow?.update(time, delta);
    this.choiceWindow?.update(time, delta);
  }

  private async runSample(): Promise<void> {
    const message = this.messageWindow;
    const choice = this.choiceWindow;
    if (message === null || choice === null || this.logText === null) {
      return;
    }
    try {
      message.activate();
      choice.deactivate();
      await message.say("NPC", MESSAGE_RICH, { charsPerSecond: 120 });
      message.deactivate();
      choice.activate();
      this.logText.setText("Message done. Pick a choice.");
      const result = await choice.choose(CHOICE_ITEMS, { autoOpen: false });
      if (result.status === "selected") {
        const label = result.item.label;
        const labelText = typeof label === "string" ? label : result.item.id;
        this.logText.setText(`Selected: ${labelText}`);
      } else {
        this.logText.setText("Cancelled.");
      }
    } catch (error) {
      this.logText.setText(`Error: ${error instanceof Error ? error.name : "unknown"}`);
    }
  }
}
