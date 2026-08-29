import Phaser from "phaser";
import type {
  WindowActionEvent,
  WindowInputAction,
  WindowInputPhase,
  WindowInputSource,
  WindowDragEvent,
  WindowPointerEvent,
  WindowWheelEvent,
} from "./types.ts";
import { BaseWindowInputAdapter } from "./WindowInputAdapter.ts";

export interface PhaserWindowInputBindings {
  readonly up?: readonly number[];
  readonly down?: readonly number[];
  readonly left?: readonly number[];
  readonly right?: readonly number[];
  readonly confirm?: readonly number[];
  readonly cancel?: readonly number[];
  readonly pageUp?: readonly number[];
  readonly pageDown?: readonly number[];
  readonly skip?: readonly number[];
}

export interface PhaserWindowInputOptions {
  readonly bindings?: PhaserWindowInputBindings;
  readonly enableGamepad?: boolean;
  readonly gamepadDeadZone?: number;
  readonly localToWorld?: (localX: number, localY: number) => { worldX: number; worldY: number };
}

const DEFAULT_BINDINGS: Required<PhaserWindowInputBindings> = {
  up: [Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.W],
  down: [Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.S],
  left: [Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.A],
  right: [Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.D],
  confirm: [Phaser.Input.Keyboard.KeyCodes.ENTER, Phaser.Input.Keyboard.KeyCodes.SPACE],
  cancel: [Phaser.Input.Keyboard.KeyCodes.ESC, Phaser.Input.Keyboard.KeyCodes.BACKSPACE],
  pageUp: [Phaser.Input.Keyboard.KeyCodes.PAGE_UP],
  pageDown: [Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN],
  skip: [Phaser.Input.Keyboard.KeyCodes.CTRL],
};

const ACTION_TO_BINDING_KEY: Record<WindowInputAction, keyof PhaserWindowInputBindings> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  confirm: "confirm",
  cancel: "cancel",
  pageUp: "pageUp",
  pageDown: "pageDown",
  skip: "skip",
};

/**
 * Phaser keyboard/pointer/gamepad adapter scoped to one Scene.
 */
export class PhaserWindowInput extends BaseWindowInputAdapter {
  private readonly scene: Phaser.Scene;
  private readonly bindings: Required<PhaserWindowInputBindings>;
  private readonly enableGamepad: boolean;
  private readonly gamepadDeadZone: number;
  private readonly localToWorld: (localX: number, localY: number) => { worldX: number; worldY: number };
  private readonly keyObjects: Phaser.Input.Keyboard.Key[] = [];
  private readonly keyDownHandler: (event: KeyboardEvent) => void;
  private readonly keyUpHandler: (event: KeyboardEvent) => void;
  private readonly pointerDownHandler: (pointer: Phaser.Input.Pointer) => void;
  private readonly pointerUpHandler: (pointer: Phaser.Input.Pointer) => void;
  private readonly pointerMoveHandler: (pointer: Phaser.Input.Pointer) => void;
  private readonly wheelHandler: (
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number,
    deltaZ: number,
  ) => void;
  private readonly shutdownHandler: () => void;
  private readonly pressedKeys = new Set<number>();
  private readonly repeatAccumMs = new Map<number, number>();
  private readonly gamepadPrevious = new Map<number, Set<WindowInputAction>>();
  private readonly activeDrags = new Map<
    number,
    {
      localX: number;
      localY: number;
      worldX: number;
      worldY: number;
      remainderX: number;
      remainderY: number;
    }
  >();
  private gamepadRepeatMs = 0;

