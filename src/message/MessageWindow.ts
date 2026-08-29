import Phaser from "phaser";
import type { WindowConfig } from "../core/types.ts";
import { WindowDestroyedError } from "../core/types.ts";
import { ignoreTransitionCancellation } from "../core/windowOperations.ts";
import type { WindowBaseOptions } from "../core/WindowBase.ts";
import { TextWindowBase } from "../text/TextWindowBase.ts";
import {
  buildFlatTextFromTokens,
  computeLayoutPageBreaks,
  splitTokensByExplicitPage,
} from "./layoutPages.ts";
import { parseMessage } from "./MessageParser.ts";
import type { MessageToken } from "./types.ts";
import {
  MessageBusyError,
  MessageController,
  type MessageRenderSnapshot,
} from "./MessageController.ts";

export interface MessageSayOptions {
  readonly charsPerSecond?: number;
  readonly autoOpen?: boolean;
  readonly closeOnComplete?: boolean;
}

/**
 * Message window exposing async `say()` over bitmap text rendering.
 */
export class MessageWindow extends TextWindowBase {
  private readonly controller: MessageController;
  private readonly speakerText: Phaser.GameObjects.BitmapText;
  private readonly pauseIndicator: Phaser.GameObjects.Graphics;
  private currentSpeaker: string | null = null;
  private sourceText = "";
  private layoutPageBreaksByPage: number[][] = [];

  public constructor(scene: Phaser.Scene, config: WindowConfig, options: WindowBaseOptions = {}) {
    super(scene, config, options);
    this.controller = new MessageController(this.getInputAdapter(), () => this.canConsumeInput());
    const style = this.theme.text;
    this.speakerText = scene.add.bitmapText(0, 0, style.fontKey, "", style.fontSize);
    this.speakerText.setScale(style.scale);
    this.speakerText.setVisible(false);
    this.content.add(this.speakerText);
    this.pauseIndicator = scene.add.graphics();
    this.pauseIndicator.setVisible(false);
    this.content.add(this.pauseIndicator);
  }

  public say(
    speaker: string | null,
    text: string,
    options: MessageSayOptions = {},
  ): Promise<MessageRenderSnapshot> {
    if (this.getStateSnapshot().phase === "closed") {
      // allow say from closed state
    }
    const charsPerSecond = options.charsPerSecond ?? 30;
    const autoOpen = options.autoOpen ?? true;
    const closeOnComplete = options.closeOnComplete ?? false;
    this.sourceText = text;
    this.currentSpeaker = speaker;
    this.updateSpeakerLine();
    const parsed = parseMessage(text);
    this.layoutPageBreaksByPage = this.computeLayoutPageBreaksByPage(parsed.tokens);
    const firstPageTokens = splitTokensByExplicitPage(parsed.tokens)[0] ?? [];
    const layout = this.layoutTextContent(buildFlatTextFromTokens(firstPageTokens));
    this.renderLines(layout.lines.filter((line) => line.pageIndex === 0));

    if (autoOpen) {
      ignoreTransitionCancellation(this.open());
      this.activate();
      this.show();
    }

    return this.controller
      .start({
        tokens: parsed.tokens,
        charsPerSecond,
        layoutPageBreaksByPage: this.layoutPageBreaksByPage,
      })
      .then(async (snapshot) => {
        if (closeOnComplete) {
          await this.close();
          this.deactivate();
        }
        return snapshot;
      })
      .catch((error: Error) => {
        if (error instanceof MessageBusyError) {
          throw error;
        }
        throw error;
      });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.controller.update(delta);
    const snapshot = this.controller.getLatestSnapshot();
    this.renderRevealed(snapshot.revealedText);
    this.pauseIndicator.setVisible(snapshot.pausedForAdvance);
    if (snapshot.pausedForAdvance) {
      this.redrawPauseIndicator();
    }
  }

  public override destroy(): void {
    this.controller.dispose("destroyed");
    this.speakerText.destroy();
    this.pauseIndicator.destroy();
    super.destroy();
  }

  protected override getTextBodyOffsetY(): number {
    return this.getSpeakerReservedHeight();
  }

  protected override getTextLayoutHeight(): number {
    const bounds = this.getContentBounds();
    return Math.max(0, bounds.height - this.getSpeakerReservedHeight());
  }

  protected override onLayoutChanged(): void {
    if (this.sourceText.length > 0) {
      const parsed = parseMessage(this.sourceText);
      this.layoutPageBreaksByPage = this.computeLayoutPageBreaksByPage(parsed.tokens);
      const firstPageTokens = splitTokensByExplicitPage(parsed.tokens)[0] ?? [];
      const layout = this.layoutTextContent(buildFlatTextFromTokens(firstPageTokens));
      this.renderLines(layout.lines.filter((line) => line.pageIndex === 0));
      this.updateSpeakerLine();
    }
  }

  private computeLayoutPageBreaksByPage(tokens: readonly MessageToken[]): number[][] {
    return splitTokensByExplicitPage(tokens).map((pageTokens) => {
      const flatText = buildFlatTextFromTokens(pageTokens);
      if (flatText.length === 0) {
        return [];
      }
      const layout = this.layoutTextContent(flatText);
      return computeLayoutPageBreaks(layout.lines);
    });
  }

  private getSpeakerReservedHeight(): number {
    if (this.currentSpeaker === null || this.currentSpeaker.length === 0) {
      return 0;
    }
    const style = this.theme.text;
    return Math.trunc(style.fontSize * style.scale + 4 + style.lineSpacing);
  }

  private renderRevealed(revealedText: string): void {
    const layout = this.layoutTextContent(revealedText);
    this.renderLines(layout.lines);
  }

  private updateSpeakerLine(): void {
    const style = this.theme.text;
    if (this.currentSpeaker === null || this.currentSpeaker.length === 0) {
      this.speakerText.setVisible(false);
      return;
    }
    this.speakerText.setText(this.currentSpeaker);
    this.speakerText.setFontSize(style.fontSize);
    this.speakerText.setScale(style.scale);
    this.speakerText.setTint(style.tint);
    this.speakerText.setVisible(true);
    this.speakerText.setPosition(0, 0);
  }

  private redrawPauseIndicator(): void {
    const bounds = this.getContentBounds();
    this.pauseIndicator.clear();
    this.pauseIndicator.fillStyle(0xffffff, 1);
    this.pauseIndicator.fillTriangle(
      bounds.width - 24,
      bounds.height - 16,
      bounds.width - 8,
      bounds.height - 16,
      bounds.width - 16,
      bounds.height - 6,
    );
  }
}

export { MessageBusyError, WindowDestroyedError };
