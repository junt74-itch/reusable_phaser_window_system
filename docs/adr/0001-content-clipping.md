# ADR 0001: Content clipping

## Status

Accepted (2026-08-29)

## Context

Derived windows must clip overflowing content after move and resize without importing Phaser mask/filter APIs directly.

## Decision

Use `ContentClipper` with renderer-specific paths:

- **WebGL:** enable filters on the content container and add an internal mask via `content.filters.internal.addMask(maskGraphics, false, scene.cameras.main, "local")`.
- **Canvas:** create a `GeometryMask` from hidden mask `Graphics` and call `content.setMask(geometryMask, true)`.

Mask bounds use content-local `WindowBounds` and redraw on resize without replacing the content target.

## Verified API (Phaser 4.2.1)

- `Phaser.GameObjects.Container.enableFilters()`
- `Phaser.GameObjects.Components.FilterList.addMask(mask?, invert?, viewCamera?, viewTransform?, scaleFactor?)`
- `Phaser.GameObjects.Graphics.createGeometryMask()`
- `Phaser.GameObjects.GameObject.setMask(mask, fixedPosition?)`
- `Phaser.GameObjects.GameObject.clearMask(destroyMask?)`

## Cleanup

`ContentClipper.destroy()` removes mask filters or geometry masks, destroys mask graphics, and clears references.

## Rejected alternatives

- Direct mask usage in derived windows (violates abstraction boundary)
- Phaser 3 documentation assumptions without runtime verification
