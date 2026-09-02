import Phaser from "phaser";
import type { ResolvedWindowTheme } from "../core/types.ts";

/**
 * Fixed up/down overflow arrows drawn on the clipped content container.
 */
export class ScrollOverflowIndicators {
  private readonly up: Phaser.GameObjects.Graphics;
  private readonly down: Phaser.GameObjects.Graphics;
  private destroyed = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
  ) {
    this.up = scene.add.graphics();
    this.down = scene.add.graphics();
    parent.add(this.up);
    parent.add(this.down);
    this.up.setVisible(false);
    this.down.setVisible(false);
  }

  public update(
    contentWidth: number,
    contentHeight: number,
    canScrollUp: boolean,
    canScrollDown: boolean,
    theme: ResolvedWindowTheme,
  ): void {
    if (this.destroyed) {
      return;
    }
    this.drawArrow(this.up, contentWidth, 2, true, canScrollUp, theme);
    this.drawArrow(this.down, contentWidth, contentHeight - 10, false, canScrollDown, theme);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.up.destroy();
    this.down.destroy();
  }

  private drawArrow(
    graphics: Phaser.GameObjects.Graphics,
    contentWidth: number,
    y: number,
    pointsUp: boolean,
    visible: boolean,
    theme: ResolvedWindowTheme,
  ): void {
    graphics.clear();
    graphics.setVisible(visible);
    if (!visible) {
      return;
    }
    const centerX = Math.trunc(contentWidth / 2);
    const tipY = y + (pointsUp ? 0 : 8);
    const baseY = y + (pointsUp ? 8 : 0);
    graphics.fillStyle(theme.text.tint, 0.85);
    if (pointsUp) {
      graphics.fillTriangle(centerX, tipY, centerX - 6, baseY, centerX + 6, baseY);
    } else {
      graphics.fillTriangle(centerX, tipY, centerX - 6, baseY, centerX + 6, baseY);
    }
  }
}
