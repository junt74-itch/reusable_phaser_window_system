# Reusable Phaser 4 Window System

Phaser 4 向けの再利用可能なゲームウィンドウライブラリです。メッセージ (`MessageWindow.say`)、選択肢 (`ChoiceWindow.choose`)、コマンド / ヘルプ / ログ / ドキュメント、スクロール、NineSlice chrome、Scene 所有の focus/modal を提供します。

## 最短導線

- Git submodule 導入: [`docs/SUBMODULE.md`](docs/SUBMODULE.md)
- 現行の規範仕様: [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md)
- 公開 API: [`docs/API.md`](docs/API.md)
- 文書索引: [`docs/README.md`](docs/README.md)
- ソース構成: [`src/README.md`](src/README.md)

submodule から TypeScript source を直接使う場合の安定入口は、リポジトリ直下の [`index.ts`](index.ts) です。`src/**` への deep import は互換性保証の対象外です。

## インストールと sandbox

```bash
bun install
bun run font:sync -- --source /path/to/reusable_pixel_font_builder --font jf-dot-mplus12
bun run check
bun run dev
```

`font:sync` は upstream の `dist/jf-dot-mplus12` から `font.png` / `font.xml` / `license.txt` / `report.json` 等を examples へコピーし、`provenance.json` に commit と SHA-256 を記録します。TTF ソースや GitHub からの runtime 取得は行いません。

ブラウザ sandbox: `http://localhost:5173/?scene=integration`

Git submodule として導入する場合は、検証済み commit を親リポジトリで pin し、ゲーム側から `<submodule>/index.ts` を import します。詳細と built artifact を使う代替手順は [`docs/SUBMODULE.md`](docs/SUBMODULE.md) を参照してください。

| Scene | URL |
|---|---|
| Integration (message → choice) | `?scene=integration` |
| Integration restart during say | `?scene=integration&exercise=restart-say` |
| Integration restart during choose | `?scene=integration&exercise=restart-choose` |
| Message | `?scene=message` |
| Choice | `?scene=choice` |
| WindowBase | `?scene=window-base` |
| Lifecycle (base / restart) | `?scene=lifecycle` / `?scene=lifecycle&mode=restart-say` |
| Clipping spike | `?scene=clipping` |
| Bitmap font spike | `?scene=bitmap-font` |
| Scroll | `?scene=scroll` |
| Long list | `?scene=long-list` |
| NineSlice chrome | `?scene=nineslice` |
| Command + help | `?scene=command-help` |
| Log + document | `?scene=log-document` |
| Focus + modal | `?scene=focus-modal` |
| Message portrait | `?scene=message-portrait` |
| Font fallback | `?scene=font-fallback` |
| Padding + chromeless preview | `?scene=padding-chrome` |
| Rich text | `?scene=rich-text` |

## Scene セットアップ

フォントは Scene `preload()` で **Phaser 標準ローダー** を使い、ウィンドウ生成前に cache へ登録します。

```ts
import Phaser from "phaser";
import {
  MessageWindow,
  ChoiceWindow,
  PhaserWindowInput,
  DEFAULT_BITMAP_FONT_ASSET,
} from "reusable-phaser4-window-system";

class GameScene extends Phaser.Scene {
  private messageWindow!: MessageWindow;
  private choiceWindow!: ChoiceWindow;
  private sharedInput!: PhaserWindowInput;

  preload(): void {
    this.load.bitmapFont(
      DEFAULT_BITMAP_FONT_ASSET.key,
      DEFAULT_BITMAP_FONT_ASSET.textureURL,
      DEFAULT_BITMAP_FONT_ASSET.fontDataURL,
    );
  }

  create(): void {
    this.cameras.main.roundPixels = true;
    this.sharedInput = new PhaserWindowInput(this);
    this.messageWindow = new MessageWindow(
      this,
      { x: 40, y: 40, width: 520, height: 160, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.sharedInput, ownsInput: true },
    );
    this.choiceWindow = new ChoiceWindow(
      this,
      { x: 120, y: 220, width: 280, height: 140, theme: { text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key } } },
      { input: this.sharedInput, ownsInput: false },
    );
  }

  update(time: number, delta: number): void {
    this.sharedInput.update(delta);
    this.messageWindow.update(time, delta);
    this.choiceWindow.update(time, delta);
  }
}
```

## 入力の所有権

- `PhaserWindowInput` は Scene にバインドされます。複数ウィンドウで **1 つのアダプタを共有** し、`activate()` / `deactivate()` で排他的に入力を渡します。
- `ownsInput: true` のウィンドウだけが `destroy()` 時にアダプタを `dispose()` します。共有時は 1 ウィンドウのみ `true` にしてください。
- 各ウィンドウは `canConsumeInput()`（open + visible + active + enabled）を満たすときだけ confirm/cancel を消費します。

## 基本 API

