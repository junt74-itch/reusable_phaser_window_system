# Public API

このドキュメントは `src/index.ts` から export される公開 API のみを対象とします。規範的な lifecycle・ownership・互換性境界は [SPECIFICATION.md](SPECIFICATION.md)、文書索引は [README.md](README.md) を参照してください。

## 公開 entry point

| 利用形態 | Entry point |
|---|---|
| Git submodule の source import | repository root `index.ts` |
| 本リポジトリ内の source/build | `src/index.ts` |
| Build artifact | `dist/index.js` / `dist/index.d.ts` |

submodule の設定例は [SUBMODULE.md](SUBMODULE.md) にあります。`src/index.ts` が export しない module への deep import は公開 API ではありません。

## インストール（ローカル開発）

```bash
bun install
bun run build
```

npm publish / release tag の手順は Phase 1 / Phase 2 ともスコープ外です。

## フォント artifact と provenance

### 必須ファイル

upstream `reusable_pixel_font_builder` の `dist/<font-id>/` から以下を同期します。

- `font.png` — 2048×2048 単一ページ atlas
- `font.xml` — AngelCode BMFont XML（`<font>` root、page file = `font.png`）
- `license.txt` — 再配布時に保持必須
- `report.json`, `missing-characters.txt` — 検証用

### 同期コマンド

```bash
bun run font:sync -- --source /path/to/reusable_pixel_font_builder --font jf-dot-mplus12
```

`scripts/sync-font-assets.ts` は upstream commit、SHA-256、`provenance.json` を書き出します。runtime で GitHub や Python build を要求しません。

### Phaser 標準ローダー

```ts
import { DEFAULT_BITMAP_FONT_ASSET } from "reusable-phaser4-window-system";

scene.load.bitmapFont(
  DEFAULT_BITMAP_FONT_ASSET.key,
  DEFAULT_BITMAP_FONT_ASSET.textureURL,
  DEFAULT_BITMAP_FONT_ASSET.fontDataURL,
);
```

カスタム XML/JSON パーサはライブラリに含まれません。

### 欠損グリフ policy

`layoutText()` / `layoutRichText()` とウィンドウは表示前に code point を preflight し、未収載文字は `MissingBitmapGlyphError` を throw します。未ロード font key は `BitmapFontNotLoadedError` です。ブラウザ/system/web フォントへの fallback はありません。

### ピクセルスケーリング

- ネイティブ整数 `fontSize` × 整数 `scale`
- 整数座標、`camera.roundPixels = true`
- texture nearest-neighbor フィルタ（ADR 0002）
- MVP は小数 scale を reject

## Rich text

入力は `string | RichText` です。マークアップ言語はありません。`{font}` / `{size}` トークンはありません。

ゲーム制作者向けの導入手順と用途別サンプルは[リッチテキスト利用ガイド](RICH_TEXT_GUIDE.md)を参照してください。

```ts
import type { RichText, RichTextSpan, TextAlign, WindowTextContent } from "reusable-phaser4-window-system";
import { layoutRichText } from "reusable-phaser4-window-system";
```

| 型 | 説明 |
|---|---|
| `RichTextSpan` | `{ text, fontKey?, fontSize? }` |
| `RichText` | `{ spans: RichTextSpan[], align? }`。`align` は `left` / `center` / `right` |
| `WindowTextContent` | `string \| RichText` |
| `TextAlign` | `"left" \| "center" \| "right"` |

- 同一本文で font と fontSize を混在できます。同じ span に両方指定できます。
- `align` は content 全体で 1 つ。各行の実測幅と content 幅で配置します。
- 混在サイズは BMFont `base` の共通ベースライン（Phaser が base を捨てる場合はグリフ最頻 bottom）で配置します。
- 既存 `string` API は左寄せ・theme 既定 style のままです。
- `layoutRichText(content, measurer, options)` が style-aware layout の公開関数です。`layoutText(string, ...)` は残ります。
- span の `fontKey` は文字ごとに `[span.fontKey, ...measurer.fontKeys]` で解決します。measurer に含まれない key は `BitmapFontNotLoadedError`、連鎖尽きは `MissingBitmapGlyphError`（`triedKeys`）です。
- `BitmapTextMeasurer` の `base` / `measureRun` / `fontMetrics` / `hasGlyphFor` は optional です。公開 layout は未実装メンバーを補完します。
- `MessageWindow` の `{color}` / `{speed}` 等は span 連結文字列に対して従来どおり適用されます。

