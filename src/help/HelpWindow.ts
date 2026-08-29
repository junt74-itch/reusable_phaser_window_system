import type Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import type { WindowBaseOptions } from "../core/WindowBase.ts";
import { TextWindowBase } from "../text/TextWindowBase.ts";

/**
 * Small help text pane. Binding to the current selection is scene-owned.
 */
export class HelpWindow extends TextWindowBase {
  private source: string | null = null;

  public constructor(scene: Phaser.Scene, config: WindowConfig, options: WindowBaseOptions = {}) {
    super(scene, config, options);
  }

  public setHelp(text: string | null): void {
    this.source = text !== null && text.length > 0 ? text : null;
    this.renderHelp();
  }

  public getHelp(): string | null {
    return this.source;
  }

  protected override onLayoutChanged(): void {
    super.onLayoutChanged(this.getContentBounds());
    this.renderHelp();
  }

  private renderHelp(): void {
    if (this.source === null) {
      this.clearText();
      return;
    }
    const layout = this.layoutTextContent(this.source);
    this.renderLines(layout.lines.filter((line) => line.pageIndex === 0));
  }
}
