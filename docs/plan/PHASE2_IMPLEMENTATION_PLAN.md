# Reusable Phaser 4 Window System — Phase 2 implementation plan

Last reviewed: 2026-08-29  
Execution target: Cursor Composer 2.5, one task at a time  
Baseline: inherit [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (Bun 1.3+, TypeScript strict, Vite, Phaser 4.2.1)  
Prerequisite: the final gate in [PHASE1_CLOSEOUT_PLAN.md](PHASE1_CLOSEOUT_PLAN.md) is checked

This document authorizes Phase 2 only. It does not reopen Phase 1 decisions, does not start Phase 3, and does not publish a package.

Phase 1 already shipped `WindowBase`, Graphics chrome, bitmap-font text, `MessageWindow.say()`, and `ChoiceWindow.choose()`. Phase 2 adds scrolling, replaceable chrome, Scene-owned focus/modal, a small set of derived windows, and opt-in message/font extensions — **without** pushing derived-specific logic into `WindowBase`.

## 1. Outcome

Phase 2 is complete only when a browser sandbox demonstrates, and tests prove:

```ts
await commandWindow.chooseCommands([
  { id: "attack", label: "Attack", enabled: true },
  { id: "item", label: "Item", enabled: true },
]);

scrollable.setScrollOffset(120);
focus.acquire(commandWindow, { modal: true });
```

and all of the following hold:

- Lists longer than the content rectangle scroll; they no longer throw the Phase 1 overflow error.
- A consumer-owned NineSlice skin can replace Graphics chrome through a renderer factory. `WindowBase` still does not import skin types.
- Exactly one window in a Scene consumes confirm/cancel when a Scene-owned focus controller is used.
- Window text remains `BitmapText` from validated `reusable_pixel_font_builder` artifacts. No Phaser `Text`, CSS/web fonts, or system-font fallback.

The authoritative RMMZ *responsibility* translation remains [RMMZ_DESIGN_MAP.md](../reference/RMMZ_DESIGN_MAP.md). Phase 2 is still not a port.

## 2. Fixed decisions

Composer must not reopen [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) §2 or these Phase 2 decisions unless an acceptance criterion proves them infeasible.

| Topic | Decision |
|---|---|
| `WindowBase` isolation | `WindowBase` owns geometry, visibility, active/enabled, open/close, clipping, and a **replaceable** `WindowRenderer`. It does not own scroll offset, focus stacks, portraits, command symbols, or skin assets. |
| Renderer seam | Inject via `WindowBaseOptions.createRenderer`. Default remains `GraphicsWindowRenderer`. NineSlice is a future renderer, not a `WindowBase` branch. |
| Scroll | Pure `ScrollController` + composition. Do **not** create `WindowBase → ScrollableWindow → SelectableWindow`. `SelectableWindow` may *own* a `ScrollController`. |
| Long lists | First make overflow scroll with existing row objects. Virtualize visible rows only after composition works. |
| Skin assets | Consumer-owned textures. No RPG Maker `Window.png`, no bundled skin, no asset compatibility claim. |
| Focus / modal | Scene-owned controller. No process-global singleton. Windows keep `activate()` / `deactivate()`; the controller is the exclusive assigner when used. |
| Message tokens | Library-owned `{name}` / `{name:args}` syntax only. No RMMZ `\` control-code parser. |
| Portraits | `MessageWindow` content-slot only. `WindowBase` has no face/portrait API. |
| Audio | Typed callbacks only. No sound manager, no asset loading. |
| Font fallback | Application-supplied list of builder artifact keys. Exhaustion throws `MissingBitmapGlyphError`. Never system/web fonts. |
| Accessibility | Semantic events/hooks only. No DOM overlay, no screen-reader tree. |
| Responsive layout | Pure helper that returns integer bounds. `WindowBase` keeps `setSize` / `setPosition`; it does not subscribe to the camera. |
| Inheritance | Existing: `WindowBase → TextWindowBase → MessageWindow` and `WindowBase → TextWindowBase → SelectableWindow → ChoiceWindow`. New windows follow the same rule: compose controllers, do not deepen `WindowBase`. |

## 3. Phase 2 scope

Included (waves A–I below):

- Renderer injection; NineSlice renderer; optional cursor blink/theme fields.
- Wheel/page/drag semantic input; `ScrollController`; `ScrollableWindow`; selectable+scroll; optional scrollbar; visible-row virtualization.
- `CommandWindow`, `HelpWindow`, `LogWindow`, `DocumentWindow`.
- Scene-owned focus controller and modal capture.
- Constrained message tokens, portrait slot, auto-advance, audio hook callbacks.
- Multiple bitmap-font keys, explicit fallback chains, hot swap when idle.
- Semantic a11y events and a camera-relative layout helper.
- Sandboxes, public exports, and a Phase 2 evidence checklist.

Excluded (remain Phase 3 or never):

- `ItemListWindow`, `SettingsWindow`, inventory, save/load, dialogue graphs.
- RMMZ Window.png / control-code / database compatibility.
- Global `WindowManager` singleton, HTML/CSS/React/RexUI UI.
- Sound manager, localization system, advanced CJK kinsoku, bidi.
- DOM accessibility overlay, UI editor, package publish/tag.

## 4. Target topology (add only when a task starts)

```text
src/
├─ core/          (existing; renderer factory only)
├─ input/         (wheel / drag events)
├─ scroll/
│  ├─ ScrollController.ts
│  ├─ ScrollableWindow.ts
│  ├─ ScrollbarRenderer.ts
│  └─ types.ts
├─ skin/
│  ├─ NineSliceWindowRenderer.ts
│  └─ types.ts
├─ focus/
│  ├─ WindowFocusController.ts
│  └─ types.ts
├─ command/
│  └─ CommandWindow.ts
├─ help/
│  └─ HelpWindow.ts
├─ log/
│  └─ LogWindow.ts
├─ document/
│  └─ DocumentWindow.ts
├─ layout/
│  └─ viewportLayout.ts
└─ index.ts
examples/scenes/
├─ ScrollScene.ts
├─ LongListScene.ts
├─ NineSliceScene.ts
├─ CommandHelpScene.ts
├─ FocusModalScene.ts
├─ MessagePortraitScene.ts
└─ FontFallbackScene.ts
docs/adr/
├─ 0003-window-renderer-injection.md
├─ 0004-scroll-composition.md
└─ 0005-scene-focus-modal.md
docs/PHASE2_RELEASE_CHECKLIST.md
```

## 5. Dependency order

```text
100 renderer injection seam
101 wheel/page/drag input contract
  ├─ 110 ScrollController
  │    ├─ 111 ScrollableWindow + indicators
  │    │    ├─ 132 LogWindow
  │    │    └─ 133 DocumentWindow
  │    └─ 112 Selectable + scroll
  │         ├─ 113 optional scrollbar
  │         ├─ 114 visible-row virtualization
  │         └─ 130 CommandWindow → 131 HelpWindow
  └─ 120 NineSlice spike → 121 NineSlice renderer → 122 cursor theme

140 Scene focus controller → 141 modal capture

150 message tokens → 151 portrait → 152 auto-advance → 153 audio hooks
160 multi-font + fallback → 161 hot swap
170 a11y events
171 viewport layout helper

112 + 121 + 141 + 153 + 161 + 170 + 171
  → 180 remaining sandboxes
  → 181 Phase 2 docs / evidence gate
```

Independent branches may proceed in any order after their listed dependencies, but Composer still receives **one** task at a time.

## 6. WindowBase isolation rule

Every Phase 2 task is incomplete unless its report includes a short isolation proof:

1. `WindowBase` gained no fields, methods, or imports whose names or types mention scroll, skin, focus, portrait, command, log, document, or font-fallback.
2. Allowed `WindowBase` changes: generic seams already implied by Phase 1 (`createRenderer`, existing hooks `onLayoutChanged` / `onActiveChanged` / `onUpdate` / `onBeforeDestroy`). If a task needs a new generic hook, stop and add a plan amendment — do not invent it inside the task.
3. Derived-specific cleanup stays in the derived class or composed controller.

## 7. Cursor execution contract

Give Composer exactly one `TASK-*` section from this document. Prefix it with:

```text
Implement only the task below. First inspect docs/plan/IMPLEMENTATION_PLAN.md,
docs/plan/PHASE2_IMPLEMENTATION_PLAN.md, and the listed dependency files.
Do not implement later tasks, reopen Phase 1 decisions, or start Phase 3.
Do not copy RPG Maker MZ code or Window.png assets.
Use only bitmap-font artifacts from reusable_pixel_font_builder for displayed window text.
Do not use Phaser Text or system/web-font fallback.
Keep Phaser dependencies at adapter/window/renderer boundaries. Add focused tests.
Prove the WindowBase isolation rule in the completion report.
Run every Verification command and report exact results plus the Acceptance Criteria checklist.
If an API named in the plan does not exist in installed Phaser 4.2.1 types, stop and report the mismatch.
```

Composer may repair a directly caused type/test/build failure in files it changed. Broader refactors become a new plan task.

---

## 8. Tasks

## TASK-100 WindowRenderer injection seam

### Goal

Let a window supply its chrome renderer without `WindowBase` knowing about NineSlice or skins.

### Isolation

`WindowBase` may accept `createRenderer` and store `WindowRenderer`. It must not import `skin/` or NineSlice types.

### Files

- `src/core/WindowBase.ts`
- `src/core/WindowRenderer.ts` (factory type only if needed)
- `docs/adr/0003-window-renderer-injection.md`
- Focused existing renderer/base tests

### Required implementation

- Add `WindowBaseOptions.createRenderer?: (args) => WindowRenderer`.
- Default path remains today's `GraphicsWindowRenderer` + `createPhaserGraphicsFactory`.
- Child order stays background, frame, content, then derived overlays.
- Record the seam and rejected alternatives in ADR 0003 (skin implementation stays a later task).

### Acceptance Criteria

- [x] Existing Graphics windows behave as before with no option passed.
- [x] A test double renderer can be injected; `WindowBase` never constructs Graphics in that path.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-101 Wheel, page, and drag input contract

### Goal

Extend the semantic input adapter so scroll controllers can consume wheel, page, and pointer-drag without touching `WindowBase`.

### Isolation

Input types and adapters only. `WindowBase` unchanged.

### Files

- `src/input/types.ts`
- `src/input/WindowInputAdapter.ts`
- `src/input/PhaserWindowInput.ts`
- `tests/helpers/ManualWindowInput.ts`
- Focused input tests
- `examples/scenes/*` only if an existing scene must keep compiling

### Required implementation

- Add a documented wheel/drag event (or equivalent) with delta, pointer id, and timestamp. Reuse `pageUp` / `pageDown` actions already on the adapter.
- Phaser binding: if 4.2.1 has no wheel API on the Scene input plugin, stop and report; do not guess.
- `ManualWindowInput` can emit the new events for tests.
- Existing confirm/cancel/direction behavior is unchanged.

### Acceptance Criteria

- [x] Unit tests cover wheel delta, page actions, and drag start/move/end.
- [x] Dispose still unsubscribes the new listeners.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-110 Pure ScrollController

### Goal

Own scroll bounds, current/target offset, and page/wheel/drag steps with no Phaser types.

### Isolation

New `src/scroll/` module. No `WindowBase` edits.

### Files

- `src/scroll/types.ts`
- `src/scroll/ScrollController.ts`
- `tests/scroll/ScrollController.test.ts`

### Required implementation

- State: content size, viewport size, offset, optional target, axis (`y` first; `x` only if tests need it).
- Operations: `setContentSize`, `setViewportSize`, `setOffset`, `scrollBy`, `scrollTo`, page up/down, wheel step, clamp.
- Emit change events with unsubscribe. No Game Objects, no sounds.

### Acceptance Criteria

- [x] Offset never leaves `[0, max(0, content - viewport)]`.
- [x] Page/wheel steps and zero/negative sizes are tested.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-111 ScrollableWindow and overflow indicators

### Goal

A `WindowBase` subclass that applies `ScrollController` offset to content and draws up/down indicators.

### Isolation

`ScrollableWindow` composes `ScrollController`. `WindowBase` gains no scroll fields.

### Files

- `src/scroll/ScrollableWindow.ts`
- `tests/scroll/ScrollableWindow.test.ts` (structural / controller wiring)
- `examples/scenes/ScrollScene.ts`
- `examples/main.ts`
- `docs/adr/0004-scroll-composition.md`

### Required implementation

- Content children move by integer `-offset`.
- Indicators are derived overlays, not `WindowBase` chrome.
- Bind page/wheel/drag through the injected adapter and `canConsumeInput()`.
- ADR 0004 records composition (not `Scrollable → Selectable` inheritance).

### Acceptance Criteria

- [x] Content taller than the viewport can be scrolled; clipping still hides overflow.
- [x] Indicators reflect `canScrollUp` / `canScrollDown`.
- [x] Destroy unsubscribes input and destroys indicator objects.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=scroll`.

---

## TASK-112 Selectable + scroll composition

### Goal

Remove the Phase 1 “rows exceed content height” failure by composing `ScrollController` inside `SelectableWindow`.

### Isolation

Edits stay in `SelectableWindow` / selection tests. `WindowBase` unchanged.

### Files

- `src/selection/SelectableWindow.ts`
- `src/choice/ChoiceWindow.ts` only if a demonstrated settlement bug appears
- `tests/selection/*`
- `examples/scenes/LongListScene.ts`
- `examples/main.ts`

### Required implementation

- When rows overflow, enable a composed `ScrollController` and keep the selected row in view.
- Hit-testing uses content-local coordinates **plus** scroll offset.
- Keyboard/gamepad movement updates offset; pointer selects the visible row.
- `ChoiceWindow` with many items must not throw the Phase 1 overflow error.

### Acceptance Criteria

- [x] A list taller than the content rectangle constructs and scrolls.
- [x] Confirm/cancel still honor `canConsumeInput()`.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=long-list`.

---

## TASK-113 Optional scrollbar chrome

### Goal

Optional scrollbar for scrollable and selectable-overflow windows, owned by the scroll module.

### Isolation

No `WindowBase` scrollbar API.

### Files

- `src/scroll/ScrollbarRenderer.ts`
- Wiring in `ScrollableWindow` / `SelectableWindow` behind an option (default off)
- Focused tests
- Update `ScrollScene` / `LongListScene` to show the option

### Required implementation

- Integer-pixel track/thumb. Clicking the track pages; dragging the thumb sets offset.
- Hidden when content fits.
- Destroy path owns Graphics objects.

### Acceptance Criteria

- [x] Default windows have no scrollbar objects.
- [x] Enabled option keeps thumb position in sync with offset.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

---

## TASK-114 Visible-row virtualization

### Goal

Selectable lists create `BitmapText` / cursor work only for visible rows (plus a small overscan).

### Isolation

`SelectableWindow` only.

### Files

- `src/selection/SelectableWindow.ts`
- `tests/selection/*`
- `examples/scenes/LongListScene.ts`

### Required implementation

- Pool or recreate labels for the visible index range only.
- Controller still holds the full item list.
- 200-item scripted walk does not grow label count with list length.

### Acceptance Criteria

- [x] Label/Game Object count is bounded by viewport (plus overscan), not `items.length`.
- [x] Selection, confirm, and hit-test remain correct across the virtual window.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

---

## TASK-120 NineSlice spike

### Goal

Prove Phaser 4.2.1 NineSlice (or the actual 4.2.1 equivalent) can draw consumer-owned window chrome at integer sizes.

### Isolation

Example + ADR only. No production skin class yet.

### Files

- `examples/scenes/NineSliceScene.ts` (spike)
- `examples/main.ts`
- `docs/adr/0003-window-renderer-injection.md` (append verified APIs)

### Required implementation

- Load a **repo-owned or clearly licensed** placeholder atlas, not RMMZ `Window.png`.
- Exercise resize and openness. Record the exact Phaser 4.2.1 APIs used.
- If NineSlice is missing or blurry under `roundPixels`, stop and document the fallback (tiled Graphics, or “unsupported”).

### Acceptance Criteria

- [x] Spike scene runs in Chromium; ADR lists verified APIs and the fallback.
- [x] No RMMZ assets.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=nineslice`.

---

## TASK-121 NineSliceWindowRenderer

### Goal

Ship a `WindowRenderer` implementation that consumes a consumer-supplied texture key.

### Isolation

`src/skin/` only. `WindowBase` uses the TASK-100 factory.

### Files

- `src/skin/types.ts`
- `src/skin/NineSliceWindowRenderer.ts`
- Tests with Graphics-like fakes or structural spies
- `examples/scenes/NineSliceScene.ts` (replace spike with library usage)

### Required implementation

- Implement `WindowRenderer` (`resize`, `applyTheme`, `setOpenness`, `destroy`).
- Missing texture fails with a typed error. No silent Graphics fallback.
- Pixel sampling follows ADR 0002 (nearest, integer size).

### Acceptance Criteria

- [x] Consumer constructs `WindowBase` with `createRenderer` returning the NineSlice renderer.
- [x] `WindowBase` source still has no `skin/` import.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

---

## TASK-122 Cursor theme expansion

### Goal

Optional cursor blink and extra `CursorStyle` fields without moving cursor ownership into `WindowBase`.

### Isolation

`CursorStyle`, `CursorRenderer`, theme resolve. `WindowBase` unchanged except existing `setTheme` passthrough.

### Files

- `src/core/types.ts` (`CursorStyle` only)
- `src/core/theme.ts`
- `src/selection/CursorRenderer.ts`
- Theme / cursor tests

### Required implementation

- Additive fields only (for example `blinkPeriodMs`). Defaults preserve Phase 1 look.
- Blink is owned by `CursorRenderer.update`, not `WindowBase.update` logic.

### Acceptance Criteria

- [x] Existing choice/command cursors look unchanged when new fields are omitted.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-130 CommandWindow

### Goal

A selectable command list with application-owned ids/handlers. This library does not dispatch game commands.

### Isolation

New `src/command/`. Does not edit `WindowBase`.

### Files

- `src/command/CommandWindow.ts`
- `src/selection/types.ts` only if `SelectableItem` needs an optional `symbol` — prefer a dedicated command record instead
- `tests/command/CommandWindow.test.ts`
- `examples/scenes/CommandHelpScene.ts` (command half; help is TASK-131)

### Required implementation

- `chooseCommands(items)` returns a typed result like `ChoiceWindow`.
- Busy / empty / all-disabled errors match the Choice pattern.
- Long lists use TASK-112 scroll composition.

### Acceptance Criteria

- [x] Confirm returns the selected command record; cancel is explicit.
- [x] Application handlers are not invoked by this class.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

---

## TASK-131 HelpWindow

### Goal

A small `TextWindowBase` that shows help text for the current command/selection. Binding is application-owned.

### Isolation

`HelpWindow` has no back-pointer inside `WindowBase` or `CommandWindow` unless an optional callback is passed *into* `CommandWindow` by the scene.

### Files

- `src/help/HelpWindow.ts`
- Tests
- `examples/scenes/CommandHelpScene.ts`

### Required implementation

- `setHelp(text: string | null)` layouts BitmapText; empty clears.
- Scene example: on command highlight, the scene (not `WindowBase`) calls `setHelp`.

### Acceptance Criteria

- [x] Help text wraps with the existing layout rules and missing-glyph policy.
- [x] CommandWindow source has no hard dependency on HelpWindow types unless injected.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=command-help`.

---

## TASK-132 LogWindow

### Goal

Append-only log lines with scroll to the latest entry.

### Isolation

Composes `ScrollableWindow` / `ScrollController`. No `WindowBase` log API.

### Files

- `src/log/LogWindow.ts`
- Tests
- Sandbox scene or a section in `ScrollScene`

### Required implementation

- `append(line: string)` and optional `clear()`.
- Default: stick to bottom when the user is already at the bottom; do not yank if they scrolled up.
- All lines are BitmapText; missing glyphs throw.

### Acceptance Criteria

- [x] Many appends scroll; destroy cleans labels and scroll subscriptions.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-133 DocumentWindow

### Goal

A read-only wrapped document that scrolls.

### Isolation

Uses `TextWindowBase` + `ScrollController` or `ScrollableWindow`. No `WindowBase` document API.

### Files

- `src/document/DocumentWindow.ts`
- Tests
- Sandbox scene or `ScrollScene` sample

### Required implementation

- `setDocument(text: string)` layouts the full wrapped text and sets content height.
- Input: page/wheel/drag only (no typewriter).

### Acceptance Criteria

- [x] Text taller than the viewport scrolls and stays clipped.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-140 Scene-owned WindowFocusController

### Goal

Assign exclusive `active` to one window per Scene without a global singleton.

### Isolation

New `src/focus/`. `WindowBase` keeps `activate` / `deactivate`; it does not register itself globally.

### Files

- `src/focus/types.ts`
- `src/focus/WindowFocusController.ts`
- `tests/focus/WindowFocusController.test.ts`
- `docs/adr/0005-scene-focus-modal.md` (focus half)
- `examples/scenes/FocusModalScene.ts` (non-modal first)

### Required implementation

- `acquire(window)` / `release(window)` / `getActive()`.
- Deactivate the previous window; activate the new one.
- Scene shutdown releases all. Windows do not import the controller.

### Acceptance Criteria

- [x] Two windows cannot be active at once through the controller.
- [x] Destroyed windows are dropped from the controller.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-141 Modal capture

### Goal

Optional modal acquire: lower windows cannot consume input; optional dimmer is Scene-owned.

### Isolation

Focus module + example. Dimmer is not a `WindowBase` child unless the scene adds it.

### Files

- `src/focus/WindowFocusController.ts`
- ADR 0005 (modal policy)
- `examples/scenes/FocusModalScene.ts`

### Required implementation

- `acquire(window, { modal: true })` stacks; release pops.
- Policy: only the stack top has `canConsumeInput()` true **via deactivate**, not by `WindowBase` knowing about modality.
- Dimmer Graphics is created/destroyed by the controller or the scene — pick one owner and document it. Prefer the scene if ownership is ambiguous.

### Acceptance Criteria

- [x] Under a modal, background windows ignore confirm/cancel.
- [x] Restart/shutdown settles and does not leak dimmer objects.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=focus-modal`.

---

## TASK-150 Message token extensions

### Goal

Add a small, documented `{token}` set: color and speed. No RMMZ `\` codes.

### Isolation

Parser / `TextState` / `MessageController` / `MessageWindow`. `WindowBase` unchanged.

### Files

- `src/message/types.ts`
- `src/message/MessageParser.ts`
- `src/message/TextState.ts`
- `src/message/MessageController.ts`
- `src/message/MessageWindow.ts` (multi-run tint if required)
- Existing message tests

### Required implementation

- `{color:RRGGBB}` and `{speed:n}` (chars/sec). Unknown tokens remain literal text (Phase 1 behavior).
- Color may require multiple `BitmapText` runs. Still no Phaser `Text`.
- Document the syntax in the task report; user-facing docs land in TASK-181.

### Acceptance Criteria

- [x] Parser/state tests cover color/speed and unknown tokens.
- [x] No RMMZ control-code compatibility.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-151 Portrait slot

### Goal

Optional speaker portrait in `MessageWindow` using a consumer-loaded texture.

### Isolation

`MessageWindow` only. `WindowBase` has no portrait API.

### Files

- `src/message/MessageWindow.ts`
- Message types/options
- `examples/scenes/MessagePortraitScene.ts`
- `examples/main.ts`

### Required implementation

- Option such as `portrait: { textureKey, frame?, width, height }` using `Image`/`Sprite` in the content container.
- Text layout width shrinks by the reserved portrait column.
- Missing texture: typed error. Destroy removes the portrait object.

### Acceptance Criteria

- [x] `say` without portrait is unchanged.
- [x] Portrait is clipped with content; integer positions.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=message-portrait`.

---

## TASK-152 Auto-advance

### Goal

Optional auto mode that advances pages/completion without confirm after a delay.

### Isolation

`MessageController` / `MessageWindow` options.

### Files

- Message controller/window/options
- Tests
- Message or portrait sandbox flag

### Required implementation

- `autoAdvanceMs?: number`. Confirm still works and wins.
- Pause tokens still wait for confirm unless a documented auto-pause option is set (default: honor pause).
- Destroy/cancel still settles once.

### Acceptance Criteria

- [x] Auto path and confirm-interrupt path are tested.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-153 Audio hook callbacks

### Goal

Optional typed callbacks on message/selection events. No audio engine.

### Isolation

Derived windows / controllers. `WindowBase` does not play or load sounds.

### Files

- Option types on message/selection/choice/command
- Tests that spies are called once per event and not after destroy

### Required implementation

- Hooks such as `onType`, `onPage`, `onConfirm`, `onCancel`.
- Application supplies the function; this library never imports a sound plugin.

### Acceptance Criteria

- [x] Hooks are optional and not invoked after destroy.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-160 Multiple font keys and explicit fallback

### Goal

Application-supplied fallback chain across **builder** fonts only.

### Isolation

Text layout / measurer / `TextWindowBase`. `WindowBase` has no font map.

### Files

- `src/text/types.ts`
- `src/text/TextLayout.ts` / measurer / `TextWindowBase`
- Tests
- `examples/scenes/FontFallbackScene.ts`

### Required implementation

- Config: `fontKeys: readonly string[]` (primary first).
- Missing glyph in primary tries the next key; if all fail, `MissingBitmapGlyphError` with code point and tried keys.
- Never load or mention a system/web font.

### Acceptance Criteria

- [x] Fallback succeeds only onto another loaded builder key.
- [x] Exhaustion throws; no silent tofu from a system font.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=font-fallback` (may use one font twice if a second artifact is not in-repo; document that).

---

## TASK-161 Font hot swap

### Goal

Change the active font key when no window operation is in flight.

### Isolation

`TextWindowBase` / message / selectable. During `say`/`choose`, reject with a typed busy error.

### Files

- Text/message/selection windows
- Tests

### Required implementation

- `setFontKey(key: string)` remesures and relayouts when idle.
- In-flight operations reject the swap (do not tear down mid-Promise).
- Still no system-font fallback.

### Acceptance Criteria

- [x] Idle swap relayouts; busy swap rejects once and leaves the operation intact.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-170 Accessibility semantic events

### Goal

Documented, typed events an application can feed to its own a11y layer.

### Isolation

Library-owned callbacks/events. No DOM, no Phaser EventEmitter as the public domain API.

### Files

- Small event types (core or a11y module)
- Wiring on open/close, selection change, message page
- Tests
- API notes for TASK-181

### Required implementation

- Events: window opened/closed, selection changed, message page/complete, focus acquired/released.
- Unsubscribe on destroy.

### Acceptance Criteria

- [x] Events fire with enough fields for a consumer captioner; no DOM nodes created.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-171 Viewport layout helper

### Goal

Pure function that maps camera/viewport rectangles to integer window bounds.

### Isolation

`src/layout/viewportLayout.ts`. `WindowBase` is not subscribed to resize.

### Files

- `src/layout/viewportLayout.ts`
- Tests
- One sandbox uses the helper (for example message + choice)

### Required implementation

- Input: viewport size, anchors (bottom-center, etc.), requested size, margin.
- Output: integer `{ x, y, width, height }` suitable for `setPosition` / `setSize`.
- Scene calls the helper; windows do not listen to the camera.

### Acceptance Criteria

- [x] Rounding is integer; tiny viewports fail with `WindowLayoutError` rather than a non-positive content box.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

---

## TASK-180 Remaining sandboxes and wiring

### Goal

Ensure every Phase 2 scene is reachable and uses BitmapText for on-canvas logs.

### Isolation

Examples + `main.ts` only, unless a demonstrated integration defect appears.

### Files

- `examples/main.ts`
- Any missing scenes listed in §4
- Existing scenes that must keep working

### Required implementation

- Query-param routes for all Phase 2 scenes.
- Shared font preload; no Phaser `Text`.
- Fix only demonstrated integration defects.

### Acceptance Criteria

- [x] Every scene URL in §10 loads without creating Phaser `Text`.
- [x] Isolation proof recorded.
- [x] `bun run check` passes.

### Verification

```bash
bun run check
bun run dev
```

---

## TASK-181 Phase 2 public API, docs, and evidence gate

### Goal

Export the stable Phase 2 surface and record evidence. Do not publish.

### Isolation

Docs/package only, plus `src/index.ts` exports.

### Files

- `src/index.ts`
- `README.md`
- `docs/API.md`
- `docs/PHASE2_RELEASE_CHECKLIST.md`
- This file (final gate)

### Required implementation

- Export scroll, skin, focus, command, help, log, document, layout helpers that landed.
- Document new options, errors, Scene focus ownership, skin asset rules, fallback policy.
- Checklist: automated gate + every browser scene + known limits.
- Do not tag or publish.

### Acceptance Criteria

- [x] Consumer can import new public symbols from package exports.
- [x] README/API cover Phase 2 additions.
- [x] Checklist rows are checked or blocked with evidence.
- [x] Isolation proof recorded (barrel does not re-export internals accidentally).
- [x] `bun run check` passes.

### Verification

```bash
bun run check
```

Also inspect `dist/` and the documented consumer example.

---

## 9. Risk register (Phase 2 additions)

| Risk | Early control | Fallback |
|---|---|---|
| NineSlice missing or filtered wrongly in 4.2.1 | TASK-120 spike | Document unsupported; keep Graphics renderer |
| Wheel API mismatch | TASK-101 stop-the-line | Keyboard page only until a follow-up task |
| Scroll + selection coordinate bugs | Content-local + offset tests before sandbox polish | Disable pointer on overflow until fixed |
| Virtualization off-by-one | Overscan + 200-item scripted walk | Keep full labels; defer TASK-114 |
| Focus double-activate with `say()` auto-activate | Controller is exclusive assigner; windows keep hooks | Document “do not mix unmanaged activate with controller” |
| Color tokens vs single BitmapText tint | Multi-run BitmapText in MessageWindow | Defer color token; keep speed only |
| Second builder font not in repo | FontFallbackScene documents single-key limitation | TASK-160 tests use measurer fakes |
| Scope creep (inventory, RMMZ codes) | One-task execution | New ideas go to Phase 3 backlog |

## 10. Phase 2 acceptance matrix

| Capability | Automated evidence | Browser evidence |
|---|---|---|
| Renderer injection | TASK-100 tests | Existing window-base still Graphics |
| Wheel/page/drag | TASK-101 tests | Scroll / long-list scenes |
| Scroll clamp + indicators | TASK-110/111 tests | `?scene=scroll` |
| Long selectable list | TASK-112/114 tests | `?scene=long-list` |
| Optional scrollbar | TASK-113 tests | scroll / long-list with option |
| NineSlice chrome | TASK-120/121 + ADR 0003 | `?scene=nineslice` |
| Command + help | TASK-130/131 tests | `?scene=command-help` |
| Log / document | TASK-132/133 tests | scroll scene samples |
| Focus / modal | TASK-140/141 tests + ADR 0005 | `?scene=focus-modal` |
| Tokens / portrait / auto / audio hooks | TASK-150–153 tests | `?scene=message-portrait` |
| Font fallback / hot swap | TASK-160/161 tests | `?scene=font-fallback` |
| A11y events / viewport helper | TASK-170/171 tests | Documented in API |
| Package surface | TASK-181 | N/A |

Phase 2 is not complete when only unit tests pass: every browser-evidence row must also be recorded in `docs/PHASE2_RELEASE_CHECKLIST.md`.

## 11. Phase 3 backlog (not authorized)

- `ItemListWindow`, `SettingsWindow`, inventory bindings
- Dedicated `ScrollableSelectableWindow` subclass (composition is the Phase 2 answer)
- Custom input-adapter cookbook beyond `PhaserWindowInput`
- Advanced CJK kinsoku, bidi, icon-atlas inline tokens
- DOM/screen-reader overlay
- Sound manager and localization system

## 12. Final gate (Phase 2 closed)

- [x] TASK-100 … TASK-181 acceptance criteria are checked or explicitly blocked with evidence — see [PHASE2_RELEASE_CHECKLIST.md](../PHASE2_RELEASE_CHECKLIST.md). Chromium visual rows observed 2026-08-29.
- [x] [PHASE2_RELEASE_CHECKLIST.md](../PHASE2_RELEASE_CHECKLIST.md) exists and browser rows are recorded (Chromium observed 2026-08-29 / a11y N/A / package automated).
- [x] No Phase 3 implementation has been started.
- [x] `WindowBase` still has no scroll, skin, focus, portrait, or command-specific API.

Phase 2 is visually closed. Do not publish or tag. Detailed Phase 3 tasks remain unauthorized.