| API | 本文引数 |
|---|---|
| `MessageWindow.say(speaker, content, ...)` | `string \| RichText` |
| `HelpWindow.setHelp(content)` | `string \| RichText \| null` |
| `LogWindow.append(content)` | `string \| RichText` |
| `DocumentWindow.setDocument(content)` | `string \| RichText` |
| `ChoiceItem.label` / `CommandItem.label` | `string \| RichText`（wrap なし、1 行 clip） |

```ts
helpWindow.setHelp({
  align: "center",
  spans: [
    { text: "Hi " },
    { text: "there", fontSize: 24 },
  ],
});
```

Help / Log / Document / Message の本文は常時 wrap します。Choice / Command の `label` は wrap しません。

sandbox: `?scene=rich-text`（Help / Log / Message / Choice の RichText デモ）。

## Scene セットアップ

```ts
import Phaser from "phaser";
import {
  MessageWindow,
  ChoiceWindow,
  PhaserWindowInput,
  DEFAULT_BITMAP_FONT_ASSET,
  resolveWindowTheme,
} from "reusable-phaser4-window-system";

class DialogueScene extends Phaser.Scene {
  private messageWindow!: MessageWindow;
  private choiceWindow!: ChoiceWindow;
  private input!: PhaserWindowInput;

  preload(): void {
    this.load.bitmapFont(
      DEFAULT_BITMAP_FONT_ASSET.key,
      DEFAULT_BITMAP_FONT_ASSET.textureURL,
      DEFAULT_BITMAP_FONT_ASSET.fontDataURL,
    );
  }

  create(): void {
    this.cameras.main.roundPixels = true;
    this.input = new PhaserWindowInput(this);
    const theme = resolveWindowTheme({
      text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key, fontSize: 12, scale: 1 },
    });
    this.messageWindow = new MessageWindow(
      this,
      { x: 40, y: 40, width: 520, height: 160, theme },
      { input: this.input, ownsInput: true },
    );
    this.choiceWindow = new ChoiceWindow(
      this,
      { x: 120, y: 220, width: 280, height: 140, theme },
      { input: this.input, ownsInput: false },
    );
  }

  update(time: number, delta: number): void {
    this.input.update(delta);
    this.messageWindow.update(time, delta);
    this.choiceWindow.update(time, delta);
  }
}
```

