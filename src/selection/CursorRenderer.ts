import Phaser from "phaser";
import type { ResolvedWindowTheme } from "../core/types.ts";
import type { WindowBounds } from "../core/types.ts";
import { cursorBlinkVisible } from "./cursorBlink.ts";

export { cursorBlinkVisible } from "./cursorBlink.ts";

/**
 * Draws a themed selection cursor around the active row bounds.
 */
export class CursorRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private destroyed = false;
  private shown = false;
  private elapsedMs = 0;
  private blinkPeriodMs = 0;
  private lastBounds: WindowBounds | null = null;
  private lastTheme: ResolvedWindowTheme | null = null;

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
    this.shown = true;
    this.lastBounds = bounds;
    this.lastTheme = theme;
    this.blinkPeriodMs = theme.cursor.blinkPeriodMs;
    this.redraw();
  }

  public hide(): void {
    this.shown = false;
    this.lastBounds = null;
    this.graphics.clear();
    this.graphics.setVisible(false);
  }

  public update(deltaMs: number): void {
    if (this.destroyed || !this.shown) {
      return;
    }
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }
    this.elapsedMs += deltaMs;
    this.applyBlinkVisibility();
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.graphics.destroy();
  }

  private redraw(): void {
    const bounds = this.lastBounds;
    const theme = this.lastTheme;
    if (bounds === null || theme === null) {
      return;
    }
    const cursor = theme.cursor;
    this.graphics.clear();
    this.graphics.fillStyle(cursor.color, cursor.alpha);
    this.graphics.fillRect(
      bounds.x - cursor.padding,
      bounds.y - cursor.padding,
      bounds.width + cursor.padding * 2,
      bounds.height + cursor.padding * 2,
    );
    this.applyBlinkVisibility();
  }

  private applyBlinkVisibility(): void {
    this.graphics.setVisible(this.shown && cursorBlinkVisible(this.elapsedMs, this.blinkPeriodMs));
  }
}
