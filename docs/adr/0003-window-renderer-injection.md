# ADR 0003: Window renderer injection

## Status

Accepted (2026-08-29)

## Context

Phase 1 drew window chrome with `GraphicsWindowRenderer`. Phase 2 must allow consumer-owned NineSlice (or other) skins without `WindowBase` importing skin types or branching on renderer implementation.

## Decision

Inject chrome through `WindowBaseOptions.createRenderer`:

```ts
createRenderer?: (context: WindowRendererFactoryContext) => WindowRenderer;
```

- `WindowRendererFactoryContext` supplies `{ scene, root }` after the root container exists and before derived content is attached.
- Default factory (`createDefaultGraphicsWindowRenderer`) returns `GraphicsWindowRenderer` + `createPhaserGraphicsFactory`, preserving Phase 1 behavior when no option is passed.
- `WindowBase` stores `WindowRenderer` (interface), not `GraphicsWindowRenderer`.
- Child order remains: background, frame (via renderer factory), content container, then derived overlays.

Resolution lives in `resolveWindowRenderer()` so tests can verify injection without a full Phaser boot.

## Verified API (Phaser 4.2.1)

Default path unchanged from Phase 1:

- `scene.add.graphics()` via `createPhaserGraphicsFactory`
- `GraphicsWindowRenderer.resize` / `applyTheme` / `setOpenness` / `destroy`

NineSlice verification is deferred to TASK-120 (spike); this ADR records the seam only.

## Verified NineSlice API (Phaser 4.2.1, TASK-120)

Exercised under `roundPixels: true` with a repo-owned 48×48 placeholder (`examples/assets/skins/window-placeholder.png`, not RMMZ `Window.png`):

- `scene.load.image(key, url)`
- `scene.textures.exists(key)` — missing key throws `MissingWindowSkinError` (no Graphics fallback)
- `scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST)`
- `scene.add.nineslice(x, y, texture, frame, width, height, leftWidth, rightWidth, topHeight, bottomHeight, tileX, tileY)` (WebGL; omitted `frame` uses `0`)
- `NineSlice.setOrigin(0, 0)` so chrome aligns to the window root local origin (factory default is center)
- `NineSlice.setSize(width, height)` — integer sizes; minimum is `leftWidth + rightWidth` by `topHeight + bottomHeight`
- Openness remains `WindowBase` root `scaleY`; the renderer only stores `setOpenness`

Fallback: if NineSlice were absent from 4.2.1 types, keep `GraphicsWindowRenderer`. It is present and used.

Production class: `src/skin/NineSliceWindowRenderer.ts` via TASK-100 `createRenderer`. `WindowBase` does not import `skin/`.

## Rejected alternatives

- **NineSlice branch inside `WindowBase`:** couples base class to skin assets and texture keys.
- **Subclass per renderer (`GraphicsWindowBase`, `NineSliceWindowBase`):** duplicates geometry, clipping, and transition logic.
- **Global renderer singleton:** prevents per-window or per-scene skin choice.
- **Skin types imported by `WindowBase`:** violates isolation; consumer passes a factory closure instead.

## Isolation

`WindowBase` has no imports from `skin/` and no scroll, focus, portrait, or command-specific API. Only generic `createRenderer` and existing lifecycle hooks are allowed.
