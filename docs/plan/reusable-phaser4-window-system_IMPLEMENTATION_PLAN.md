# reusable-phaser4-window-system 実装計画

## 0. 技術スタック

- Language: TypeScript
- Runtime / Package Manager: Bun
- Bundler / Dev Server: Vite
- Game Framework: Phaser 4
- Target: Modern Web Browser
- Module System: ES Modules
- Test Runner: Bun test

基本コマンド:

```bash
bun install
bun run dev
bun test
bun run typecheck
bun run build
```

## 1. 目的

本リポジトリは、Phaser 4 + TypeScript製ゲームへ横断的に導入できる、再利用可能な汎用ウインドウシステムを提供する。

想定リポジトリ名:

```text
reusable-phaser4-window-system
```

メッセージウインドウ専用ではなく、各種ゲームUIの共通基盤を担う。

将来像:

```text
WindowBase
├─ TextWindowBase
│  ├─ MessageWindow
│  └─ HelpWindow
├─ ScrollableWindow
│  ├─ LogWindow
│  └─ DocumentWindow
└─ SelectableWindow
   ├─ ChoiceWindow
   ├─ CommandWindow
   ├─ ListWindow
   └─ ItemWindow
```

RPG Maker MZの Window / Window_Base / Window_Scrollable / Window_Selectable / Window_Command / Window_Message の責務分割を参考にする。ただしコードは直接移植せず、Phaser 4 + TypeScript向けに独立実装する。

## 2. 設計原則

- 各派生ウインドウで座標・サイズ・padding・background・border・content area・visibility・alpha・depth・open/close・active state・clipping・lifecycleを重複実装しない。
- これらは `WindowBase` に集約する。
- 継承は浅く保ち、最大でも概ね3層程度を目安とする。
- Selection / Scroll / Message進行などはControllerへ分離し、Compositionを併用する。
- Phaser依存はRenderer / Input / Window系へ閉じ込め、ParserやControllerの主要ロジックは可能な限りpure TypeScriptとする。

## 3. WindowBase

全ウインドウの基底クラス。

責務:

- Phaser Scene保持
- position / size
- padding
- content bounds
- visible / alpha / depth
- active / enabled
- open / close state
- background / border
- content clipping
- resize
- show / hide
- activate / deactivate
- destroy
- Scene shutdown cleanup

想定API:

```ts
abstract class WindowBase {
  constructor(scene: Phaser.Scene, config: WindowConfig);

  setPosition(x: number, y: number): this;
  setSize(width: number, height: number): this;

  show(): this;
  hide(): this;

  open(): Promise<void>;
  close(): Promise<void>;

  activate(): this;
  deactivate(): this;

  setDepth(depth: number): this;
  setAlpha(alpha: number): this;

  isOpen(): boolean;
  isVisible(): boolean;
  isActive(): boolean;

  getContentBounds(): Phaser.Geom.Rectangle;

  destroy(): void;
}
```

WindowBaseに入れないもの:

- テキスト送り
- スクロール速度
- 選択カーソル
- selected index
- item list
- confirm / cancel
- message parser
- dialogue branching

## 4. 共通設定とテーマ

`WindowConfig` と `WindowTheme` を分離する。

```ts
interface WindowConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  padding?: number;
  depth?: number;
  alpha?: number;
  theme?: WindowTheme;
}
```

Themeは背景・枠・padding・テキスト・カーソルなどの外観を担当する。Phase 2以降で9-slice、RPG風スキン、focus style等に対応する。

## 5. WindowRenderer

WindowBaseから描画責務を分離する。

責務:

- background
- border
- clipping mask
- optional skin
- resize反映
- open / close visual state

GraphicsベースからNineSlice等へ変更しても、派生クラスへ影響を広げない。

## 6. TextWindowBase

テキスト系ウインドウの共通基盤。

対象:

- MessageWindow
- HelpWindow
- DescriptionWindow

責務:

- font
- text area
- line height
- text measurement
- wrapping
- Phaser Text / BitmapText abstraction

メッセージ進行ロジックは含めない。

## 7. ScrollableWindow

長いコンテンツをスクロール可能にする中間クラス。

想定用途:

- ログ
- 長文説明
- ドキュメント
- ステータス一覧
- クレジット

責務:

- scrollX / scrollY
- scroll bounds
- wheel
- drag
- keyboard / gamepad scroll
- scrollTo / scrollBy
- content size
- clipping

想定API:

```ts
scrollTo(x: number, y: number): void;
scrollBy(dx: number, dy: number): void;
setContentSize(width: number, height: number): void;
getScrollX(): number;
getScrollY(): number;
canScrollUp(): boolean;
canScrollDown(): boolean;
```

将来拡張:

- inertia
- scrollbar
- page scroll
- auto scroll
- snap

## 8. SelectableWindow

選択可能項目を扱う中間クラス。

想定用途:

- ChoiceWindow
- CommandWindow
- ListWindow
- ItemWindow
- SettingsWindow

責務:

- selected index
- item count
- cursor movement
- wrap
- disabled判定
- confirm / cancel
- hover selection
- keyboard / pointer / touch / gamepad
- selection changed event

想定API:

```ts
select(index: number): void;
getSelectedIndex(): number;
moveNext(): void;
movePrevious(): void;
confirm(): void;
cancel(): void;
setItems(items: readonly SelectableItem[]): void;
```

イベント:

```ts
window.on("change", handler);
window.on("confirm", handler);
window.on("cancel", handler);
```

ゲーム固有Command処理やdialogue branchingは含めない。

## 9. Scrollable + Selectable

アイテム一覧、長い選択肢、セーブ一覧などに必要。

継承を増やしすぎず、推奨は:

```text
SelectableWindow
 + SelectionController
 + ScrollController
```

Compositionを優先する。

## 10. MessageWindow

`WindowBase` / `TextWindowBase` の最初の具体実装として作る。

MVP機能:

- 話者名
- typewriter
- auto wrap
- explicit newline
- paging
- skip
- wait
- pause
- async / await
- keyboard / pointer / touch / gamepad

例:

```ts
await message.say("NPC", "こんにちは。");
```

MessageParser / TextState / MessageControllerはMessageWindow固有モジュールとする。

## 11. ChoiceWindow

`SelectableWindow` の最初の具体実装としてPhase 1後半で作る。

```ts
const result = await choiceWindow.choose([
  "はい",
  "いいえ",
  "考え直す",
]);
```

ChoiceWindowはdialogue engineへ依存しない。

## 12. 将来の具体ウインドウ

- CommandWindow
- HelpWindow
- ListWindow
- ItemWindow
- LogWindow
- DocumentWindow
- SettingsWindow
- ModalWindow

各具体クラス同士を直接密結合しない。イベント、callback、adapterで連携する。

## 13. Input設計

共通の `WindowInput` を用意する。

```text
WindowInput
├─ Keyboard
├─ Pointer
├─ Touch
└─ Gamepad
```

正規化イベント:

```ts
interface WindowInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  confirm: boolean;
  cancel: boolean;
}
```

外部InputAdapterを注入可能にする。

## 14. Focus / Modal / WindowManager

MVPでは `activate()` / `deactivate()` / `isActive()` を提供する。

Phase 2以降で `WindowFocusManager` または `WindowManager` を検討する。

候補責務:

- active window
- modal stack
- focus stack
- depth
- registry
- show/hide group
- scene cleanup

グローバルSingleton前提にはしない。

## 15. clipping / layout

WindowBaseで必須。

派生クラスは以下を利用する。

```ts
getInnerX()
getInnerY()
getInnerWidth()
getInnerHeight()
getContentBounds()
```

paddingやmask計算を派生クラス側で重複させない。

## 16. Lifecycle

WindowBaseはScene shutdown / destroyを監視し、入力・イベント・GameObject・maskを安全に解放する。

受け入れ条件:

- Scene再生成後に入力が二重発火しない
- destroy後にcallbackが発火しない
- mask / Graphics / Textが残らない

## 17. 推奨ディレクトリ構成

```text
src/
├─ core/
│  ├─ WindowBase.ts
│  ├─ WindowRenderer.ts
│  ├─ WindowTheme.ts
│  ├─ WindowConfig.ts
│  ├─ WindowInput.ts
│  └─ types.ts
├─ scroll/
│  ├─ ScrollController.ts
│  └─ ScrollableWindow.ts
├─ selection/
│  ├─ SelectionController.ts
│  ├─ SelectableWindow.ts
│  ├─ CursorRenderer.ts
│  └─ types.ts
├─ text/
│  ├─ TextWindowBase.ts
│  ├─ TextLayout.ts
│  └─ types.ts
├─ message/
│  ├─ MessageWindow.ts
│  ├─ MessageController.ts
│  ├─ MessageParser.ts
│  ├─ TextState.ts
│  └─ tokens.ts
├─ choice/
│  └─ ChoiceWindow.ts
└─ index.ts
```

## 18. MVP

MVP対象:

1. WindowBase
2. WindowRenderer
3. WindowTheme
4. WindowInput
5. clipping
6. lifecycle
7. TextWindowBase
8. MessageWindow
9. SelectableWindow基礎
10. ChoiceWindow最小版

`ScrollableWindow` は拡張ポイントを確保したうえでPhase 2でもよい。実装コストが低ければMVPへ含める。

## 19. Phase 1受け入れ条件

### WindowBase
- position / size変更
- padding→content bounds反映
- show / hide
- open / close
- activate / deactivate
- depth / alpha
- clipping
- destroy
- Scene shutdown cleanup

### MessageWindow
- `await message.say()` 動作
- 日本語表示
- typewriter
- auto wrap
- page
- skip
- Promise completion

### SelectableWindow
- index保持
- up/down
- confirm/cancel
- disabled判定
- keyboard/pointer/gamepad最低限対応

### ChoiceWindow

```ts
const result = await choiceWindow.choose(["A", "B", "C"]);
```

