# MVP Release Checklist

Last updated: 2026-08-29

## Automated gate

- [x] `bun run check` passes (20 tests, typecheck, build)
- [x] Production bundle externalizes Phaser (`dist/index.js` has no bundled Phaser)
- [x] Font sync script validates upstream artifacts and writes `provenance.json`

## Browser evidence (manual)

- [ ] `?scene=window-base` clipping/move/resize
- [ ] `?scene=lifecycle` repeated scene restart
- [ ] `?scene=bitmap-font` Japanese/ASCII BitmapText samples
- [ ] `?scene=message` keyboard confirm/skip
- [ ] `?scene=choice` keyboard/pointer selection
- [ ] `?scene=integration` message → choice loop

## Known MVP limits

- WebGL mask clipping primary path; Canvas uses GeometryMask fallback
- No Japanese kinsoku in text layout
- No scrolling for overflowing selectable lists
- Gamepad polling uses first connected pad only