  public constructor(scene: Phaser.Scene, options: PhaserWindowInputOptions = {}) {
    super();
    this.scene = scene;
    this.bindings = mergeBindings(options.bindings);
    this.enableGamepad = options.enableGamepad ?? true;
    this.gamepadDeadZone = options.gamepadDeadZone ?? 0.2;
    this.localToWorld =
      options.localToWorld ??
      ((localX, localY) => ({
        worldX: localX,
        worldY: localY,
      }));

    this.keyDownHandler = (event) => this.handleKey(event, "pressed");
    this.keyUpHandler = (event) => this.handleKey(event, "released");
    this.pointerDownHandler = (pointer) => {
      this.emitPointerFromPhaser(pointer, "pressed", true);
      this.emitDragFromPhaser(pointer, "started");
    };
    this.pointerUpHandler = (pointer) => {
      this.emitPointerFromPhaser(pointer, "released", false);
      this.emitDragFromPhaser(pointer, "ended");
    };
    this.pointerMoveHandler = (pointer) => {
      this.emitPointerFromPhaser(pointer, "repeated", pointer.isDown);
      if (pointer.isDown) {
        this.emitDragFromPhaser(pointer, "moved");
      }
    };
    this.wheelHandler = (pointer, _currentlyOver, deltaX, deltaY, deltaZ) => {
      this.emitWheelFromPhaser(pointer, deltaX, deltaY, deltaZ);
    };
    this.shutdownHandler = () => this.dispose();

    this.registerKeyboard();
    this.registerPointer();
    this.registerWheel();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownHandler);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.shutdownHandler);
  }

  public override dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.scene.input.keyboard?.off("keydown", this.keyDownHandler);
    this.scene.input.keyboard?.off("keyup", this.keyUpHandler);
    this.scene.input.off("pointerdown", this.pointerDownHandler);
    this.scene.input.off("pointerup", this.pointerUpHandler);
    this.scene.input.off("pointerupoutside", this.pointerUpHandler);
    this.scene.input.off("pointermove", this.pointerMoveHandler);
    this.scene.input.off("wheel", this.wheelHandler);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdownHandler);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.shutdownHandler);
    for (const key of this.keyObjects) {
      key.destroy();
    }
    this.keyObjects.length = 0;
    this.pressedKeys.clear();
    this.repeatAccumMs.clear();
    this.gamepadPrevious.clear();
    this.activeDrags.clear();
    super.dispose();
  }

  /** Deterministic repeat/update hook for tests and Scene update loops. */
  public update(deltaMs: number): void {
    if (this.isDisposed || !Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }
    this.gamepadRepeatMs += deltaMs;
    this.updateKeyboardRepeat(deltaMs);
    if (this.enableGamepad) {
      this.updateGamepad(deltaMs);
    }
  }

  private registerKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (keyboard === null) {
      return;
    }
    keyboard.on("keydown", this.keyDownHandler);
    keyboard.on("keyup", this.keyUpHandler);
    for (const codes of Object.values(this.bindings)) {
      for (const code of codes) {
        this.keyObjects.push(keyboard.addKey(code, false));
      }
    }
  }

  private registerPointer(): void {
    this.scene.input.on("pointerdown", this.pointerDownHandler);
    this.scene.input.on("pointerup", this.pointerUpHandler);
    this.scene.input.on("pointerupoutside", this.pointerUpHandler);
    this.scene.input.on("pointermove", this.pointerMoveHandler);
  }

  private registerWheel(): void {
    this.scene.input.on("wheel", this.wheelHandler);
  }

  private handleKey(event: KeyboardEvent, phase: WindowInputPhase): void {
    const action = this.actionForKeyCode(event.keyCode);
    if (action === null) {
      return;
    }
    if (phase === "pressed") {
      if (this.pressedKeys.has(event.keyCode)) {
        return;
      }
      this.pressedKeys.add(event.keyCode);
      this.repeatAccumMs.set(event.keyCode, 0);
    } else {
      this.pressedKeys.delete(event.keyCode);
      this.repeatAccumMs.delete(event.keyCode);
    }
    this.emitActionSnapshot(action, phase, "keyboard");
  }

  private updateKeyboardRepeat(deltaMs: number): void {
    for (const keyCode of this.pressedKeys) {
      const elapsed = (this.repeatAccumMs.get(keyCode) ?? 0) + deltaMs;
      this.repeatAccumMs.set(keyCode, elapsed);
      if (elapsed >= 400) {
        const action = this.actionForKeyCode(keyCode);
        if (action !== null) {
          this.emitActionSnapshot(action, "repeated", "keyboard");
        }
        this.repeatAccumMs.set(keyCode, 350);
      }
    }
  }

  private updateGamepad(deltaMs: number): void {
    void deltaMs;
    const pads = this.scene.input.gamepad?.pad1 ? [this.scene.input.gamepad.pad1] : [];
    for (const pad of pads) {
      if (pad === null) {
        continue;
      }
      const index = pad.index;
      const previous = this.gamepadPrevious.get(index) ?? new Set<WindowInputAction>();
      const current = new Set<WindowInputAction>();
      this.collectGamepadActions(pad, current);
      for (const action of current) {
        if (!previous.has(action)) {
          this.emitActionSnapshot(action, "pressed", "gamepad");
        } else if (this.gamepadRepeatMs >= 400) {
          this.emitActionSnapshot(action, "repeated", "gamepad");
        }
      }
      for (const action of previous) {
        if (!current.has(action)) {
          this.emitActionSnapshot(action, "released", "gamepad");
        }
      }
      this.gamepadPrevious.set(index, current);
    }
    if (this.gamepadRepeatMs >= 400) {
      this.gamepadRepeatMs = 0;
    }
  }

  private collectGamepadActions(
    pad: Phaser.Input.Gamepad.Gamepad,
    out: Set<WindowInputAction>,
  ): void {
    const threshold = this.gamepadDeadZone;
    if (pad.leftStick.y < -threshold) {
      out.add("up");
    }
    if (pad.leftStick.y > threshold) {
      out.add("down");
    }
    if (pad.leftStick.x < -threshold) {
      out.add("left");
    }
    if (pad.leftStick.x > threshold) {
      out.add("right");
    }
    if (pad.up) {
      out.add("up");
    }
    if (pad.down) {
      out.add("down");
    }
    if (pad.left) {
      out.add("left");
    }
    if (pad.right) {
      out.add("right");
    }
    if (pad.A) {
      out.add("confirm");
    }
    if (pad.B) {
      out.add("cancel");
    }
  }

  private emitPointerFromPhaser(
    pointer: Phaser.Input.Pointer,
    phase: WindowInputPhase,
    isPrimaryDown: boolean,
  ): void {
    const world = this.localToWorld(pointer.worldX, pointer.worldY);
    const event: WindowPointerEvent = {
      localX: pointer.x,
      localY: pointer.y,
      worldX: world.worldX,
      worldY: world.worldY,
      isPrimaryDown,
      phase,
      timestamp: this.scene.time.now,
      source: "pointer",
    };
    this.emitPointer(event);
  }

  private emitWheelFromPhaser(
    pointer: Phaser.Input.Pointer,
    deltaX: number,
    deltaY: number,
    deltaZ: number,
  ): void {
    const event: WindowWheelEvent = {
      deltaX,
      deltaY,
      deltaZ,
      pointerId: pointer.id,
      worldX: pointer.worldX,
      worldY: pointer.worldY,
      timestamp: this.scene.time.now,
      source: "pointer",
    };
    this.emitWheel(event);
  }

  private emitDragFromPhaser(
    pointer: Phaser.Input.Pointer,
    phase: WindowDragEvent["phase"],
  ): void {
    const pointerId = pointer.id;
    const world = this.localToWorld(pointer.worldX, pointer.worldY);
    const localX = pointer.x;
    const localY = pointer.y;
    const worldX = world.worldX;
    const worldY = world.worldY;

    if (phase === "started") {
      this.activeDrags.set(pointerId, {
        localX,
        localY,
        worldX,
        worldY,
        remainderX: 0,
        remainderY: 0,
      });
      this.emitDragSnapshot(pointerId, phase, localX, localY, worldX, worldY, 0, 0);
      return;
    }

    const previous = this.activeDrags.get(pointerId);
    if (previous === undefined) {
      return;
    }

    const totalDeltaX = worldX - previous.worldX + previous.remainderX;
    const totalDeltaY = worldY - previous.worldY + previous.remainderY;
    const deltaX = Math.trunc(totalDeltaX);
    const deltaY = Math.trunc(totalDeltaY);
    const nextDragState = {
      localX,
      localY,
      worldX,
      worldY,
      remainderX: totalDeltaX - deltaX,
      remainderY: totalDeltaY - deltaY,
    };
    if (phase === "moved") {
      this.activeDrags.set(pointerId, nextDragState);
      this.emitDragSnapshot(pointerId, phase, localX, localY, worldX, worldY, deltaX, deltaY);
      return;
    }

    this.activeDrags.delete(pointerId);
    this.emitDragSnapshot(pointerId, phase, localX, localY, worldX, worldY, deltaX, deltaY);
  }

  private emitDragSnapshot(
    pointerId: number,
    phase: WindowDragEvent["phase"],
    localX: number,
    localY: number,
    worldX: number,
    worldY: number,
    deltaX: number,
    deltaY: number,
  ): void {
    const event: WindowDragEvent = {
      phase,
      pointerId,
      localX: Math.trunc(localX),
      localY: Math.trunc(localY),
      worldX: Math.trunc(worldX),
      worldY: Math.trunc(worldY),
      deltaX: Math.trunc(deltaX),
      deltaY: Math.trunc(deltaY),
      timestamp: this.scene.time.now,
      source: "pointer",
    };
    this.emitDrag(event);
  }

  private emitActionSnapshot(
    action: WindowInputAction,
    phase: WindowInputPhase,
    source: WindowInputSource,
  ): void {
    const event: WindowActionEvent = {
      action,
      phase,
      timestamp: this.scene.time.now,
      source,
    };
    this.emitAction(event);
  }

  private actionForKeyCode(keyCode: number): WindowInputAction | null {
    for (const [action, bindingKey] of Object.entries(ACTION_TO_BINDING_KEY)) {
      const codes = this.bindings[bindingKey];
      if (codes.includes(keyCode)) {
        return action as WindowInputAction;
      }
    }
    return null;
  }
}

function mergeBindings(
  partial: PhaserWindowInputBindings | undefined,
): Required<PhaserWindowInputBindings> {
  return {
    up: partial?.up ?? DEFAULT_BINDINGS.up,
    down: partial?.down ?? DEFAULT_BINDINGS.down,
    left: partial?.left ?? DEFAULT_BINDINGS.left,
    right: partial?.right ?? DEFAULT_BINDINGS.right,
    confirm: partial?.confirm ?? DEFAULT_BINDINGS.confirm,
    cancel: partial?.cancel ?? DEFAULT_BINDINGS.cancel,
    pageUp: partial?.pageUp ?? DEFAULT_BINDINGS.pageUp,
    pageDown: partial?.pageDown ?? DEFAULT_BINDINGS.pageDown,
    skip: partial?.skip ?? DEFAULT_BINDINGS.skip,
  };
}
