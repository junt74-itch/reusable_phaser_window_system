# Rich text — implementation specification

Last reviewed: 2026-08-31  
Execution target: one task at a time. Do not start TASK-N+1 until TASK-N acceptance is reviewed.  
Prerequisite: Phase 2 is closed. Do not reopen padding, chrome, or focus/modal decisions.

Normative consumer docs after landing remain [`../SPECIFICATION.md`](../SPECIFICATION.md) and [`../API.md`](../API.md). This file is a maintainer work order, not a public API.

## Progress

| ID | タスク | 状態 | 実装結果 | テスト | 残課題 |
|---|---|---|---|---|---|
| RT-010 | 公開型と flatten / 正規化 | 完了 | types + richText.ts | 27 pass | |
| RT-020 | Measurer に BMFont `base` / 行メトリクスを公開 | 完了 | base + fontMetrics | 38 pass | 既定font推論base=13（XMLは11） |
| RT-030 | style-aware wrap / 可変行高 / baseline / align | 完了 | layoutRichText | 55 pass | |
| RT-040 | TextWindowBase を layout run で描画 | 完了 | line.runs 描画 | 61 pass | |
| RT-050 | HelpWindow を `string \| RichText` に拡張 | 完了 | setHelp union | 61 pass | |
| RT-060 | DocumentWindow を `string \| RichText` に拡張 | 完了 | setDocument union | 68 pass | |
| RT-070 | LogWindow を `string \| RichText` に拡張 | 完了 | append union | 72 pass | |
| RT-080 | MessageWindow.say を `string \| RichText` に拡張 | 完了 | say union + color交差 | 108 pass | |
| RT-090 | Choice / Command 行ラベルの span と align | 完了 | label union, no wrap | 87 pass | |
| RT-100 | `src/index.ts` 公開 surface | 完了 | layoutRichText + 型 | typecheck 緑 | |
| RT-110 | SPEC / API / README / 利用例 / FUTURE_TODO | 完了 | SPEC/API/README | 23 pass | |
| RT-120 | sandbox scene と consumer typecheck | 完了 | `?scene=rich-text` | scene-routes 5 / typecheck 緑 | |
| RT-130 | 全体受け入れと `bun run check` | 完了 | 239+10 pass / build 緑 | check 緑 | |

状態は `未着手` / `実装中` / `レビュー中` / `修正中` / `完了` のみ。

---

## 1. Outcome

利用者が次を書けること。

```ts
import {
  layoutRichText,
  type RichText,
} from "reusable-phaser4-window-system";

const body: RichText = {
  align: "center",
  spans: [
    { text: "小さい " },
    { text: "大きい", fontSize: 24 },
    { text: "\n別フォント ", fontKey: "other-bitmap" },
    { text: "混在", fontKey: "other-bitmap", fontSize: 18 },
  ],
};

helpWindow.setHelp(body);
documentWindow.setDocument(body);
logWindow.append(body);
await messageWindow.say("NPC", body);
```

次が同時に成立すること。

- 同一テキスト内で font と fontSize を文字範囲ごとに混在できる。
- 同じ span に font と fontSize を同時指定できる。
- 左 / 中央 / 右寄せは、各行の実測幅と利用可能な content 幅で決まる。
- 同一行の異なるサイズは共通ベースラインに乗る。
- padding / clip / resize relayout は既存の content bounds 契約のまま。
- 未ロードフォントは `BitmapFontNotLoadedError`、欠損グリフは `MissingBitmapGlyphError`。
- OS / CSS / Phaser `Text` へは落ちない。
- 既存の `string` API は左寄せ・theme 既定 style のまま動く。

---

## 2. Current state (do not re-abstract blindly)