構築直後は閉じた状態です。最初から開いて見せる手順は [ライフサイクル](#ライフサイクル) を参照してください。

## 入力所有権

| オプション | 説明 |
|---|---|
| `input` | 注入する `WindowInputAdapter`（通常 `PhaserWindowInput`） |
| `ownsInput` | `true` の場合、ウィンドウ `destroy()` が adapter を `dispose()` |

複数ウィンドウで 1 Scene を共有する典型パターン:

1. `PhaserWindowInput` を 1 つ生成
2. message に `{ input, ownsInput: true }`、choice に `{ input, ownsInput: false }`
3. 操作前に `messageWindow.activate()` / `choiceWindow.deactivate()` で排他切替
4. `update()` で `input.update(delta)` を 1 回だけ呼ぶ

`canConsumeInput()` が false のウィンドウは confirm/cancel/方向キーを無視します。

## MessageWindow.say

```ts
const snapshot = await messageWindow.say("NPC", "こんにちは。\f次ページ", {
  charsPerSecond: 30,
  autoOpen: true,
  closeOnComplete: false,
});
```

- `content` は `string | RichText`。`RichText` の `{color}` 等は span 連結文字列に対して従来どおり

- speaker は `null` 可（行高を確保しない）
- `{wait:500}` / `{pause}` / `{color:RRGGBB}` / `{color}` (reset) / `{speed:n}` / `\f` / `\n`（RMMZ `\` 制御コード互換ではない。未知 `{token}` はリテラル）
- `portrait: { textureKey, width, height }` — 未ロードは `MissingMessagePortraitError`。省略時は Phase 1 と同じ
- `autoAdvanceMs` — ページ送りを遅延自動。confirm が勝つ。`{pause}` は既定では手動のまま（`autoAdvancePause: true` で自動）
- `onType` / `onPage` / `onConfirm` / `onCancel` — 音声用コールバック。エンジンは持たない。destroy 後は呼ばない
- 進行中の再 `say` は `MessageBusyError`

## ChoiceWindow.choose

```ts
const result = await choiceWindow.choose(["Attack", "Defend", "Run"], {
  cancelable: true,
  autoOpen: true,
  closeOnComplete: true,
});

if (result.status === "selected") {
  console.log(result.index, result.item.value);
} else {
  // cancelled
}
```

typed item:

```ts
await choiceWindow.choose([
  { id: "atk", label: "Attack", value: { power: 10 }, enabled: true },
]);
```

長いリストは `showScrollbar: true` を付けるとつまみ付きでスクロールします。Phase 1 の行数超過 configuration error は出ません。構築時 `wrap: false` で選択カーソルはリスト端で止まります（省略時は周回）。行 `label`（`string | RichText`）自体は折り返しません。

## Scroll

`ScrollableWindow` が inner body と `ScrollController` を所有します。`WindowBase` に scroll offset API はありません。

```ts
scrollable.setScrollContentSize(480);
scrollable.setScrollOffset(120);
```

- 入力: wheel / PageUp / PageDown / content drag
- `showScrollbar: true` で任意のつまみ。省略時は overflow 矢印のみ
- `ChoiceWindow` / `CommandWindow` は `SelectableWindow` が同じコントローラを所有します

## CommandWindow / HelpWindow

`chooseCommands` はアプリケーション所有のコマンドレコードを返します。ハンドラは呼びません。

```ts
const result = await commandWindow.chooseCommands([
  { id: "attack", label: "Attack", enabled: true, help: "Strike the foe." },
]);
if (result.status === "selected") {
  console.log(result.command.id);
}
```

Help の更新は Scene が `onHighlight` で `helpWindow.setHelp(...)` します（`string | RichText | null`）。`CommandWindow` は `HelpWindow` を import しません。長いリストは `SelectableWindow` のスクロールをそのまま使います。

## LogWindow / DocumentWindow

どちらも `ScrollableWindow` を合成します。`WindowBase` に log/document API はありません。

- `logWindow.append(line)` — 末尾に BitmapText を追加（`string | RichText`）。既に最下部にいるときだけ追従
- `logWindow.clear()`
- `documentWindow.setDocument(text)` — 全文を content 幅で wrap して content height を設定（`string | RichText`）。入力は page/wheel/drag のみ（typewriter なし）。wrap をオフにはできない

欠損グリフは既存の `MissingBitmapGlyphError` です。

## Focus / modal (`WindowFocusController`)

Scene が 1 つ所有します。グローバル singleton ではありません。ウィンドウは controller を import しません。

```ts
const focus = new WindowFocusController();
const unbind = bindFocusControllerToScene(scene, focus);
focus.acquire(menu);
focus.acquire(dialog, { modal: true });
// dialog だけが canConsumeInput() === true（下は deactivate される）
focus.release(dialog);
unbind();
```

Dimmer Graphics は Scene 所有です。`subscribe` の `snapshot.modal` で表示を切り替えます。詳細は [ADR 0005](adr/0005-scene-focus-modal.md)。

## テーマ (`WindowConfig.theme` / `resolveWindowTheme`)

`resolveWindowTheme(partial?)` は deep readonly な完全テーマを返し、呼び出し元オブジェクトを mutate しません。

主なフィールド:

- `backgroundColor`, `backgroundAlpha`, `borderColor`, `borderAlpha`, `borderWidth`
- `padding` — 数値（四辺同一）または `{ top, right, bottom, left }`。省略時は四辺 `12`。`0` 可。負数は `WindowConfigError`、content が非正なら `WindowLayoutError`
- `text` — `fontKey`, `fontKeys`（primary が先頭。省略時は `[fontKey]`）, `fontSize`, `scale`, `tint`, `letterSpacing`, `lineSpacing`
- `cursor` — 選択カーソル色/幅。`blinkPeriodMs` は省略時 `0`（点滅なし）。点滅は `CursorRenderer` が所有し、`WindowBase` には載せない
- `transitionDurationMs`

padding はウインドウ外接矩形から content を inset します。文字・行・portrait・cursor・scrollbar・clip が同じ矩形を共有します。`text.padding` はありません。

```ts
const theme = resolveWindowTheme({
  padding: { top: 8, right: 16, bottom: 8, left: 16 },
  text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key },
});
window.setPadding(0);
window.setPadding({ top: 12, right: 20, bottom: 12, left: 20 });
```

`TextWindowBase.setFontKey(key)` はアイドル時に primary を差し替え、残りの `fontKeys` をフォールバックとして残します。`say` / `choose` / `chooseCommands` 中は `FontSwapBusyError` で拒否し、進行中 Promise は維持します。Help / Message / Log / Document の本文と Choice / Command の行ラベルは同じチェーンを使い、尽きると `MissingBitmapGlyphError.triedKeys` を付けて throw します。システム/web フォントへは落ちません。`WindowBase` にフォントマップはありません。

## 下地（chrome）の無効

Graphics 既定 renderer では、塗りと枠を theme で消します。content は残ります。

```ts
window.setTheme({ backgroundAlpha: 0, borderWidth: 0 });
```

- `backgroundAlpha: 0` — 下地の塗りだけ消す（枠は `borderWidth` が正なら残る）
- `borderWidth: 0` — 枠の stroke を描かない
- `hide()` / ウインドウ全体の `setAlpha(0)` — 文字も含めて消える。下地オフではない

NineSlice（`createNineSliceWindowRenderer`）はテクスチャ必須で、`backgroundAlpha` では画像を消しません。下地画像なしにするには factory を渡さず、上記の Graphics 設定を使います。未ロードは `MissingWindowSkinError` です。

sandbox: `?scene=padding-chrome`（`[` `]` で padding、`H` で左上 Graphics の塗りと枠を切替）。

## 文字の折り返し

本文の折り返しは常に有効です。`layoutText()` / `layoutRichText()` および Message / Help / Log / Document に wrap をオフにするオプションはありません。入力は `string | RichText` です。

- 基準幅は content 幅（padding 適用後）。Message は portrait 予約幅をさらに引く
- ASCII は空白区切りの greedy wrap。収まらない語と日本語などは grapheme 分割。禁則なし
- 明示改行は `\n`（`\r\n` / `\r` も正規化）
- 高さ超過: Message は次ページ、Help は page 0 のみ描画、Log / Document は scroll 高さへ積む
- Choice / Command の `label`（`string | RichText`）は wrap せず、`rowHeight` 固定で 1 行 clip

1 行に収めたいときはウインドウを広くする、padding を減らす、文字列を短くする、のいずれかです。

選択リストの周回は別です。構築時 `wrap: false` で端から反対側へ回りません（省略時 `true`）。

```ts
new ChoiceWindow(scene, config, { wrap: false, input, ownsInput: true });
```

## ウィンドウ chrome の差し替え

`WindowBaseOptions.createRenderer` に factory を渡すと、既定の `GraphicsWindowRenderer` を差し替えられます。`WindowBase` は skin 型を import しません。

```ts
import {
  WindowBase,
  createNineSliceWindowRenderer,
} from "reusable-phaser4-window-system";

