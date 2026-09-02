import type Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import type { WindowBaseOptions } from "../core/WindowBase.ts";
import { TextWindowBase } from "../text/TextWindowBase.ts";
import { flattenRichText } from "../text/richText.ts";
import type { RichText } from "../text/types.ts";

/**
 * Small help text pane. Binding to the current selection is scene-owned.
 */
export class HelpWindow extends TextWindowBase {
  private source: string | RichText | null = null;

  public constructor(scene: Phaser.Scene, config: WindowConfig, options: WindowBaseOptions = {}) {
    super(scene, config, options);
  }

  public setHelp(content: string | RichText | null): void {
    if (content === null) {
      this.source = null;
    } else if (typeof content === "string") {
      this.source = content.length > 0 ? content : null;
    } else {
      this.source = flattenRichText(content).text.length > 0 ? content : null;
    }
    this.renderHelp();
  }

  public getHelp(): string | RichText | null {
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
