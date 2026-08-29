import Phaser from "phaser";
import type { GraphicsFactory, GraphicsLike } from "./WindowRenderer.ts";

class PhaserGraphicsLike implements GraphicsLike {
  public constructor(private readonly graphics: Phaser.GameObjects.Graphics) {}

  public clear(): void {
    this.graphics.clear();
  }

  public fillStyle(color: number, alpha?: number): this {
    this.graphics.fillStyle(color, alpha ?? 1);
    return this;
  }

  public lineStyle(lineWidth: number, color: number, alpha?: number): this {
    this.graphics.lineStyle(lineWidth, color, alpha ?? 1);
    return this;
  }

  public fillRect(x: number, y: number, width: number, height: number): this {
    this.graphics.fillRect(x, y, width, height);
    return this;
  }

  public strokeRect(x: number, y: number, width: number, height: number): this {
    this.graphics.strokeRect(x, y, width, height);
    return this;
  }

  public setVisible(visible: boolean): void {
    this.graphics.setVisible(visible);
  }

  public setAlpha(alpha: number): void {
    this.graphics.setAlpha(alpha);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}

/** Creates renderer graphics parented to a window root container. */
export function createPhaserGraphicsFactory(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
): GraphicsFactory {
  return {
    createBackground(): GraphicsLike {
      const graphics = scene.add.graphics();
      root.add(graphics);
      return new PhaserGraphicsLike(graphics);
    },
    createFrame(): GraphicsLike {
      const graphics = scene.add.graphics();
      root.add(graphics);
      return new PhaserGraphicsLike(graphics);
    },
  };
}