| 既存部品 | 場所 | 現状 |
|---|---|---|
| `layoutText(string)` | `src/text/TextLayout.ts` | 単一 `BitmapTextMeasureStyle`。行高は `measurer.lineHeight * scale + lineSpacing` で均一。常に x=0 |
| `LayoutLine` | `src/text/types.ts` | `text`, `sourceRange`, `width`, `y`, `pageIndex`。run / align / ascent なし |
| `FontRun` | `src/text/fontFallback.ts` | 自動フォールバック用。利用者が指定する style run ではない |
| `FallbackBitmapTextMeasurer` | 同名 | code point ごとに `fontKeys` を歩く。計測 style は1つ |
| `PhaserBitmapTextMeasurer` | 同名 | `nativeFontSize`, `lineHeight` のみ。BMFont `base` 未公開 |
| `TextWindowBase.renderLines` | `src/text/TextWindowBase.ts` | 行を fallback font run に分割し、theme `fontSize` で左から並べる |
| `MessageWindow.renderRevealed` | `src/message/MessageWindow.ts` | color run × font run。style は theme 固定。`revealedText` を再 layout |
| `MessageParser` | `src/message/MessageParser.ts` | `{wait}` `{pause}` `{color}` `{speed}` `\f` `\n`。font/size token なし |
| `HelpWindow` | `src/help/HelpWindow.ts` | `setHelp(string \| null)`。page 0 のみ |
| `LogWindow` / `DocumentWindow` | `src/log`, `src/document` | `TextWindowBase` 非継承。独自に `layoutText` + font run 描画 |
| `SelectableWindow` | `src/selection/SelectableWindow.ts` | label は wrap しない。左寄せ。`rowHeight` 固定 |
| 公開入口 | `src/index.ts` | `layoutText`, `LayoutLine`, `TextLayoutResult` を export |

現行フォント artifact（`jf-dot-mplus12`）の BMFont `common` は `lineHeight="14"` `base="11"`。

---

## 3. Fixed decisions

### 3.1 スコープ

対象:

- 本文: Help / Log / Document / Message
- 行ラベル: Choice / Command（wrap なしの既存契約は維持）
- 公開 layout API

対象外（無断追加禁止）:

- マークアップ言語、`{font}` / `{size}` 制御コード
- リンク、画像埋め込み、太字、下線、影、装飾
- span 単位の tint / letterSpacing / scale
- speaker 行のリッチテキスト
- 日本語禁則、wrap 無効化
- OS / CSS / Phaser `Text` フォールバック
- ブロック全体の垂直揃え、span / 行ごとの align

### 3.2 公開データ構造

```ts
export type TextAlign = "left" | "center" | "right";

export interface RichTextSpan {
  readonly text: string;
  readonly fontKey?: string;
  readonly fontSize?: number;
}

export interface RichText {
  readonly spans: readonly RichTextSpan[];
  readonly align?: TextAlign;
}

export type WindowTextContent = string | RichText;
```

規則:

- `string` は `{ spans: [{ text }], align: "left" }` と等価。style は theme。
- `align` 省略時は `"left"`。
- `fontKey` 省略時は `theme.text.fontKey` を primary にする。
- `fontSize` 省略時は `theme.text.fontSize`。
- `fontSize` は正の整数。`scale` は theme のみ（span では変えない）。
- `spans: []` および空文字は空 content。
- 空 `text` の span はグリフを生まない。
- 明示改行は span 内の `\n`（`\r\n` / `\r` は既存どおり `\n` へ正規化）。
- Help / Log / Document では `\f` はリテラル。page break は Message parser のみ。
- 文字範囲は利用者が span を分割して指定する。ライブラリはマークアップを解析しない。

### 3.3 公開関数 API

既存:

```ts
layoutText(text: string, measurer: BitmapTextMeasurer, options: TextLayoutOptions): TextLayoutResult
```

追加:

```ts
layoutRichText(
  content: WindowTextContent,
  measurer: BitmapTextMeasurer,
  options: TextLayoutOptions,
): TextLayoutResult
```

- `layoutText` は破壊しない。内部で `layoutRichText` に委譲してよい。
- `TextLayoutOptions.align` を追加する。省略時 `"left"`。`RichText.align` が優先し、なければ `options.align`。
- `options.style` は省略された span 欄の既定値。