が動作する。

## 20. Phase 2

実行可能なタスク分割は [docs/plan/PHASE2_IMPLEMENTATION_PLAN.md](PHASE2_IMPLEMENTATION_PLAN.md) を正とする。

- ScrollableWindow
- ScrollController
- scrollbar
- long list
- HelpWindow
- CommandWindow
- 9-slice skin
- opening animation
- cursor theme
- focus manager
- modal
- BitmapText強化
- portrait
- MessageWindow制御文字拡張

## 21. Phase 3

- Scrollable + Selectable統合
- ItemListWindow
- SettingsWindow
- LogWindow
- DocumentWindow
- dynamic resize
- responsive layout
- accessibility hooks
- custom input adapter examples

## 22. 非目標

初期MVPでは以下を目標にしない。

- RPG Maker MZ完全互換
- RPG Maker Window.png完全互換
- UIエディタ
- HTML/CSS UI
- DOM依存
- React依存
- RexUI依存
- セーブシステム
- inventory system
- dialogue graph
- scene management
- localization system
- advanced CJK typography

## 23. テスト方針

Pure TypeScript unit test:

- SelectionController
- ScrollController
- MessageParser
- TextState
- layout calculation
- state transitions

Runtime examples:

```text
examples/
├─ window-base/
├─ message/
├─ selectable/
├─ choice/
└─ scrollable/
```

## 24. Codex 5.6 Sol Medium にWBSを作らせる際の指示

- 1タスクはCompose 2.5が独立して実装・検証できる粒度にする
- 1タスク1責務
- 最初にWindowBaseを完成させる
- MessageWindowをWindowBaseの最初の実証実装とする
- SelectableWindowを2番目の実証実装とする
- ChoiceWindowでSelectableWindowのPublic APIを検証する
- ScrollableWindowを追加してもWindowBase変更が最小で済む設計にする
- 継承階層を深くしすぎない
- Selection / Scroll / Message進行はControllerへ分離する
- Phaser依存をRenderer/Input/Windowクラスへ閉じ込める
- pure TypeScript部分はunit testを書く
- 各タスクにFiles / Dependencies / Acceptance Criteria / Verificationを書く
- `bun test`, `bun run typecheck`, `bun run build` を検証に含める
- npm/yarn/pnpm固有手順を追加しない
- Phase 1完了時点でExample Scene上で実際に操作可能にする

推奨WBS形式:

```markdown
## TASK-020 WindowBase layout implementation

### Goal
WindowBaseでposition / size / padding / content boundsを一元管理する。

### Dependencies
- TASK-010

### Files
- src/core/WindowBase.ts
- src/core/WindowConfig.ts
- src/core/types.ts

### Acceptance Criteria
- [ ] position変更が全子要素に反映される
- [ ] resize後にcontent boundsが更新される
- [ ] paddingを派生クラス側で再計算する必要がない

### Verification
```bash
bun test
bun run typecheck
bun run build
```
```

## 25. Compose 2.5 に実装させる際の原則

WBSを原則1タスクずつ渡す。

1. Goal確認
2. 関係コード確認
3. 責務境界確認
4. 最小変更で実装
5. test
6. typecheck
7. build
8. Acceptance Criteria自己確認
9. 完了内容を短く報告

禁止:

- 将来機能の大量先行実装
- WindowBaseへ派生固有ロジックを追加
- SelectableWindowへゲーム固有Command処理を追加
- ScrollableWindowへItemList固有処理を追加
- MessageWindowへChoiceロジックを追加
- Scene全体をWindowクラスから操作
- global singleton前提

## 26. Public API方向性

```ts
window.show();
window.hide();
await window.open();
await window.close();
window.activate();
window.deactivate();

await message.say("NPC", "Hello");

const result = await choice.choose([
  "Attack",
  "Defend",
  "Run",
]);

scrollable.scrollBy(0, 48);
scrollable.scrollTo(0, 0);
```

ライブラリ利用者が内部Controllerを知らなくても使えることを重視する。

## 27. 最終方針

中心は `MessageWindow` ではなく `WindowBase` とする。

```text
WindowBase
   ├─ rendering
   ├─ layout
   ├─ clipping
   ├─ lifecycle
   ├─ visibility
   └─ active state
        │
        ├───────────────┐
        ▼               ▼
SelectableWindow   ScrollableWindow
        │               │
        ▼               ▼
 ChoiceWindow       LogWindow
 CommandWindow      DocumentWindow

WindowBase
   ↓
TextWindowBase
   ↓
MessageWindow
```

RPG Maker MZで実証されている「ウインドウ基盤 → スクロール → 選択 → コマンド／メッセージ」という責務分割の思想を参考にしつつ、Phaser 4 + TypeScript向けに小さく、疎結合で、再利用可能な設計へ再構成する。

最初から全ウインドウを実装せず、

1. WindowBase
2. MessageWindow
3. SelectableWindow
4. ChoiceWindow

で基盤設計を検証し、その後 ScrollableWindow や各種ゲームUIへ発展させる。
