# リッチテキスト利用ガイド

ゲーム内の文章で、文字ごと・文字範囲ごとにビットマップフォントや文字サイズを変えたり、文章を左・中央・右へ揃えたりする方法を説明します。

対象となる主なウインドウは次のとおりです。

- `MessageWindow`
- `HelpWindow`
- `LogWindow`
- `DocumentWindow`
- `ChoiceWindow`
- `CommandWindow`

## 1. 基本形

通常の文字列の代わりに、`RichText` オブジェクトを渡します。

```ts
import type { RichText } from "reusable-phaser4-window-system";

const text: RichText = {
  align: "center",
  spans: [
    { text: "レベルアップ！\n" },
    { text: "最大HP ", fontSize: 12 },
    { text: "+20", fontSize: 24 },
  ],
};

helpWindow.setHelp(text);
```

`spans` に並べた文字列は、上から順番に連結して表示されます。スタイルを変えたい位置でspanを分けてください。

## 2. フォントを準備する

使用するビットマップフォントは、ウインドウを作る前にPhaserの`preload()`で読み込みます。

```ts
preload(): void {
  this.load.bitmapFont(
    "main-font",
    "/assets/fonts/main/font.png",
    "/assets/fonts/main/font.xml",
  );

  this.load.bitmapFont(
    "emphasis-font",
    "/assets/fonts/emphasis/font.png",
    "/assets/fonts/emphasis/font.xml",
  );
}
```

`main-font`や`emphasis-font`はPhaserのフォントキャッシュキーです。`fontKey`には、この読み込み時に指定したキーを書きます。

通常使用するフォントとフォールバック候補は、ウインドウのthemeに設定します。

```ts
const theme = {
  text: {
    fontKey: "main-font",
    fontKeys: ["main-font", "emphasis-font"],
    fontSize: 12,
  },
};
```

## 3. 文字範囲ごとにフォントとサイズを変える

各spanでは、`fontKey`と`fontSize`を個別または同時に指定できます。

```ts
const rewardText: RichText = {
  spans: [
    { text: "報酬: " },
    {
      text: "伝説の剣",
      fontKey: "emphasis-font",
      fontSize: 20,
    },
    { text: " を獲得した！" },
  ],
};
```

指定を省略した場合は、ウインドウthemeの値が使われます。

| spanの指定 | 使用される値 |
|---|---|
| `fontKey`を省略 | `theme.text.fontKey` |
| `fontSize`を省略 | `theme.text.fontSize` |
| 両方を指定 | 指定したフォントとサイズ |

1文字だけ変えたい場合も、その文字を独立したspanにします。

```ts
const critical: RichText = {
  spans: [
    { text: "ダメージ " },
    { text: "9", fontKey: "emphasis-font", fontSize: 28 },
    { text: "9", fontKey: "emphasis-font", fontSize: 28 },
    { text: "9", fontKey: "emphasis-font", fontSize: 28 },
    { text: "!" },
  ],
};
```

連続する文字の設定が同じなら、1つのspanへまとめても表示結果は同じです。

## 4. 左・中央・右へ揃える

`align`はリッチテキスト全体に指定します。

```ts
const leftText: RichText = {
  align: "left",
  spans: [{ text: "左寄せ" }],
};

const centerText: RichText = {
  align: "center",
  spans: [{ text: "センター寄せ" }],
};

const rightText: RichText = {
  align: "right",
  spans: [{ text: "右寄せ" }],
};
```

`align`を省略すると`left`になります。複数行の場合は、各行の実際の文字幅を基準にそれぞれ配置されます。

```ts
const resultText: RichText = {
  align: "right",
  spans: [
    { text: "獲得ゴールド\n" },
    { text: "1,250 G", fontSize: 20 },
  ],
};
```

spanごと、または行ごとに異なる`align`を指定することはできません。異なる横寄せを同時に表示したい場合は、別のウインドウや別のコンテンツとして配置してください。

## 5. 各ウインドウで使用する

### MessageWindow

```ts
await messageWindow.say("王様", {
  align: "center",
  spans: [
    { text: "勇者よ、" },
    { text: "よくぞ参った", fontKey: "emphasis-font", fontSize: 18 },
    { text: "。" },
  ],
});
```

`{color:FFAA44}`、`{speed:20}`、`{wait:500}`などのメッセージ制御トークンは、span内の文字列にも使用できます。