### 3.4 Window API

シグネチャを union で広げる。既存の `string` 呼び出しは維持する。

| API | 変更 |
|---|---|
| `HelpWindow.setHelp` | `string \| RichText \| null` |
| `HelpWindow.getHelp` | `string \| RichText \| null` |
| `DocumentWindow.setDocument` | `string \| RichText` |
| `DocumentWindow.getDocument` | `string \| RichText` |
| `LogWindow.append` | `string \| RichText` |
| `LogWindow.getEntries` | `readonly (string \| RichText)[]` |
| `MessageWindow.say` | 第2引数 `string \| RichText` |
| `SelectableItem.label` / `CommandItem.label` | `string \| RichText` |

getter の戻り型拡張は TypeScript 上の拡大変更である。実行時に `string` だけを渡している既存呼び出しは壊れない。

### 3.5 style run（内部）

flatten 後、各ソース文字は次を持つ。

```ts
{ sourceIndex, char, fontKeySpecified, fontSize }
```

描画 / 計測用 run:

```ts
interface LayoutLineRun {
  readonly text: string;
  readonly fontKey: string;   // fallback 解決後
  readonly fontSize: number;
  readonly width: number;
  readonly x: number;         // align 適用後、行内 x
}
```

`LayoutLine` は互換のため `text`, `sourceRange`, `width`, `y`, `pageIndex` を残す。`y` は行ボックス上端のまま。次を追加する。

```ts
readonly height: number;
readonly ascent: number;
readonly align: TextAlign;
readonly runs: readonly LayoutLineRun[];
```

plain text + 左寄せでは `runs` は1フォントでもよく、`x` は 0 から始まる。

### 3.6 alignment

- 適用単位は content 全体（`RichText.align` または options）。
- 適用タイミングは wrap 後。各視覚行の実測幅を使う。
- 基準幅は layout 幅（content 幅。Message は portrait 予約幅を引いた値）。
- 行 x オフセット:
  - `left`: `0`
  - `center`: `Math.trunc((availableWidth - lineWidth) / 2)`
  - `right`: `availableWidth - lineWidth`
- `lineWidth > availableWidth`（既存の溢れた長トークン）は align に関係なく `0`。右側 clip を予測可能にするため。
- 空行の幅は 0。center / right でも幅 0 の行としてオフセットだけ適用する。

### 3.7 改行と折り返し

既存契約を維持する。

- wrap は常時有効。公開オフオプションは作らない。
- ASCII は空白区切り greedy wrap。収まらない連続トークンと日本語などは grapheme 分割。禁則なし。
- wrap 判定幅だけが style-aware。span 境界は wrap 境界ではない。
- 1 グリフが幅を超えてもそのグリフは単独行に置き、はみ出しは clip する。
- 高さ超過: Message は次ページ、Help は page 0 のみ、Log / Document は scroll 高さへ積む。

可変行高のため、ページ分割は均一 `pageCapacity` ではなく行ボックスを積んで判定する。1 行が content 高さを超える場合は、現行の `Math.max(1, ...)` 相当でその行だけをそのページに置く。

### 3.8 行高 / ascent / descent / baseline

BMFont メトリクスを使う。`getTextBounds` の tight height は縦位置に使わない。幅計測は現行どおり measurer。

フォント key `F`、指定 `fontSize`、theme `scale`:

```
sizeRatio     = fontSize / nativeFontSize(F)
runAscent     = Math.round(base(F) * sizeRatio * scale)
runDescent    = Math.round((lineHeight(F) - base(F)) * sizeRatio * scale)
```

行:

```
lineAscent    = max(runAscent)    // 空行は default style
lineDescent   = max(runDescent)
lineBoxHeight = lineAscent + lineDescent
lineStep      = lineBoxHeight + lineSpacing
lineTop       = これまでの lineStep 合計（ページ内）
baselineY     = lineTop + lineAscent
BitmapText.y  = baselineY - runAscent
BitmapText.x  = lineXOffset + run.x
```

