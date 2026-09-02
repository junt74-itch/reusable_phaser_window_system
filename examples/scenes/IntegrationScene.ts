import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { writeSandboxLog } from "../writeSandboxLog.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { MessageWindow } from "../../src/message/MessageWindow.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";
import { layoutWindowInViewport } from "../../src/layout/viewportLayout.ts";

export class IntegrationScene extends Phaser.Scene {
  private messageWindow: MessageWindow | null = null;
  private choiceWindow: ChoiceWindow | null = null;
  private sharedInput: PhaserWindowInput | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private logGeneration = 0;
  private iteration = 0;
  private loopRunning = false;
  private keysBound = false;

  public constructor() {
    super("integration");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.logGeneration += 1;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.logGeneration += 1;
      this.logText = null;
    });
    this.iteration = 0;
    this.loopRunning = false;
    this.messageWindow = null;
    this.choiceWindow = null;
    this.sharedInput = null;
    this.logText = null;

    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.sharedInput = new PhaserWindowInput(this);
    const bounds = integrationLayout(this);
    this.messageWindow = new MessageWindow(
      this,
      {
        x: bounds.message.x,
        y: bounds.message.y,
        width: bounds.message.width,
        height: bounds.message.height,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { input: this.sharedInput, ownsInput: true },
    );
    this.choiceWindow = new ChoiceWindow(
      this,
      {
        x: bounds.choice.x,
        y: bounds.choice.y,
        width: bounds.choice.width,
        height: bounds.choice.height,
        theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
      },
      { input: this.sharedInput, ownsInput: false },
    );
    this.logText = this.add.bitmapText(40, 200, DEFAULT_BITMAP_FONT_ASSET.key, "Event log:", 12);
    this.add.bitmapText(
      40,
      240,
      DEFAULT_BITMAP_FONT_ASSET.key,
      "Keys: C close O open [ ] resize H hide S show D destroy R restart",
      12,
    );
    this.bindExerciseKeys();

    const exercise = new URLSearchParams(window.location.search).get("exercise");
    if (exercise === "restart-say") {
      void this.runRestartDuringSay();
      return;
    }
    if (exercise === "restart-choose") {
      void this.runRestartDuringChoose();
      return;
    }
    void this.runLoop();
  }

  public override update(time: number, delta: number): void {
    this.sharedInput?.update(delta);
    this.messageWindow?.update(time, delta);
    this.choiceWindow?.update(time, delta);
  }

  private async runLoop(): Promise<void> {
    if (this.loopRunning) {
      return;
    }
    this.loopRunning = true;
    const message = this.messageWindow;
    const choice = this.choiceWindow;
    if (message === null || choice === null || this.logText === null) {
      this.loopRunning = false;
      return;
    }
    this.logText.setText("Event log: loop owner started");
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
        this.loopRunning = false;
        return;
      }
      this.logText.setText(`Event log: iteration ${this.iteration}`);
    }
    this.logText.setText("Event log: loop complete");
    this.loopRunning = false;
  }

  private bindExerciseKeys(): void {
    if (this.keysBound || this.input.keyboard === null) {
      return;
    }
    this.keysBound = true;
    this.input.keyboard.on("keydown-C", () => {
      void this.messageWindow?.close();
    });
    this.input.keyboard.on("keydown-O", () => {
      void this.messageWindow?.open();
    });
    this.input.keyboard.on("keydown-OPEN_BRACKET", () => {
      this.messageWindow?.setSize(460, 120);
    });
    this.input.keyboard.on("keydown-CLOSE_BRACKET", () => {
      this.messageWindow?.setSize(520, 140);
    });
    this.input.keyboard.on("keydown-H", () => {
      this.messageWindow?.hide();
    });
    this.input.keyboard.on("keydown-S", () => {
      this.messageWindow?.show();
    });
    this.input.keyboard.on("keydown-D", () => {
      void this.exerciseDestroyDuringPending();
    });
    this.input.keyboard.on("keydown-R", () => {
      this.restartSceneWithoutExerciseParams();
    });
  }

  private async exerciseDestroyDuringPending(): Promise<void> {
    const message = this.messageWindow;
    if (message === null || this.logText === null) {
      return;
    }
    message.activate();
    this.choiceWindow?.deactivate();
    const sayPromise = message.say(null, "Destroy exercise {wait:5000}");
    this.time.delayedCall(200, () => {
      message.destroy();
      this.messageWindow = null;
      this.sharedInput = null;
    });
    try {
      await sayPromise;
    } catch (error) {
      this.logText.setText(
        `Event log: say ${error instanceof Error ? error.name : "settled"}`,
      );
    }
    this.recreateWindows();
    const choice = this.choiceWindow;
    if (choice === null) {
      return;
    }
    choice.activate();
    const choosePromise = choice.choose(["Continue"]);
    this.time.delayedCall(200, () => {
      choice.destroy();
      this.choiceWindow = null;
    });
    try {
      await choosePromise;
    } catch (error) {
      this.logText.setText(
        `Event log: choose ${error instanceof Error ? error.name : "settled"}`,
      );
    }
    this.recreateWindows();
    this.logText.setText("Event log: destroy exercise complete");
  }

  private ensureSharedInput(): PhaserWindowInput {
    if (this.sharedInput === null || this.sharedInput.isAdapterDisposed()) {
      this.sharedInput = new PhaserWindowInput(this);
    }
    return this.sharedInput;
  }

  private recreateWindows(): void {
    const input = this.ensureSharedInput();
    const bounds = integrationLayout(this);
    if (this.messageWindow === null) {
      this.messageWindow = new MessageWindow(
        this,
        {
          x: bounds.message.x,
          y: bounds.message.y,
          width: bounds.message.width,
          height: bounds.message.height,
          theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
        },
        { input, ownsInput: true },
      );
    }
    if (this.choiceWindow === null) {
      this.choiceWindow = new ChoiceWindow(
        this,
        {
          x: bounds.choice.x,
          y: bounds.choice.y,
          width: bounds.choice.width,
          height: bounds.choice.height,
          theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } },
        },
        { input, ownsInput: false },
      );
    }
  }

  private async runRestartDuringSay(): Promise<void> {
    const message = this.messageWindow;
    if (message === null || this.logText === null) {
      return;
    }
    message.activate();
    const pending = message.say(null, "Restart during say {wait:5000}");
    const logGeneration = this.logGeneration;
    pending.catch((error: Error) => {
      writeSandboxLog(this.logText, this.logGeneration, logGeneration, `Event log: ${error.name}`);
    });
    this.time.delayedCall(300, () => {
      this.restartSceneWithoutExerciseParams();
    });
  }

  private async runRestartDuringChoose(): Promise<void> {
    const choice = this.choiceWindow;
    if (choice === null || this.logText === null) {
      return;
    }
    choice.activate();
    const pending = choice.choose(["Continue", "Stop"]);
    const logGeneration = this.logGeneration;
    pending.catch((error: Error) => {
      writeSandboxLog(this.logText, this.logGeneration, logGeneration, `Event log: ${error.name}`);
    });
    this.time.delayedCall(300, () => {
      this.restartSceneWithoutExerciseParams();
    });
  }

  /** Drop one-shot exercise params so the next create() runs the normal loop once. */
  private restartSceneWithoutExerciseParams(): void {
    this.logGeneration += 1;
    this.logText = null;
    const url = new URL(window.location.href);
    url.searchParams.delete("exercise");
    window.history.replaceState({}, "", url.toString());
    this.scene.restart();
  }
}

function integrationLayout(scene: Phaser.Scene): {
  readonly message: { x: number; y: number; width: number; height: number };
  readonly choice: { x: number; y: number; width: number; height: number };
} {
  const viewportWidth = scene.cameras.main.width;
  const viewportHeight = scene.cameras.main.height;
  return {
    message: layoutWindowInViewport({
      viewportWidth,
      viewportHeight,
      width: 520,
      height: 140,
      margin: 40,
      anchor: "top-center",
    }),
    choice: layoutWindowInViewport({
      viewportWidth,
      viewportHeight,
      width: 280,
      height: 120,
      margin: 40,
      anchor: "bottom-center",
    }),
  };
}
