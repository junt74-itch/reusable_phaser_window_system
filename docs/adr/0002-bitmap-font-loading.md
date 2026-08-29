# ADR 0002: Bitmap font loading

## Status

Accepted (2026-08-29)

## Context

All window text must use validated `reusable_pixel_font_builder` artifacts loaded through Phaser's standard bitmap-font loader.

## Decision

Load with:

```ts
this.load.bitmapFont("jf-dot-mplus12", textureURL, fontDataURL);
```

Measure with a hidden `scene.make.bitmapText(...)` probe and `getTextBounds(true)`.

Rendering uses integer `fontSize`, integer `scale`, integer positions, nearest-neighbor texture filtering, and `camera.roundPixels = true`.

## Verified upstream artifact

- Repository: `junt74-itch/reusable_pixel_font_builder`
- Commit: `20fa374ba24d3d70ff7437ab39532f28261f45f5`
- Font id: `jf-dot-mplus12`

## Lifecycle

Windows destroy their own `BitmapText` objects and measurer probes but do not remove shared cache entries during ordinary teardown.

## Missing glyphs

Production layout preflights code points and throws `MissingBitmapGlyphError` before display. Phaser may still render absent glyphs opaquely; that behavior is evidence only.
