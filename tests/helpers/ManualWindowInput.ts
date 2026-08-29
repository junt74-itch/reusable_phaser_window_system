import type {
  WindowInputAction,
  WindowInputPhase,
} from "../../src/input/types.ts";
import { BaseWindowInputAdapter } from "../../src/input/WindowInputAdapter.ts";

/**
 * Deterministic manual input adapter for unit tests.
 */
export class ManualWindowInput extends BaseWindowInputAdapter {
  private timestamp = 0;

  public pushAction(action: WindowInputAction, phase: WindowInputPhase = "pressed"): void {
    this.emitAction({
      action,
      phase,
      timestamp: this.nextTimestamp(),
      source: "manual",
    });
  }

  public pushPointer(
    localX: number,
    localY: number,
    worldX: number,
    worldY: number,
    isPrimaryDown: boolean,
    phase: WindowInputPhase = "pressed",
  ): void {
    this.emitPointer({
      localX,
      localY,
      worldX,
      worldY,
      isPrimaryDown,
      phase,
      timestamp: this.nextTimestamp(),
      source: "manual",
    });
  }

  private nextTimestamp(): number {
    this.timestamp += 1;
    return this.timestamp;
  }
}