```ts
await messageWindow.say("戦士", {
  spans: [
    { text: "必殺技、" },
    {
      text: "{color:FFAA44}ドラゴンブレイク！{color}",
      fontKey: "emphasis-font",
      fontSize: 22,
    },
  ],
});
```

`{font}`や`{size}`のような制御トークンはありません。フォントとサイズはspanのプロパティで指定します。

### HelpWindow

```ts
helpWindow.setHelp({
  spans: [
    { text: "攻撃力 " },
    { text: "+15", fontSize: 20 },
  ],
  align: "right",
});
```

表示を消す場合は`null`を渡します。

```ts
helpWindow.setHelp(null);
```

### LogWindow

```ts
logWindow.append({
  spans: [
    { text: "スライムに " },
    { text: "32", fontSize: 18 },
    { text: " ダメージ！" },
  ],
});
```

### DocumentWindow

```ts
documentWindow.setDocument({
  align: "center",
  spans: [
    { text: "第一章\n", fontKey: "emphasis-font", fontSize: 24 },
    { text: "旅立ち\n\n" },
    { text: "その日、冒険が始まった。" },
  ],
});
```

### ChoiceWindow

```ts
const result = await choiceWindow.choose([
  {
    id: "fire",
    label: {
      align: "center",
      spans: [
        { text: "炎の加護", fontKey: "emphasis-font", fontSize: 18 },
      ],
    },
    value: "fire",
    enabled: true,
  },
  {
    id: "ice",
    label: { spans: [{ text: "氷の加護" }] },
    value: "ice",
    enabled: true,
  },
]);
```

`ChoiceWindow`と`CommandWindow`のラベルは折り返しません。改行が含まれる場合は先頭行だけを表示し、行ボックスを超える部分はclipされます。大きな文字を使う場合は、構築時の`rowHeight`を十分に確保してください。

```ts
const choiceWindow = new ChoiceWindow(scene, config, {
  input,
  rowHeight: 40,
});
```

## 6. フォントフォールバック

spanに`fontKey`を指定した場合、その文字は次の順番で検索されます。

```text
span.fontKey → theme.text.fontKeysの先頭から順番
```

たとえば装飾フォントに漢字がなくても、`main-font`に存在すればそちらで表示できます。

```ts
const theme = {
  text: {
    fontKey: "main-font",
    fontKeys: ["main-font"],
  },
};

const text: RichText = {
  spans: [
    { text: "ABC漢字", fontKey: "emphasis-font" },
  ],
};
```

ブラウザやOSのシステムフォントへ自動的に切り替わることはありません。

## 7. よくあるエラー

### BitmapFontNotLoadedError

`fontKey`に指定したフォントがPhaserへ読み込まれていません。

- `preload()`で`load.bitmapFont()`を呼んでいるか
- preload完了後にウインドウを生成しているか
- 読み込み時とspanの`fontKey`が一致しているか

を確認してください。

### MissingBitmapGlyphError

指定フォントとフォールバック候補のすべてに、表示しようとした文字がありません。必要な文字を含むビットマップフォントを作成し、`theme.text.fontKeys`へ追加してください。

### WindowConfigError

次のような指定は設定エラーになります。

- 空の`fontKey`
- 0以下、小数、無限値などの`fontSize`
- `left`、`center`、`right`以外の`align`

## 8. 現在の制限

- フォントはPhaserのビットマップフォントのみです。
- 太字、斜体、下線、影、リンク、画像埋め込みはありません。
- spanごとの色指定はありません。`MessageWindow`では`{color}`トークンを使用できます。
- spanごとの`align`、行ごとの`align`、縦方向の揃えはありません。
- 日本語の禁則処理はありません。
- `ChoiceWindow`と`CommandWindow`のラベルは折り返しません。
- `fontSize`は正の整数で指定します。

## 9. 型を再利用する

ゲーム側で文章データを作る関数にも`RichText`を使用できます。

```ts
import type { RichText } from "reusable-phaser4-window-system";

function createDamageText(damage: number): RichText {
  return {
    align: "right",
    spans: [
      { text: "ダメージ: " },
      {
        text: String(damage),
        fontKey: "emphasis-font",
        fontSize: damage >= 100 ? 24 : 16,
      },
    ],
  };
}

helpWindow.setHelp(createDamageText(128));
```

公開型と詳細なAPI一覧は[API.md](API.md#rich-text)、正確な動作契約は[SPECIFICATION.md](SPECIFICATION.md#rich-text)を参照してください。

