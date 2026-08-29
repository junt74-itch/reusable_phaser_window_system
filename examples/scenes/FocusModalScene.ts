import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { CommandWindow } from "../../src/command/CommandWindow.ts";
import type { CommandItem } from "../../src/command/types.ts";
import { bindFocusControllerToScene } from "../../src/focus/bindSceneShutdown.ts";
import { WindowFocusController } from "../../src/focus/WindowFocusController.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

const LEFT_COMMANDS: readonly CommandItem[] = [
  { id: "talk", label: "Talk", enabled: true },
  { id: "status", label: "Status", enabled: true },
];

const RIGHT_COMMANDS: readonly CommandItem[] = [
  { id: "item", label: "Item", enabled: true },
  { id: "equip", label: "Equip", enabled: true },
];

const MODAL_COMMANDS: readonly CommandItem[] = [
  { id: "yes", label: "Yes", enabled: true },
  { id: "no", label: "No", enabled: true },
];

export class FocusModalScene extends Phaser.Scene {
  private windowInput: PhaserWindowInput | null = null;
  private focus: WindowFocusController | null = null;
  private unbindFocus: (() => void) | null = null;
  private leftWindow: CommandWindow | null = null;
  private rightWindow: CommandWindow | null = null;
  private modalWindow: CommandWindow | null = null;
  private dimmer: Phaser.GameObjects.Graphics | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private focusSubscription: { unsubscribe: () => void } | null = null;

  public constructor() {
    super("focus-modal");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);
    const input = this.windowInput;
    this.focus = new WindowFocusController();
    this.unbindFocus = bindFocusControllerToScene(this, this.focus);
    this.dimmer = this.add.graphics();
    this.dimmer.fillStyle(0x000000, 0.55);
    this.dimmer.fillRect(0, 0, 960, 540);
    this.dimmer.setDepth(10);
    this.dimmer.setVisible(false);
    this.leftWindow = this.createCommandWindow(input, 40, 40, 240, 140, true);
    this.rightWindow = this.createCommandWindow(input, 320, 40, 240, 140, false);
    this.modalWindow = this.createCommandWindow(input, 240, 200, 280, 140, false);
    this.modalWindow.setDepth(20);
    this.modalWindow.hide();
    this.logText = this.add.bitmapText(
      40,
      380,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Keys: 1 left  2 right  M modal. Only the focused window consumes confirm.",
      12,
    );
    this.focusSubscription = this.focus.subscribe((snapshot) => {
      this.dimmer?.setVisible(snapshot.modal);
    });
    this.bindKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDimmer());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyDimmer());
    void this.openBackground();
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.leftWindow?.update(time, delta);
    this.rightWindow?.update(time, delta);
    this.modalWindow?.update(time, delta);
  }

  private createCommandWindow(
    input: PhaserWindowInput,
    x: number,
    y: number,
    width: number,
    height: number,
    ownsInput: boolean,
  ): CommandWindow {
    return new CommandWindow(
      this,
      { x, y, width, height, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input, ownsInput },
    );
  }

  private bindKeys(): void {
    this.input.keyboard?.on("keydown-ONE", () => {
      if (this.focus?.getSnapshot().modal === true) {
        return;
      }
      if (this.leftWindow !== null) {
        this.focus?.acquire(this.leftWindow);
        this.logText?.setText("Focus: left");
      }
    });
    this.input.keyboard?.on("keydown-TWO", () => {
      if (this.focus?.getSnapshot().modal === true) {
        return;
      }
      if (this.rightWindow !== null) {
        this.focus?.acquire(this.rightWindow);
        this.logText?.setText("Focus: right");
      }
    });
    this.input.keyboard?.on("keydown-M", () => {
      void this.openModal();
    });
  }

  private async openBackground(): Promise<void> {
    const left = this.leftWindow;
    const right = this.rightWindow;
    const focus = this.focus;
    if (left === null || right === null || focus === null) {
      return;
    }
    await left.open();
    left.show();
    await right.open();
    right.show();
    focus.acquire(left);
    void this.runCommands(left, LEFT_COMMANDS, "left");
    void this.runCommands(right, RIGHT_COMMANDS, "right");
  }

  private async openModal(): Promise<void> {
    const modal = this.modalWindow;
    const focus = this.focus;
    if (modal === null || focus === null || focus.getSnapshot().modal) {
      return;
    }
    modal.show();
    await modal.open();
    focus.acquire(modal, { modal: true });
    this.logText?.setText("Modal acquired. Background confirm is ignored.");
    try {
      const result = await modal.chooseCommands(MODAL_COMMANDS, {
        autoOpen: false,
        closeOnComplete: true,
      });
      this.logText?.setText(
        result.status === "selected" ? `Modal: ${result.command.id}` : "Modal cancelled",
      );
    } catch {
      return;
    } finally {
      this.focus?.release(modal);
      if (!modal.isDestroyed()) {
        modal.hide();
      }
    }
  }

  private async runCommands(
    windowRef: CommandWindow,
    items: readonly CommandItem[],
    name: string,
  ): Promise<void> {
    while (!windowRef.isDestroyed()) {
      try {
        const result = await windowRef.chooseCommands(items, {
          autoOpen: false,
          closeOnComplete: false,
        });
        this.logText?.setText(
          `${name}: ${result.status === "selected" ? result.command.id : "cancelled"}`,
        );
      } catch {
        return;
      }
    }
  }

  private destroyDimmer(): void {
    this.focusSubscription?.unsubscribe();
    this.focusSubscription = null;
    this.unbindFocus?.();
    this.unbindFocus = null;
    this.dimmer?.destroy();
    this.dimmer = null;
  }
}
