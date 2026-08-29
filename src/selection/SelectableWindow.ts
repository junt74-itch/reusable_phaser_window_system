import Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import type { WindowBaseOptions } from "../core/WindowBase.ts";
import { TextWindowBase } from "../text/TextWindowBase.ts";
import { CursorRenderer } from "./CursorRenderer.ts";
import { SelectionController } from "./SelectionController.ts";
import type { SelectableItem, SelectionControllerOptions } from "./types.ts";

export interface SelectableWindowOptions extends WindowBaseOptions, SelectionControllerOptions {
  readonly rowHeight?: number;
  readonly columnGap?: number;
  readonly rowGap?: number;
}

export interface RowBounds {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Renders selectable rows and connects semantic input to {@link SelectionController}.
 */
export abstract class SelectableWindow<T> extends TextWindowBase {
  protected readonly controller: SelectionController<T>;
  private readonly rowLabels: Phaser.GameObjects.BitmapText[] = [];
  private readonly cursor: CursorRenderer;
  private readonly rowHeight: number;
  private readonly columnGap: number;
  private readonly rowGap: number;
  private readonly columns: number;
  private items: readonly SelectableItem<T>[] = [];
  private rowBounds: RowBounds[] = [];
  private pointerDownIndex: number | null = null;
  private subscriptions: Array<{ unsubscribe: () => void }> = [];

  public constructor(
    scene: Phaser.Scene,
    config: WindowConfig,
    options: SelectableWindowOptions = {},
  ) {
    super(scene, config, options);
    this.controller = new SelectionController<T>(options);
    this.columns = Math.max(1, options.columns ?? 1);
    this.rowHeight = options.rowHeight ?? this.theme.text.fontSize * this.theme.text.scale + 8;
    this.columnGap = options.columnGap ?? 8;
    this.rowGap = options.rowGap ?? 4;
    this.cursor = new CursorRenderer(scene, this.content);
    this.bindControllerEvents();
    this.bindInput();
  }

  public setItems(items: readonly SelectableItem<T>[]): void {
    this.items = items;
    this.controller.setItems(items);
    this.relayoutRows();
    this.refreshRowVisuals();
    this.refreshCursor();
  }

  public getItems(): readonly SelectableItem<T>[] {
    return this.items;
  }

  public select(index: number): void {
    if (this.controller.selectIndex(index)) {
      this.refreshCursor();
    }
  }

  public getSelectedIndex(): number {
    return this.controller.getSelectedIndex();
  }

  public getSelectedItem(): SelectableItem<T> | null {
    return this.controller.getSelectedItem();
  }

  protected getRowBounds(): readonly RowBounds[] {
    return this.rowBounds;
  }

  protected abstract onSelectionConfirmed(index: number, item: SelectableItem<T>): void;

  protected abstract onSelectionCancelled(): void;

  public override update(time: number, delta: number): void {
    super.update(time, delta);
  }

  public override destroy(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
    for (const label of this.rowLabels) {
      label.destroy();
    }
    this.rowLabels.length = 0;
    this.cursor.destroy();
    super.destroy();
  }

  protected override onLayoutChanged(): void {
    this.relayoutRows();
    this.refreshRowVisuals();
    this.refreshCursor();
  }

  private bindControllerEvents(): void {
    this.subscriptions.push(
      this.controller.onChange(() => {
        this.refreshRowVisuals();
        this.refreshCursor();
      }),
      this.controller.onConfirm((index, item) => {
        this.onSelectionConfirmed(index, item);
      }),
      this.controller.onCancel(() => {
        this.onSelectionCancelled();
      }),
    );
  }

  private bindInput(): void {
    const input = this.getInputAdapter();
    if (input === null) {
      return;
    }
    this.subscriptions.push(
      input.subscribeAction((event) => {
        if (!this.canConsumeInput() || event.phase !== "pressed") {
          return;
        }
        if (event.action === "confirm") {
          this.controller.confirm();
        } else if (event.action === "cancel") {
          this.controller.cancel();
        } else if (
          event.action === "up" ||
          event.action === "down" ||
          event.action === "left" ||
          event.action === "right"
        ) {
          this.controller.move(event.action);
        }
      }),
      input.subscribePointer((event) => {
        const local = this.worldToContentLocal(event.worldX, event.worldY);
        this.handlePointer(local.x, local.y, event.phase, event.isPrimaryDown);
      }),
    );
  }

  private handlePointer(
    localX: number,
    localY: number,
    phase: string,
    isPrimaryDown: boolean,
  ): void {
    if (!this.canConsumeInput()) {
      return;
    }
    const index = this.hitTestRow(localX, localY);
    if (phase === "pressed" && isPrimaryDown) {
      this.pointerDownIndex = index;
      if (index !== null) {
        this.select(index);
      }
      return;
    }
    if (phase === "released") {
      if (index !== null && index === this.pointerDownIndex) {
        const item = this.items[index];
        if (item?.enabled === true && this.controller.getSelectedIndex() === index) {
          this.controller.confirm();
        }
      }
      this.pointerDownIndex = null;
    }
  }

  private relayoutRows(): void {
    const content = this.getContentBounds();
    const columnWidth = Math.floor(
      (content.width - this.columnGap * (this.columns - 1)) / this.columns,
    );
    this.rowBounds = this.items.map((_, index) => {
      const column = index % this.columns;
      const row = Math.floor(index / this.columns);
      return {
        index,
        x: column * (columnWidth + this.columnGap),
        y: row * (this.rowHeight + this.rowGap),
        width: columnWidth,
        height: this.rowHeight,
      };
    });
    const last = this.rowBounds[this.rowBounds.length - 1];
    const requiredHeight = last === undefined ? 0 : last.y + this.rowHeight;
    if (requiredHeight > content.height) {
      throw new Error("Selectable rows exceed content height in Phase 1.");
    }
  }

  private refreshRowVisuals(): void {
    while (this.rowLabels.length < this.items.length) {
      const label = this.scene.add.bitmapText(
        0,
        0,
        this.theme.text.fontKey,
        "",
        this.theme.text.fontSize,
      );
      label.setScale(this.theme.text.scale);
      this.content.add(label);
      this.rowLabels.push(label);
    }
    for (let index = 0; index < this.rowLabels.length; index += 1) {
      const label = this.rowLabels[index];
      const item = this.items[index];
      const bounds = this.rowBounds[index];
      if (label === undefined || item === undefined || bounds === undefined) {
        label?.setVisible(false);
        continue;
      }
      label.setText(item.label);
      label.setPosition(Math.trunc(bounds.x), Math.trunc(bounds.y + 4));
      label.setTint(item.enabled ? this.theme.text.tint : 0x888888);
      label.setAlpha(item.enabled ? 1 : 0.5);
      label.setVisible(true);
    }
  }

  private refreshCursor(): void {
    const index = this.controller.getSelectedIndex();
    const bounds = index >= 0 ? this.rowBounds[index] : undefined;
    if (bounds === undefined) {
      this.cursor.hide();
      return;
    }
    this.cursor.draw(
      { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      this.theme,
    );
  }

  private hitTestRow(localX: number, localY: number): number | null {
    for (const bounds of this.rowBounds) {
      if (
        localX >= bounds.x &&
        localX <= bounds.x + bounds.width &&
        localY >= bounds.y &&
        localY <= bounds.y + bounds.height
      ) {
        return bounds.index;
      }
    }
    return null;
  }
}
