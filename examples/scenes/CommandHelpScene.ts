import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { CommandWindow } from "../../src/command/CommandWindow.ts";
import type { CommandItem } from "../../src/command/types.ts";
import { HelpWindow } from "../../src/help/HelpWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

const COMMANDS: readonly CommandItem[] = [
  { id: "attack", label: "Attack", enabled: true, help: "Strike the front foe." },
  { id: "skill", label: "Skill", enabled: true, help: "Spend a turn to use a skill." },
  { id: "item", label: "Item", enabled: true, help: "Use an item from the bag." },
  { id: "guard", label: "Guard", enabled: true, help: "Halve damage until next turn." },
  { id: "scan", label: "Scan", enabled: true, help: "Reveal HP and a weakness." },
  { id: "swap", label: "Swap", enabled: false, help: "Unavailable in this battle." },
  ...Array.from({ length: 14 }, (_, index) => ({
    id: `extra-${index + 1}`,
    label: `Tactic ${index + 1}`,
    enabled: true,
    help: `Extra command ${index + 1}. Scroll the list.`,
  })),
  { id: "escape", label: "Escape", enabled: true, help: "Attempt to flee." },
];

export class CommandHelpScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private commandWindow: CommandWindow | null = null;
  private helpWindow: HelpWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;

  public constructor() {
    super("command-help");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    this.helpWindow = new HelpWindow(this, {
      x: 40,
      y: 24,
      width: 520,
      height: 72,
      theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
    });
    this.commandWindow = new CommandWindow(
      this,
      {
        x: 40,
        y: 108,
        width: 280,
        height: 200,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      {
        input: this.windowInput,
        ownsInput: true,
        showScrollbar: true,
        onHighlight: (command) => {
          this.helpWindow?.setHelp(command?.help ?? null);
        },
      },
    );
    this.logText = this.add.bitmapText(
      40,
      330,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Scene owns help binding. Confirm a command.",
      12,
    );
    void this.helpWindow.open();
    this.helpWindow.show();
    void this.runCommands();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.helpWindow?.update(time, delta);
    this.commandWindow?.update(time, delta);
  }

  private async runCommands(): Promise<void> {
    const windowRef = this.commandWindow;
    if (windowRef === null) {
      return;
    }
    const result = await windowRef.chooseCommands(COMMANDS);
    this.logText?.setText(
      result.status === "selected" ? `Selected ${result.command.id}` : "Cancelled",
    );
  }
}
