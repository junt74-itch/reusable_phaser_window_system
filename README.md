# Reusable Phaser 4 Window System

Phaser 4 向けの再利用可能なゲームウィンドウライブラリです。メッセージ表示 (`MessageWindow.say`) と選択肢 (`ChoiceWindow.choose`) を提供します。

## セットアップ

```bash
bun install
bun run font:sync -- --source /path/to/reusable_pixel_font_builder --font jf-dot-mplus12
bun run check
bun run dev
```

ブラウザ sandbox は `http://localhost:5173/?scene=integration` で起動します。利用可能な scene: `integration`, `message`, `choice`, `window-base`, `lifecycle`, `clipping`, `bitmap-font`.

## 基本用法

```ts
this.load.bitmapFont("jf-dot-mplus12", "/examples/assets/fonts/jf-dot-mplus12/font.png", "/examples/assets/fonts/jf-dot-mplus12/font.xml");

await messageWindow.say("NPC", "こんにちは。次のページです。\n改行もできます。");
const result = await choiceWindow.choose(["Attack", "Defend", "Run"]);
```

## 設計方針

- ウィンドウ内テキストは `BitmapText` のみ（Phaser `Text` / システムフォント禁止）
- フォントは `reusable_pixel_font_builder` の `font.png` + `font.xml` を Phaser 標準ローダーで読み込む
- 入力は `WindowInputAdapter` 経由のセマンティック API
- `WindowBase` が geometry / clipping / transition を所有

詳細は [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) を参照してください。
