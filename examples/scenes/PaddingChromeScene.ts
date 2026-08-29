import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { HelpWindow } from "../../src/help/HelpWindow.ts";
import { createNineSliceWindowRenderer } from "../../src/skin/NineSliceWindowRenderer.ts";
import type { WindowRendererFactoryContext } from "../../src/core/WindowRenderer.ts";
import {
  PLACEHOLDER_WINDOW_SKIN_KEY,
  PLACEHOLDER_WINDOW_SKIN_URL,
} from "./NineSliceScene.ts";

const SAMPLE_TEXT =
  "文字はウインドウ内側の padding に沿って折り返します。[ で狭く ] で広く、0 でゼロ。H は左上 Graphics の塗りと枠だけ消します。下の一行は最初から下地ナシです。";

const MIN_PADDING = 0;
const MAX_PADDING = 40;
const PADDING_STEP = 4;
const DEFAULT_PADDING = 12;

/**
 * Preview for content padding and chromeless underlay.
 * Uses current public APIs only (`setPadding`, `backgroundAlpha` / `borderWidth`).
 * Planned `chromeVisible` / `createNullWindowRenderer` are not required to boot this scene.
 */
export class PaddingChromeScene extends Phaser.Scene {
  private graphicsWindow: HelpWindow | null = null;
  private nineSliceWindow: HelpWindow | null = null;
  private chromelessWindow: HelpWindow | null = null;
  private logText: Phaser.GameObjects.BitmapText | null = null;
  private paddingPx = DEFAULT_PADDING;
  private graphicsChromeVisible = true;

  public constructor() {
    super("padding-chrome");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
    this.load.image(PLACEHOLDER_WINDOW_SKIN_KEY, PLACEHOLDER_WINDOW_SKIN_URL);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x203040);
    this.cameras.main.roundPixels = true;
    const fontTheme = { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key }, padding: DEFAULT_PADDING };
    const createSkinRenderer = (context: WindowRendererFactoryContext) =>
      createNineSliceWindowRenderer(context, {
        textureKey: PLACEHOLDER_WINDOW_SKIN_KEY,
        leftWidth: 8,
        rightWidth: 8,
        topHeight: 8,
        bottomHeight: 8,
      });

    this.graphicsWindow = new HelpWindow(this, {
      x: 24,
      y: 24,
      width: 450,
      height: 180,
      theme: fontTheme,
    });
    this.nineSliceWindow = new HelpWindow(
      this,
      {
        x: 490,
        y: 24,
        width: 446,
        height: 180,
        theme: fontTheme,
      },
      { createRenderer: createSkinRenderer },
    );
    this.chromelessWindow = new HelpWindow(this, {
      x: 24,
      y: 220,
      width: 912,
      height: 148,
      theme: {
        ...fontTheme,
        backgroundAlpha: 0,
        borderWidth: 0,
      },
    });

    this.logText = this.add.bitmapText(24, 388, DEFAULT_BITMAP_FONT_ASSET.key, "", 12);
    for (const windowRef of this.windows()) {
      void windowRef.open();
      windowRef.show();
      windowRef.setHelp(SAMPLE_TEXT);
    }
    this.bindKeys();
    this.refreshLog();
  }

  public override update(time: number, delta: number): void {
    this.graphicsWindow?.update(time, delta);
    this.nineSliceWindow?.update(time, delta);
    this.chromelessWindow?.update(time, delta);
  }

  private windows(): HelpWindow[] {
    return [this.graphicsWindow, this.nineSliceWindow, this.chromelessWindow].filter(
      (windowRef): windowRef is HelpWindow => windowRef !== null,
    );
  }

  private bindKeys(): void {
    this.input.keyboard?.on("keydown-OPEN_BRACKET", () => {
      this.applyPadding(this.paddingPx - PADDING_STEP);
    });
    this.input.keyboard?.on("keydown-CLOSED_BRACKET", () => {
      this.applyPadding(this.paddingPx + PADDING_STEP);
    });
    this.input.keyboard?.on("keydown-ZERO", () => {
      this.applyPadding(0);
    });
    this.input.keyboard?.on("keydown-H", () => {
      this.graphicsChromeVisible = !this.graphicsChromeVisible;
      this.graphicsWindow?.setTheme(
        this.graphicsChromeVisible
          ? { backgroundAlpha: 0.92, borderWidth: 2, borderAlpha: 1 }
          : { backgroundAlpha: 0, borderWidth: 0, borderAlpha: 0 },
      );
      this.refreshLog();
    });
  }

  private applyPadding(next: number): void {
    this.paddingPx = Math.max(MIN_PADDING, Math.min(MAX_PADDING, next));
    for (const windowRef of this.windows()) {
      windowRef.setPadding(this.paddingPx);
    }
    this.refreshLog();
  }

  private refreshLog(): void {
    const chrome = this.graphicsChromeVisible ? "on" : "off";
    this.logText?.setText(
      `padding ${this.paddingPx}px  graphicsChrome ${chrome}   keys: [ ] pad  0 zero  H hide Graphics fill/border`,
    );
  }
}
