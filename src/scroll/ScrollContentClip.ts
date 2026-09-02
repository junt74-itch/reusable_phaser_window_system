import Phaser from "phaser";
import { ContentClipper } from "../core/ContentClipper.ts";

/**
 * Viewport that clips a moving scroll body to the content rectangle.
 * Uses {@link ContentClipper} (external world mask) plus a visibility cull so
 * children that leave the viewport cannot paint outside the window chrome.
 */
export class ScrollContentClip {
  private readonly viewport: Phaser.GameObjects.Container;
  private readonly clipper: ContentClipper;
  private width = 0;
  private height = 0;
  private destroyed = false;

  public constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.viewport = scene.add.container(0, 0);
    parent.add(this.viewport);
    this.clipper = new ContentClipper(scene);
    this.clipper.attach(this.viewport);
  }

  public getViewport(): Phaser.GameObjects.Container {
    return this.viewport;
  }

  public updateBounds(width: number, height: number): void {
    if (this.destroyed) {
      return;
    }
    this.width = width;
    this.height = height;
    this.viewport.setSize(width, height);
    this.clipper.updateBounds({ x: 0, y: 0, width, height });
    this.clipper.enable();
  }

  public cullChildren(
    body: Phaser.GameObjects.Container,
    scrollOffset: number,
    axis: "x" | "y",
  ): void {
    if (this.destroyed) {
      return;
    }
    const viewportStart = scrollOffset;
    const viewportEnd = scrollOffset + (axis === "x" ? this.width : this.height);
    for (const child of body.list) {
      if (!(child instanceof Phaser.GameObjects.BitmapText)) {
        continue;
      }
      this.applyCull(child, 0, viewportStart, viewportEnd, axis);
    }
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.clipper.destroy();
    this.viewport.destroy(true);
  }

  private applyCull(
    child: Phaser.GameObjects.GameObject,
    parentOffset: number,
    viewportStart: number,
    viewportEnd: number,
    axis: "x" | "y",
  ): void {
    const transform = child as Phaser.GameObjects.GameObject & {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      setVisible?: (visible: boolean) => void;
    };
    if (typeof transform.setVisible !== "function") {
      return;
    }
    const start = parentOffset + (axis === "x" ? (transform.x ?? 0) : (transform.y ?? 0));
    const size = axis === "x" ? (transform.width ?? 0) : (transform.height ?? 0);
    const end = start + size;
    transform.setVisible(end > viewportStart && start < viewportEnd);
  }
}
