import Phaser from "phaser";
import { WindowBase } from "../../src/core/WindowBase.ts";

export class WindowBaseScene extends Phaser.Scene {
  private windowRef: WindowBase | null = null;
  private overflow: Phaser.GameObjects.Graphics | null = null;
  private animOffset = 0;

  public constructor() {
    super("window-base");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x18202b);
    this.windowRef = new WindowBase(this, { x: 80, y: 60, width: 420, height: 180 });
    this.overflow = this.add.graphics();
    this.overflow.lineStyle(2, 0xffcc66, 1);
    this.overflow.strokeCircle(0, 0, 40);
    this.windowRef.getContentContainer().add(this.overflow);
    void this.windowRef.open();
    this.windowRef.activate();
  }

  public override update(_time: number, delta: number): void {
    this.animOffset += delta * 0.05;
    if (this.overflow !== null) {
      this.overflow.setPosition(Math.trunc(Math.sin(this.animOffset) * 20), 0);
    }
    this.windowRef?.update(_time, delta);
  }
}
