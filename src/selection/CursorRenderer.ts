import Phaser from "phaser";
import type { ResolvedWindowTheme } from "../core/types.ts";
import type { WindowBounds } from "../core/types.ts";

/**
 * Draws a themed selection cursor around the active row bounds.
 */
export class CursorRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private destroyed = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
  ) {
    this.graphics = scene.add.graphics();
    parent.add(this.graphics);
  }

  public draw(bounds: WindowBounds, theme: ResolvedWindowTheme): void {
    if (this.destroyed) {
      return;
    }
    const cursor = theme.cursor;
    this.graphics.clear();
    this.graphics.lineStyle(cursor.width, cursor.color, cursor.alpha);
    this.graphics.strokeRect(
      bounds.x - cursor.padding,
      bounds.y - cursor.padding,
      bounds.width + cursor.padding * 2,
      bounds.height + cursor.padding * 2,
    );
  }

  public hide(): void {
    this.graphics.clear();
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.graphics.destroy();
  }
}