```ts
await messageWindow.say("NPC", "こんにちは。次のページです。\n改行もできます。");

const result = await choiceWindow.choose(["Attack", "Defend", "Run"]);
if (result.status === "selected") {
  console.log(result.item.label);
}
```

リッチテキスト（span ごとの font / fontSize と行揃え）:

```ts
helpWindow.setHelp({
  align: "center",
  spans: [
    { text: "Hi " },
    { text: "there", fontSize: 24 },
  ],
});
```

詳細は [`docs/API.md`](docs/API.md) の Rich text を参照してください。

## Phase 2 の追加

```ts
const result = await commandWindow.chooseCommands([
  { id: "attack", label: "Attack", enabled: true, help: "Strike the foe." },
]);
helpWindow.setHelp(result.status === "selected" ? result.command.help ?? null : null);

focus.acquire(commandWindow, { modal: true });
scrollable.setScrollOffset(120);
```

chrome 差し替えは `createRenderer` + `createNineSliceWindowRenderer`（テクスチャ未ロードは `MissingWindowSkinError`）。focus は Scene 所有の `WindowFocusController` です。

## テーマ

`WindowConfig.theme` に部分指定でき、`resolveWindowTheme()` が immutable な既定値へマージします。背景色/枠/パディング/ビットマップテキストスタイル/カーソル/トランジション時間を変更できます。

## ライフサイクル

- `open()` / `close()` — 非同期トランジション。途中反転可。構築直後は閉じた状態。最初から開いて見せるには `open(0)`。詳細は [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) の Open/close lifecycle。
- `show()` / `hide()` — 表示のみ。非表示中は入力を消費しません。
- `activate()` / `deactivate()` — 入力の対象ウィンドウ切替。
- `destroy()` — Game Object、clipper、renderer、入力購読を解放。進行中 Promise は 1 回だけ settle します。
- Scene `shutdown` / `destroy` — `WindowBase` が自動で `destroy()` を呼びます。

## エラーとキャンセル

| エラー | 意味 |
|---|---|
| `MessageBusyError` / `ChoiceBusyError` | 同時に 2 つ目の `say` / `choose` を開始 |
| `WindowOperationCancelledError` | 操作キャンセル（destroy 等） |
| `WindowDestroyedError` | 破棄済みウィンドウへの操作 |
| `MissingBitmapGlyphError` | フォントに存在しないコードポイント（**システムフォントへフォールバックしない**） |
| `BitmapFontNotLoadedError` | `preload()` 漏れ |
| `FontSwapBusyError` | 進行中の `say` / `choose` 中に `setFontKey` |

## ビットマップフォント要件

- 必須 artifact ペア: **`font.png` + AngelCode `font.xml`**
- 標準ローダー: `scene.load.bitmapFont(key, textureURL, fontDataURL)` — 本ライブラリは XML/JSON パーサを export しません
- upstream: [`reusable_pixel_font_builder`](https://github.com/junt74-itch/reusable_pixel_font_builder) を pin し `license.txt` を配布物と一緒に保持
- 欠損グリフ: layout 前に検出し typed error を throw（ブラウザ/ OS フォントへ silently fallback しない）
- 明示フォールバック: `theme.text.fontKeys` は builder の cache key のみ。`setFontKey` はアイドル時のみ
- 意味イベント: `bindWindowA11y`（DOM なし）。配置: `layoutWindowInViewport`（WindowBase はカメラを購読しない）
- ピクセル忠実度: ネイティブ整数 `fontSize`、整数 `scale`、整数座標、`roundPixels`、nearest-neighbor サンプリング（MVP は小数 scale 非対応）

## ブラウザサポート

- **WebGL** を primary とし、content clipping は WebGL filter mask（[ADR 0001](docs/adr/0001-content-clipping.md)）
- **Canvas** では GeometryMask fallback。未サポート renderer では `ContentClipperUnsupportedError`
- ゲームパッド: 接続された **最初の 1 台のみ** ポーリング（MVP 制限）

## MVP 制限

日本語禁則処理なし、グローバル `WindowManager` singleton なし（Scene 所有の `WindowFocusController` はある）、ゲームパッドは first pad only、a11y は意味イベントのみ（DOM overlay なし）。リストは content を超えるとスクロールします。詳細は [`docs/MVP_RELEASE_CHECKLIST.md`](docs/MVP_RELEASE_CHECKLIST.md) と [`docs/PHASE2_RELEASE_CHECKLIST.md`](docs/PHASE2_RELEASE_CHECKLIST.md)。

## 詳細 API

現行契約は [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md)、symbol と利用例は [`docs/API.md`](docs/API.md) を参照してください。文書全体の入口は [`docs/README.md`](docs/README.md) です。開発時の実装計画は援用者向け仕様ではなく、保守者用の [`docs/plan/`](docs/plan/README.md) に分離しています。