Phaser 4.2.1 の実測（RT-020 前調査）:

- `ParseXMLBitmapFont` は `common.lineHeight` と `info.size` だけを残し、`common.base` は捨てる。
- BitmapText のローカル原点は **line-top**。`yAdvance` は 0 から始まり、グリフは `yOffset * (fontSize / fontData.size)` に置かれる。
- `setFontSize` の倍率は `fontSize / fontData.size`。GameObject `scale` はそれに掛かる。
- tight `getTextBounds` は縦位置に使わない。

`base` の解決順:

1. `entry.data.base` が正の有限数ならそれを使う（将来の Phaser / 手動 cache 注入向け）
2. なければ cache 内グリフの `yOffset + height` の最頻値（`0 < bottom <= lineHeight`）を使う。同数なら小さい方。グリフが無ければ `lineHeight`
3. XML を再パースするローダーは追加しない

この `base` は「line-top から共有ベースラインまでのネイティブ px」である。既定 `jf-dot-mplus12` の XML は `base="11"` だが、Phaser が捨てるため実行時はグリフ最頻 bottom の **13** を使う。同一 font のサイズ混在では同じ規則で揃う。`data.base` を明示注入すれば XML 値を優先できる。

`PhaserBitmapTextMeasurer` と `FallbackBitmapTextMeasurer` は `base` と `fontMetrics(fontKey?)` を公開する。Fallback の `base` / `nativeFontSize` は primary。`fontMetrics(key)` はその key の連鎖エントリ、無ければ primary。

独自の第2座標系は作らない。

`letterSpacing` は theme 値を隣接 run 間にも現行 fallback measurer と同じ規則で入れる。

### 3.9 フォントフォールバック

span 指定 key をその範囲の primary にする。連鎖は

```
[span.fontKey ?? theme.fontKey, ...theme.fontKeys] の重複除去
```

文字ごとにこの順で解決する。指定 key を run にそのまま採用しない。

- 指定 key が cache / measurer に無い: `BitmapFontNotLoadedError`（描画前。`setFontKey` と同じ契約）
- 連鎖を使い切ってもグリフが無い: `MissingBitmapGlyphError`（`triedKeys` に実際に試した builder key）
- システム / web / CSS フォントへは落ちない
- 既存 `fontKeys` 自動 fallback は、span が `fontKey` を省略したときも同じ連鎖で動く
- 公開 `BitmapTextMeasurer` の `base` / `measureRun` / `fontMetrics` / `hasGlyphFor` は optional。layout が内部 adapter で補完する

### 3.10 Message 統合

- `say(speaker, content, options)` の `content` を union にする。
- `RichText` の場合、span `text` を連結した文字列を既存 `parseMessage` に渡す。
- `{wait}` `{pause}` `{color}` `{speed}` `\f` `\n` は現行どおり。font/size token は追加しない。
- style は「表示される本文文字」の flat index に割り当てる。制御トークンは index を進めない（`buildFlatTextFromTokens` と同じ）。
- typewriter は引き続き revealed prefix を描く。greedy wrap は先読みしないので、prefix の確定行は全文 layout と一致する。
- ページ分割は現行どおり say 開始時に全文 flat text から計算する。ただし行高は style-aware。
- color run と font/size run は交差分割する（現行の color × font と同じ）。
- speaker は theme style、左寄せのまま。

### 3.11 Choice / Command

- `label` を `string | RichText` にする。
- wrap しない。長い label は行ボックスを横切って clip される。
- `RichText.align` はその行ボックス幅を基準に適用する。
- `rowHeight` は既存オプションが勝つ。混在サイズが行高を超えたら縦方向 clip。行高の自動拡張はしない。

### 3.12 境界条件

