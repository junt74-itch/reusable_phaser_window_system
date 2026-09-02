import Phaser from "phaser";
import { ContentClipper } from "../../src/core/ContentClipper.ts";

export class ClippingSpikeScene extends Phaser.Scene {
  public constructor() {
    super("clipping-spike");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    const root = this.add.container(100, 80);
    const content = this.add.container(20, 20);
    root.add(content);
    const overflow = this.add.graphics();
    overflow.fillStyle(0xff6666, 1);
    overflow.fillCircle(80, 40, 50);
    content.add(overflow);
    const clipper = new ContentClipper(this);
    clipper.attach(content);
    clipper.updateBounds({ x: 20, y: 20, width: 120, height: 80 });
    clipper.enable();
    this.tweens.add({
      targets: root,
      x: 180,
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
  }
}
