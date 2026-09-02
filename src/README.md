# Source map

`../index.ts` と `index.ts` が公開 API の入口です。submodule 利用者はリポジトリ直下の `index.ts`、本リポジトリのビルドは `src/index.ts` を使用します。両者の公開面は同一です。

## Public modules

| Directory | Responsibility |
|---|---|
| `core/` | `WindowBase`、theme、transition、renderer、content clipping |
| `input/` | keyboard / pointer / gamepad の意味入力 adapter |
| `text/` | BitmapText 計測、layout（`layoutRichText` / 混在 font・size・align）、font fallback、text window base |
| `message/` | message parser、state/controller、`MessageWindow` |
| `selection/` | selection controller、cursor、selectable window |
| `choice/`, `command/`, `help/` | 選択肢・コマンド・ヘルプ window |
| `scroll/`, `log/`, `document/` | scrolling と長文表示の合成 |
| `skin/` | NineSlice renderer |
| `focus/` | Scene 所有の focus/modal controller |
| `a11y/` | DOM を持たない意味イベント |
| `layout/` | viewport から整数 window bounds を求める pure helper |

## Boundary rule

- 公開利用は `../index.ts` または `index.ts` の export に限定します。
- barrel に export されないファイルは内部実装です。deep import に互換性はありません。
- Phaser 依存は adapter / renderer / window 境界に置き、controller と layout は可能な限り pure TypeScript に保ちます。
- `WindowBase` に派生機能固有の API を追加せず、scroll、skin、focus、message は合成または派生クラスで所有します。

規範仕様は [`../docs/SPECIFICATION.md`](../docs/SPECIFICATION.md)、公開 API は [`../docs/API.md`](../docs/API.md) を参照してください。
