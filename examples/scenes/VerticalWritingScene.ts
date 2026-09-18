import Phaser from "phaser";
import { preloadDefaultBitmapFont } from "../preloadDefaultBitmapFont.ts";
import { DEFAULT_BITMAP_FONT_ASSET } from "../../src/text/BitmapFontAsset.ts";
import { HelpWindow } from "../../src/help/HelpWindow.ts";
import { ChoiceWindow } from "../../src/choice/ChoiceWindow.ts";
import { PhaserWindowInput } from "../../src/input/PhaserWindowInput.ts";

/** Visual regression sandbox for Japanese vertical-rl text and selectable columns. */
export class VerticalWritingScene extends Phaser.Scene {
  private helpWindow: HelpWindow | null = null;
  private choiceWindow: ChoiceWindow | null = null;
  private windowInput: PhaserWindowInput | null = null;

  public constructor() {
    super("vertical-writing");
  }

  public preload(): void {
    preloadDefaultBitmapFont(this);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101820);
    this.cameras.main.roundPixels = true;
    this.windowInput = new PhaserWindowInput(this);

    const theme = { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } };
    this.helpWindow = new HelpWindow(
      this,
      { x: 40, y: 40, width: 360, height: 420, theme },
      { vertical: true },
    );
    this.helpWindow.setHelp("春の夜。「ゲーム」を作る。\n小さなゃゅょ、長音ー、句読点、。を確認。");
    void this.helpWindow.open(0);

    this.choiceWindow = new ChoiceWindow(
      this,
      { x: 440, y: 40, width: 440, height: 420, theme },
      {
        input: this.windowInput,
        ownsInput: true,
        vertical: true,
        showScrollbar: true,
        rowHeight: 32,
        columnGap: 8,
      },
    );
    void this.choiceWindow.choose([
      "開始する",
      "続きを読む",
      "設定を見る",
      "記録を開く",
      "資料を読む",
      "項目その六",
      "項目その七",
      "項目その八",
      "項目その九",
      "終了する",
    ], { autoOpen: true, closeOnComplete: false });
  }

  public override update(time: number, delta: number): void {
    this.windowInput?.update(delta);
    this.helpWindow?.update(time, delta);
    this.choiceWindow?.update(time, delta);
  }
}