new WindowBase(scene, config, {
  createRenderer: (context) =>
    createNineSliceWindowRenderer(context, {
      textureKey: "window-placeholder",
      leftWidth: 8,
      rightWidth: 8,
      topHeight: 8,
      bottomHeight: 8,
    }),
});
```

テクスチャ未ロードは `MissingWindowSkinError` です。Graphics への silent fallback はありません。検証済み Phaser 4.2.1 API は [ADR 0003](adr/0003-window-renderer-injection.md) を参照してください。

## ライフサイクル

構築直後は常に閉じた状態（`phase: "closed"`、`openness: 0`）です。`WindowConfig` に最初から開くオプションはありません。Scene `create()` で開いておくには、生成直後に `open()` を呼んでください。

```ts
void win.open();     // 既定 duration（theme.transitionDurationMs、既定 200ms）で開く
void win.open(0);    // アニメーションなしで直ちに開く
win.activate();      // 入力を受けたい場合。open は activate を兼ねない
```

`open(0)` は Promise を同期的に resolve し、`phase` はすぐ `"open"` になります。`say` / `choose` / `chooseCommands` の `autoOpen`（省略時 `true`）は操作開始時の `open()` であり、構築時の初期オープンではありません。Help / Log / Document および素の `WindowBase` は自動では開きません。

| メソッド | 動作 |
|---|---|
| `open()` / `close()` | openness トランジション（Promise）。`open(0)` / `close(0)` は同期 settle |
| `show()` / `hide()` | 表示切替。hide 中は入力無効 |
| `activate()` / `deactivate()` | 入力対象切替 |
| `enable()` / `disable()` | 操作不能化 |
| `setSize()` / `setPosition()` | レイアウト再計算。カメラ購読はせず、Scene が `layoutWindowInViewport` の整数 bounds を渡す |
| `setPadding()` | content inset を変更して relayout。数値または四辺オブジェクト |
| `destroy()` | 全リソース解放。pending Promise は cancel/destroyed で 1 回 settle |
| `isDestroyed()` | destroy 後は true |
| `subscribeTransition` | open/close の phase 変化。a11y 専用ではない |

Scene restart/shutdown 時は `WindowBase` が shutdown handler で `destroy()` します。

## 意味イベント（a11y）

DOM や Phaser EventEmitter は使いません。アプリのキャプション層へ渡す typed イベントだけです。

```ts
const unbind = bindWindowA11y({
  windowId: "message",
  lifecycle: messageWindow,
  message: messageWindow,
  selection: choiceWindow,
  focus: {
    subscribe: (listener) => focus.subscribe(listener),
    idOf: (window) => (window === messageWindow ? "message" : "choice"),
  },
  listener: (event) => {
    // event.type: windowOpened | windowClosed | selectionChanged | messagePage | messageComplete | focusAcquired | focusReleased
  },
});
```

`focusReleased.modal` / `stackDepth` は外れたエントリと外す前の深さです。`focusAcquired` は新しい top です。`destroy` / `unsubscribe` 後は呼ばれません。`WindowBase` に a11y 型はありません。

## ビューポート配置

`layoutWindowInViewport({ viewportWidth, viewportHeight, width, height, margin, anchor })` は整数 `{ x, y, width, height }` を返します。Scene が `setPosition` / `setSize` に渡します。内側が 1px 未満、または optional `padding` で content が非正なら `WindowLayoutError` です。

## エラー型

| クラス | 用途 |
|---|---|
| `MessageBusyError` | 並行 `say` |
| `ChoiceBusyError` | 並行 `choose` |
| `ChoiceConfigurationError` | 空/全 disabled リスト |
| `CommandBusyError` | 並行 `chooseCommands` |
| `CommandConfigurationError` | 空/全 disabled コマンドリスト |
| `WindowOperationCancelledError` | キャンセル理由付き settle |
| `WindowDestroyedError` | 破棄後操作 |
| `MissingBitmapGlyphError` | 未収載 code point（`triedKeys` に試した builder key） |
| `BitmapFontNotLoadedError` | cache 未登録 font key |
| `FontSwapBusyError` | `say` / `choose` 中の `setFontKey` |
| `WindowConfigError` / `WindowLayoutError` | 不正 config |
| `MissingMessagePortraitError` | ポートレートテクスチャが未ロード |
| `MissingWindowSkinError` | NineSlice テクスチャが未ロード |
| `WindowFocusError` | 破棄済みウィンドウの acquire、dispose 後の acquire |

## ブラウザサポート

| 項目 | MVP 状態 |
|---|---|
| Renderer | WebGL primary（sandbox 既定） |
| Clipping | WebGL mask + Canvas GeometryMask fallback — [ADR 0001](adr/0001-content-clipping.md) |
| ゲームパッド | 最初の 1 台のみ。未接続は no-op |
| Canvas text | **禁止** — ウィンドウ内は BitmapText のみ |

## 既知の制限

[`PHASE2_RELEASE_CHECKLIST.md`](PHASE2_RELEASE_CHECKLIST.md) を参照:

- 日本語禁則（kinsoku）なし
- 本文折り返しを無効化する公開オプションなし（常時 wrap）
- NineSlice chrome を theme だけで非表示にする API なし（Graphics は `backgroundAlpha` / `borderWidth`）
- グローバル `WindowManager` singleton なし（Scene 所有の `WindowFocusController` はある）
- ゲームパッドは first pad only
- a11y は意味イベントのみ。DOM / screen-reader overlay なし
- フォント fallback は builder artifact の cache key のみ。sandbox の第二キーは同一 artifact の alias
- `ItemListWindow` / inventory などは Phase 3
