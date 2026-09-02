# Git submodule integration

このリポジトリをゲーム本体へ source dependency として固定する手順です。公開 source entry point はリポジトリ直下の `index.ts` です。

## Add and pin

```bash
git submodule add <repository-url> vendor/reusable_phaser_window_system
git submodule update --init --recursive
git add .gitmodules vendor/reusable_phaser_window_system
```

親リポジトリは submodule の commit を記録します。更新は submodule 内で検証済み commit を checkout し、親側で新しい gitlink を commit してください。branch の先端を暗黙追従させないでください。

## Direct source import

Vite / Bun など TypeScript source を処理できる環境では、ゲーム側から次のように import します。

```ts
import {
  MessageWindow,
  PhaserWindowInput,
  type WindowConfig,
} from "../../vendor/reusable_phaser_window_system/index.ts";
```

`src/**` への deep import はしないでください。公開 barrel にない helper は内部実装であり、互換性保証の対象外です。

ホスト側 TypeScript は `moduleResolution: "Bundler"` と `.ts` import の解決を許可する必要があります。本リポジトリの [tsconfig.json](../tsconfig.json) が基準設定です。

## Built artifact import

ホストが TypeScript submodule source を直接処理しない場合は、submodule をビルドして `dist/index.js` と `dist/index.d.ts` を参照します。

```bash
bun --cwd vendor/reusable_phaser_window_system install
bun --cwd vendor/reusable_phaser_window_system run build
```

`dist/` を親リポジトリへ複製せず、alias や workspace 設定で submodule の出力を参照してください。

## Phaser ownership

- 対応バージョンは `package.json` の `phaser` dependency を正とします。
- ゲームと framework が別々の Phaser runtime を bundle しないよう、ホスト bundler では同じ Phaser 解決先を使用します。
- Scene ごとに `PhaserWindowInput` を1つ共有し、入力所有権は `activate()` / `deactivate()` と `ownsInput` で管理します。

## Font assets

既定 font の URL は framework sandbox 基準です。ゲーム本体では、必要な `font.png` / `font.xml` / `license.txt` をゲームの asset pipeline に置き、consumer-owned URL と cache key で `scene.load.bitmapFont()` を呼んでください。runtime に font builder や GitHub access は不要です。

## Upgrade checklist

1. [CHANGE boundary](SPECIFICATION.md#compatibility-boundary) と公開 API 差分を確認する
2. `bun run check` を submodule 内で実行する
3. 親ゲームの typecheck / build / browser smoke test を実行する
4. submodule commit の更新とゲーム側変更を同じレビュー単位にする

実際に型検査される source-import 例は [`examples/consumer/submodule-source.ts`](../examples/consumer/submodule-source.ts) にあります。
