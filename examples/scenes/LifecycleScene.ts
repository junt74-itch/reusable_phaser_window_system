import Phaser from "phaser";
import { WindowBase } from "../../src/core/WindowBase.ts";
import { ignoreTransitionCancellation } from "../../src/core/windowOperations.ts";

export class LifecycleScene extends Phaser.Scene {
  private generation = 0;
  private windowRef: WindowBase | null = null;

  public constructor() {
    super("lifecycle");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.spawnWindow();
  }

  public override update(time: number, delta: number): void {
    this.windowRef?.update(time, delta);
  }

  private spawnWindow(): void {
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
        this.spawnWindow();
      }
    });
  }
}
