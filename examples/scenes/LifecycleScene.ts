import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { writeSandboxLog } from "../writeSandboxLog.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { MessageWindow } from "../../src/message/MessageWindow.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";
import { WindowBase } from "../../src/core/WindowBase.ts";
import { ignoreTransitionCancellation } from "../../src/core/windowOperations.ts";

type LifecycleMode = "base" | "restart-say" | "restart-choose";

export class LifecycleScene extends Phaser.Scene {
  private generation = 0;
  private logGeneration = 0;
  private windowRef: WindowBase | null = null;
  private messageWindow: MessageWindow | null = null;
  private choiceWindow: ChoiceWindow | null = null;
  private sharedInput: PhaserWindowInput | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;

  public constructor() {
    super("lifecycle");
  }

  public preload(): void {
    const mode = this.getMode();
    if (mode === "restart-say" || mode === "restart-choose") {
      preloadDefaultBitmapFont(this);
    }
  }

  public create(): void {
    this.logGeneration += 1;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.logGeneration += 1;
      this.logText = null;
    });
    this.generation = 0;
    this.windowRef = null;
    this.messageWindow = null;
    this.choiceWindow = null;
    this.sharedInput = null;
    this.logText = null;

    this.cameras.main.setBackgroundColor(0x101820);
    const mode = this.getMode();
    if (mode === "restart-say" || mode === "restart-choose") {
      this.logText = this.add.bitmapText(40, 420, DEFAULT_BITMAP_FONT_ASSET.key, "Lifecycle log:", 12);
    }
    if (mode === "restart-say") {
      void this.runRestartDuringSay();
      return;
    }
    if (mode === "restart-choose") {
      void this.runRestartDuringChoose();
      return;
    }
    this.spawnBaseWindow();
  }

  public override update(time: number, delta: number): void {
    this.sharedInput?.update(delta);
    this.windowRef?.update(time, delta);
    this.messageWindow?.update(time, delta);
    this.choiceWindow?.update(time, delta);
  }

  private getMode(): LifecycleMode {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "restart-say" || mode === "restart-choose") {
      return mode;
    }
    return "base";
  }

  private spawnBaseWindow(): void {
    this.generation += 1;
    const windowRef = new WindowBase(this, { x: 120, y: 80, width: 360, height: 140 });
    this.windowRef = windowRef;
    const openPromise = windowRef.open();
    ignoreTransitionCancellation(openPromise);
    windowRef.activate();
    this.time.delayedCall(1500, () => {
      windowRef.destroy();
      this.windowRef = null;
      if (this.generation < 3) {
        this.spawnBaseWindow();
      }
    });
  }

  private async runRestartDuringSay(): Promise<void> {
    this.sharedInput = new PhaserWindowInput(this);
    this.messageWindow = new MessageWindow(
      this,
      { x: 40, y: 40, width: 520, height: 140, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.sharedInput, ownsInput: true },
    );
    const message = this.messageWindow;
    message.activate();
    const pending = message.say(null, "Lifecycle restart during say {wait:5000}");
    const logGeneration = this.logGeneration;
    pending.catch((error: Error) => {
      writeSandboxLog(
        this.logText,
        this.logGeneration,
        logGeneration,
        `Lifecycle log: ${error.name}`,
      );
    });
    this.time.delayedCall(400, () => {
      this.restartSceneWithoutModeParam();
    });
  }

  private async runRestartDuringChoose(): Promise<void> {
    this.sharedInput = new PhaserWindowInput(this);
    this.choiceWindow = new ChoiceWindow(
      this,
      { x: 120, y: 120, width: 280, height: 120, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.sharedInput, ownsInput: true },
    );
    const choice = this.choiceWindow;
    choice.activate();
    const pending = choice.choose(["Continue", "Stop"]);
    const logGeneration = this.logGeneration;
    pending.catch((error: Error) => {
      writeSandboxLog(
        this.logText,
        this.logGeneration,
        logGeneration,
        `Lifecycle log: ${error.name}`,
      );
    });
    this.time.delayedCall(400, () => {
      this.restartSceneWithoutModeParam();
    });
  }

  /** Drop one-shot mode params so the next create() runs the base lifecycle cycle once. */
  private restartSceneWithoutModeParam(): void {
    this.logGeneration += 1;
    this.logText = null;
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState({}, "", url.toString());
    this.scene.restart();
  }
}
