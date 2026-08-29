import Phaser from "phaser";
import type { WindowBounds } from "./types.ts";

export class ContentClipperUnsupportedError extends Error {
  public override readonly name = "ContentClipperUnsupportedError";

  public constructor(message: string) {
    super(message);
  }
}

/**
 * Encapsulates Phaser mask/filter clipping for a single content container.
 */
export class ContentClipper {
  private target: Phaser.GameObjects.Container | null = null;
  private maskGraphics: Phaser.GameObjects.Graphics | null = null;
  private geometryMask: Phaser.Display.Masks.GeometryMask | null = null;
  private maskFilter: Phaser.Filters.Mask | null = null;
  private enabled = false;
  private bounds: WindowBounds = { x: 0, y: 0, width: 0, height: 0 };
  private readonly scene: Phaser.Scene;
  private destroyed = false;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public attach(target: Phaser.GameObjects.Container): void {
    this.target = target;
    this.target.setSize(this.bounds.width, this.bounds.height);
    this.ensureMaskGraphics();
    if (this.maskGraphics !== null && this.maskGraphics.parentContainer !== target) {
      target.add(this.maskGraphics);
    }
    if (this.enabled) {
      this.applyMask();
    }
  }

  public updateBounds(bounds: WindowBounds): void {
    this.bounds = { ...bounds };
    if (this.target !== null) {
      this.target.setSize(bounds.width, bounds.height);
    }
    this.redrawMask();
  }

  public enable(): void {
    if (this.destroyed) {
      return;
    }
    this.enabled = true;
    this.applyMask();
  }

  public disable(): void {
    this.enabled = false;
    this.removeMask();
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.disable();
    if (this.maskGraphics !== null) {
      this.maskGraphics.parentContainer?.remove(this.maskGraphics);
      this.maskGraphics.destroy();
    }
    this.maskGraphics = null;
    this.target = null;
  }

  private applyMask(): void {
    const target = this.target;
    if (target === null) {
      return;
    }
    this.ensureMaskGraphics();
    if (this.maskGraphics !== null && this.maskGraphics.parentContainer !== target) {
      target.add(this.maskGraphics);
    }
    this.redrawMask();

    const renderer = this.scene.game.renderer;
    if (renderer.type === Phaser.WEBGL) {
      this.applyWebGLMask(target);
    } else if (renderer.type === Phaser.CANVAS) {
      this.applyCanvasMask(target);
    } else {
      throw new ContentClipperUnsupportedError(
        `Unsupported renderer type: ${String(renderer.type)}`,
      );
    }
  }

  private applyWebGLMask(target: Phaser.GameObjects.Container): void {
    this.clearCanvasMask(target);
    if (this.maskGraphics === null) {
      return;
    }
    if (target.filters === null) {
      target.enableFilters();
    }
    target.filtersAutoFocus = true;
    target.filtersFocusContext = true;
    const filters = target.filters;
    if (filters === null) {
      throw new ContentClipperUnsupportedError("Failed to enable filters on content container.");
    }
    if (this.maskFilter !== null) {
      filters.external.remove(this.maskFilter, true);
      this.maskFilter = null;
    }
    // Internal masks match the filtered object's view. Scrolled children expand
    // that view, so the clip rect sticks to the overflow instead of the viewport.
    // External + world keeps the hole at the content rectangle in camera space.
    this.maskFilter = filters.external.addMask(
      this.maskGraphics,
      false,
      this.scene.cameras.main,
      "world",
    );
  }

  private applyCanvasMask(target: Phaser.GameObjects.Container): void {
    this.clearWebGLMask(target);
    if (this.maskGraphics === null) {
      return;
    }
    if (this.geometryMask !== null) {
      target.clearMask(true);
      this.geometryMask.destroy();
    }
    this.geometryMask = this.maskGraphics.createGeometryMask();
    target.setMask(this.geometryMask);
  }

  private removeMask(): void {
    const target = this.target;
    if (target === null) {
      return;
    }
    this.clearWebGLMask(target);
    this.clearCanvasMask(target);
  }

  private clearWebGLMask(target: Phaser.GameObjects.Container): void {
    if (this.maskFilter !== null && target.filters !== null) {
      target.filters.external.remove(this.maskFilter, true);
      this.maskFilter = null;
    }
  }

  private clearCanvasMask(target: Phaser.GameObjects.Container): void {
    if (this.geometryMask !== null) {
      target.clearMask(true);
      this.geometryMask.destroy();
      this.geometryMask = null;
    }
  }

  private ensureMaskGraphics(): void {
    if (this.maskGraphics !== null) {
      return;
    }
    this.maskGraphics = this.scene.add.graphics();
    this.maskGraphics.setVisible(false);
  }

  private redrawMask(): void {
    if (this.maskGraphics === null) {
      return;
    }
    const { width, height } = this.bounds;
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff, 1);
    this.maskGraphics.fillRect(0, 0, width, height);
    if (this.maskFilter !== null) {
      this.maskFilter.needsUpdate = true;
    }
  }
}