| 入力 | 結果 |
|---|---|
| 空文字 / `spans: []` | 行なし、または空表示。throw しない |
| 改行のみ | 空行を1つ以上作る。行高は default style |
| 未ロード `fontKey` | `BitmapFontNotLoadedError` |
| 欠損グリフ | `MissingBitmapGlyphError` |
| 空 `fontKey` | `WindowConfigError` |
| 非正 / 非整数 `fontSize` | `WindowConfigError` |
| 巨大 `fontSize` | 計測・配置は整数規則のまま。幅超過は単独行 + clip。高さ超過は page/scroll |
| 未対応 align 値 | `WindowConfigError` |
| resize / `setPadding` / `setTheme` | 既存 `onLayoutChanged` で再 layout |

### 3.13 エラー契約

新しい error class は作らない。

- `WindowConfigError` — span / align / fontSize 不正
- `BitmapFontNotLoadedError` — cache 未登録
- `MissingBitmapGlyphError` — 連鎖尽き
- `FontSwapBusyError` — 既存の `setFontKey` 中制約
- `MessageBusyError` / destroyed / cancelled — 既存のまま

### 3.14 互換性

壊してよいもの: `src/index.ts` に出していない内部 helper、`FontRun` の意味（内部の自動 fallback 用のまま）。

壊してはいけないもの:

- `layoutText(string, ...)` の呼び出し形と、plain text の左寄せ結果
- `say` / `setHelp` / `setDocument` / `append` / `choose` の string 形
- BitmapText のみ、整数 scale、nearest-neighbor、`roundPixels`
- typed error と lifecycle

`LayoutLine` へのフィールド追加は読み取り側には安全、構築側には TypeScript 破壊になり得る。テストと内部だけが構築する前提とし、公開文書で additive と書く。

### 3.15 テスト戦略

1. 純関数: flatten、wrap、align 座標、baseline、空行、溢れたグリフ、可変行高の page 分割
2. FakeMeasurer: font key / fontSize ごとに幅と `base` / `lineHeight` を変えられるもの
3. fallback: span 指定 key を primary にし、欠けたら theme 連鎖、尽きたら `triedKeys`
4. 回帰: 既存 `TextLayout.test.ts` / `fontFallback.test.ts` / message page layout
5. Window: Help / Log / Document / Message の union API と relayout
6. Message: color token と font/size span の交差、typewriter prefix
7. Choice/Command: wrap しないこと、rowHeight 固定、align
8. isolation: システムフォント名、`GameObjects.Text`、`add.text` を追加しない
9. `examples/consumer` は package export のみ
10. sandbox は目視用。完了条件の主証拠は自動テスト

---

## 4. Task breakdown

各タスクの詳細指示は、実装開始時にこのファイルの Fixed decisions を正として出す。

- **RT-010** 型と flatten。Phaser 非依存。
- **RT-020** measurer に `base` を追加。Phaser cache 実測。
- **RT-030** `layoutRichText` と `layoutText` 委譲。描画はまだ。
- **RT-040** `TextWindowBase` が `line.runs` を描く。Help が追随できる状態にする。
- **RT-050〜080** 各 Window。Log / Document は `TextWindowBase` に無理に引き上げない。
- **RT-090** 選択行。本文 layout を共有しない。
- **RT-100〜130** 公開面、文書、sandbox、全体検証。

---

## 5. Risks

| リスク | 緩和 |
|---|---|
| Phaser BitmapText の y が line-top でない | RT-020 で実測。外れたら停止 |
| 可変行高が Message の page break index をずらす | 全文 layout で breaks を再計算。既存 `computeLayoutPageBreaks` を維持 |
| `LayoutLine` フィールド追加 | 既存テストを先に緑にする。構築箇所を内部に限定 |
| Log / Document の複製描画 | 共通 render helper を text/ に置くが、Window 階層は変えない |
| getter の union 化 | consumer typecheck を RT-100 で更新 |
| 巨大サイズの整数オーバー | 正の整数のみ。非有限は `WindowConfigError` |
| マークアップ欲求 | Message に `{font}` を足さない |

---

## 6. Out of scope reminders

`WindowBase` に font map を置かない。skin / focus / padding 計画を再開しない。ユーザー未コミットの無関係な差分を上書きしない。
