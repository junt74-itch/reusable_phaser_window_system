# Public API

## Loading a font

```ts
scene.load.bitmapFont(
  "jf-dot-mplus12",
  "/examples/assets/fonts/jf-dot-mplus12/font.png",
  "/examples/assets/fonts/jf-dot-mplus12/font.xml",
);
```

Sync upstream artifacts with:

```bash
bun run font:sync -- --source /path/to/reusable_pixel_font_builder --font jf-dot-mplus12
```

## MessageWindow

```ts
const input = new PhaserWindowInput(scene);
const messageWindow = new MessageWindow(scene, config, { input, ownsInput: true });

await messageWindow.say("NPC", "こんにちは。", { charsPerSecond: 30 });
```

## ChoiceWindow

```ts
const result = await choiceWindow.choose(["Attack", "Defend", "Run"]);
if (result.status === "selected") {
  console.log(result.item.label);
}
```

## Errors

- `MessageBusyError` / `ChoiceBusyError`: concurrent call rejected
- `WindowOperationCancelledError` / `WindowDestroyedError`: lifecycle cancellation
- `MissingBitmapGlyphError`: unsupported code point for configured font
- `BitmapFontNotLoadedError`: missing preload

## Theme

Use `resolveWindowTheme()` and pass partial overrides through `WindowConfig.theme`.
