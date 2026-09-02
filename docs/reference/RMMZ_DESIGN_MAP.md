# RMMZ design reference map

## Purpose and boundary

This document records which architectural ideas may be learned from RPG Maker MZ's JavaScript window system and how they are translated to Phaser 4. It is a design reference, not a compatibility specification.

- Refer to class responsibilities, public behavior, state transitions, and interaction patterns.
- Do not copy RMMZ source, comments, assets, windowskins, names of private fields, or implementation-specific algorithms.
- Do not require RMMZ at build time or runtime.
- Do not claim API, rendering, control-code, or asset compatibility.
- When behavior is ambiguous, the consumer-facing contract in `docs/SPECIFICATION.md` and `docs/API.md` takes precedence. Historical implementation plans under `docs/plan/` are not consumer specifications.

## Responsibility map

| RMMZ concept | Responsibility learned | Phaser 4 design | Deliberate difference |
|---|---|---|---|
| `Window` | Frame/background, inner rectangle, openness, cursor/pause/arrow parts, child clipping | `WindowBase`, `WindowRenderer`, `ContentClipper` | Theme primitives replace Window.png assumptions; openness is normalized to `0..1` and driven by a transition controller |
| `Window_Base` | Common text metrics, text drawing, basic escape processing, open/close updates | `TextWindowBase`, `BitmapTextMeasurer`, `TextLayout`, `MessageParser` | Rendering uses Phaser-standard `font.png` + BMFont XML artifacts from `reusable_pixel_font_builder`; text parsing stays pure TypeScript and separate from rendering; no actor/database helpers |
| `Window_Scrollable` | Scroll position/target, wheel/touch handling, scroll limits and arrows | `ScrollController` plus an optional `ScrollableWindow` | Composition is preferred so selection and scrolling can coexist without deep inheritance |
| `Window_Selectable` | Index, item geometry, cursor movement, enabled checks, OK/cancel handlers | `SelectionController`, `SelectableWindow`, `CursorRenderer` | Input is normalized through adapters; domain controller does not play sounds or know Phaser |
| `Window_Command` | Commands as label/symbol/enabled/ext records | Future `CommandWindow` using `SelectableItem<T>` | Game command dispatch and symbols remain application-owned |
| `Window_Message` | Incremental text processing, waits, pause/input, page transitions | `MessageController`, `MessageWindow`, `MessageParser`, `TextState` | `say()` owns an explicit Promise lifecycle; choices and dialogue graph are separate |
| `Window_ChoiceList` | Present choices and return a selection | `ChoiceWindow.choose()` | Returns a typed result rather than mutating a global message object |
| `WindowLayer` | Group windows and coordinate rendering | Scene display list initially; future `WindowManager` only if focus/modal requirements prove it necessary | No global singleton and no special compositor in MVP |
| `Input` / `TouchInput` | Trigger/repeat/long-press semantics across devices | `WindowInputAdapter`, `PhaserWindowInput` | Actions are semantic (`confirm`, `cancel`, directions), injectable, and instance-scoped |

## State translation

### Window lifecycle

```text
constructed -> open/closed -> opening/closing -> destroyed
                   |               |
                   +---- shown ----+
```

- `visible` answers whether the root Game Object is rendered.
- `active` answers whether semantic input may be consumed.
- `enabled` answers whether the window is allowed to operate.
- `phase` is `closed | opening | open | closing`.
- `openness` is a presentation value in `0..1`; it must not be confused with alpha.
- `destroy()` is idempotent. Scene shutdown cancels pending async work before releasing Phaser objects and subscriptions.

### Message lifecycle

```text
idle -> revealing -> waiting -> paused-for-advance -> revealing
  ^                         |                         |
  +--------- complete/cancel/error <-----------------+
```

Only one `say()` call may own a `MessageWindow` at a time in MVP. A second call rejects with a documented busy error. Destroy or scene shutdown rejects/cancels the pending operation exactly once.

### Selection lifecycle

`SelectionController` owns only items, selected index, movement rules, disabled-item skipping, and emitted domain events. Pointer hit testing, key repeat, gamepad polling, cursor graphics, and sounds live outside the controller.

## Phaser 4 constraints that override the reference design

1. Phaser `Container` children use local coordinates and inherit transforms. `WindowBase` should own one shallow root container and a content container; avoid nesting containers without a measured need.
2. In Phaser 4, masks are filters in WebGL, while `GeometryMask` is documented as Canvas-only. All clipping calls therefore pass through `ContentClipper`; no derived window may call mask/filter APIs directly.
3. A Scene can be shut down and started again without the Scene instance being destroyed. Every subscription made by a window/input adapter must be released on shutdown, and pending Promises must settle.
4. Container-local depth is ordered by child list rather than arbitrary scene depth. Renderer parts must have a fixed order: background, frame, content, cursor/indicators, overlays.
5. Phaser input and rendering types stay at adapter/window boundaries. Parser, transition, layout policy, selection, and message progression are testable without creating a `Phaser.Game`.
6. All window text is rendered with bitmap-font artifacts produced by <https://github.com/junt74-itch/reusable_pixel_font_builder>. Phaser `Text`, browser/system fonts, and silent fallback fonts are not used by the window system.
7. Font assets are loaded by Phaser 4's standard `Scene.load.bitmapFont` path. The window system consumes a loaded cache key and does not duplicate the upstream builder's XML generation or implement a private font loader.

## Source notes

Checked on 2026-08-29:

- RPG Maker MZ core API: <https://developer.rpgmakerweb.com/rpg-maker-mz/Window.html>
- RPG Maker MZ `Window.js` source documentation: <https://developer.rpgmakerweb.com/rpg-maker-mz/Window.js.html>
- Phaser 4 repository (`4.2.1` at review time): <https://github.com/phaserjs/phaser>
- Phaser 4 Container API: <https://docs.phaser.io/api-documentation/class/gameobjects-container>
- Phaser 4 FilterList / mask API: <https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-components-filterlist>
- Phaser Scene lifecycle/events: <https://docs.phaser.io/phaser/concepts/scenes>
- Reusable pixel-font builder (Phaser 4 output inspected at `20fa374ba24d3d70ff7437ab39532f28261f45f5`): <https://github.com/junt74-itch/reusable_pixel_font_builder>

The version recorded here is a planning baseline. Dependency changes require rerunning the clipping and lifecycle spike tasks before implementation continues.
