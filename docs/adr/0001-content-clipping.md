# ADR 0001: Content clipping

## Status

Accepted (2026-08-29)

## Context

Derived windows must clip overflowing content after move and resize without importing Phaser mask/filter APIs directly.

## Decision

Use `ContentClipper` with renderer-specific paths:

- **WebGL:** enable filters and add an **external** mask via `content.filters.external.addMask(maskGraphics, false, scene.cameras.main, "world")`. Internal masks match the filtered object's view; scrolled children expand that view so the clip rect sticks to overflow (top leak / bottom crop). External + world keeps the hole at the content rectangle in camera space.
- Pin `target.setSize(width, height)` when bounds update so the filter region does not follow child `getBounds()`.
- Set `filtersFocusContext = true` so the filter camera tracks the render context, not the expanded child bounds (`filtersAutoFocus` follows the Game Object by default).
- **Canvas:** create a `GeometryMask` from hidden mask `Graphics` and call `content.setMask(geometryMask)`.

Mask bounds use content-local `WindowBounds` and redraw on resize without replacing the content target.

## Verified API (Phaser 4.2.1)

- `Phaser.GameObjects.Container.enableFilters()`
- `Phaser.GameObjects.Components.FilterList.addMask(mask?, invert?, viewCamera?, viewTransform?, scaleFactor?)` — `viewTransform: "world"`
- `filters.external` (camera-space) vs `filters.internal` (object-view)
- `Phaser.GameObjects.Graphics.createGeometryMask()`
- `Phaser.GameObjects.GameObject.setMask(mask)`
- `Phaser.GameObjects.GameObject.clearMask(destroyMask?)`

## Cleanup

`ContentClipper.destroy()` removes mask filters or geometry masks, destroys mask graphics, and clears references.

## Rejected alternatives

- Direct mask usage in derived windows (violates abstraction boundary)
- Phaser 3 documentation assumptions without runtime verification
