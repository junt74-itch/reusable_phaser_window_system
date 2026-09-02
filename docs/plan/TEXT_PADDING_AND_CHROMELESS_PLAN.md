# Text padding & chromeless window — implementation plan

Last reviewed: 2026-08-29  
Execution target: one task at a time (do not start TASK-N+1 until TASK-N acceptance is checked)  
Prerequisite: Phase 2 is closed. Do not reopen [PHASE2_IMPLEMENTATION_PLAN.md](PHASE2_IMPLEMENTATION_PLAN.md) decisions.

This document authorizes two consumer-facing capabilities only:

1. 文字表示の inset（padding）を構築時・実行時に設定できる
2. 下地のウインドウ画像 / Graphics chrome をナシにできる

Normative consumer docs after landing are [`../SPECIFICATION.md`](../SPECIFICATION.md) and [`../API.md`](../API.md). This file is a maintainer work order, not a public API.

## 0. Handoff for the implementing agent

Copy this block as the implementation prompt:

```text
docs/plan/TEXT_PADDING_AND_CHROMELESS_PLAN.md を唯一の作業指示とする。
TASK-210 から順に 1 タスクずつ実装し、各タスクの Acceptance を満たしてから次へ進む。
Phase 2 の決定（WindowBase は skin を import しない、chrome は createRenderer 経由、BitmapText のみ）を再オープンしない。
BitmapTextStyle に第二の padding を足さない。Window.png / RMMZ 互換を主張しない。
完了条件は bun run check と、指定 sandbox のブラウザ確認である。
```

Do not implement from conversation memory. If this plan and the code disagree, the plan's **Fixed decisions** win; if a decision is infeasible, stop and report — do not invent a third padding or a `WindowBase.setBackgroundImage` API.

---

## 1. Outcome

A consumer can write:

```ts
const theme = resolveWindowTheme({
  padding: { top: 16, right: 20, bottom: 16, left: 20 },
  chromeVisible: false,
  text: { fontKey: DEFAULT_BITMAP_FONT_ASSET.key },
});

const overlay = new MessageWindow(scene, { x: 40, y: 360, width: 520, height: 120, theme }, {
  input,
  ownsInput: true,
  createRenderer: createNullWindowRenderer,
});

overlay.setPadding(8);
overlay.setTheme({ chromeVisible: true }); // no-op visually if Null renderer; Graphics/NineSlice honor it
```

and all of the following hold:

- BitmapText / row labels / log / document lines sit inside the padded content rectangle (not the outer window bounds).
- Wrap width, speaker/portrait reserved space, selection rows, and scroll viewport all use that same content rectangle.
- `padding: 0` is valid; oversized padding still throws `WindowLayoutError`.
- A window can have **no chrome texture and no Graphics fill/stroke** (Null renderer), without loading a skin.
- Graphics and NineSlice chrome can be hidden at runtime via `chromeVisible: false` without destroying the window.
- `WindowBase` still does not import `skin/`, NineSlice, portraits, or scroll types.

## 2. Current state (do not re-implement blindly)

### 2.1 Padding already exists — it is incomplete as a public contract

| Existing piece | Location | Gap |
|---|---|---|
| `WindowTheme.padding` / `ResolvedWindowTheme.padding` | `src/core/types.ts` | Documented as a theme field in API.md, but **`setPadding` is not in the lifecycle table** |
| `resolvePadding` / default `{12,12,12,12}` | `src/core/theme.ts` | Defaults and four-sided form work |
| `computeContentBounds` | `src/core/theme.ts` | Unit-tested |
| `WindowBase.setPadding` | `src/core/WindowBase.ts` | Exists, relayouts, **no `getPadding()`**, **no unit test**, **not in API.md methods** |
| Content container positioned at padding origin | `WindowBase` constructor / `relayout` | Correct |
| Text layout width = `getContentBounds().width` | `TextWindowBase`, `MessageWindow`, `HelpWindow` | Correct if padding is set |
| Log / document wrap width = content width | `LogWindow`, `DocumentWindow` | Same |
| Selection row geometry | `SelectableWindow.relayoutRows` | Uses content bounds; `onLayoutChanged` already relayouts |

**Interpretation of the request:** the user wants to *set text display padding*. That is this existing window content padding, not a new `text.padding`. Text, cursor, portrait, scrollbar, and clip all share one inner rectangle. A second inset on `BitmapTextStyle` would miss `LogWindow` / `DocumentWindow` (they do not extend `TextWindowBase`) and would split one layout concept into two.

### 2.2 Chrome cannot be omitted today

| Path | Behavior | Gap |
|---|---|---|
| Default `GraphicsWindowRenderer` | Always `fillRect` + optional `strokeRect` | `backgroundAlpha: 0` + `borderWidth: 0` can *look* empty but still allocates Graphics children and is not a semantic “no window image” |
| `createNineSliceWindowRenderer` | Requires a loaded texture; `applyTheme` is a no-op | Cannot construct without an image; cannot hide the NineSlice at runtime |
| Injected test doubles | TASK-100 seam | No public Null renderer |

**Interpretation of the request:** 「下地のウインドウ画像をナシに」= the window skin / Graphics underlay is absent so only content (text, cursor, portrait) remains. NineSlice in this repo is a **single** chrome object (not RMMZ Window.png regions), so “hide 下地 only, keep 枠” is **out of scope** for NineSlice. Graphics already allows fill-off / stroke-on via `backgroundAlpha: 0` with `borderWidth > 0`.

## 3. Fixed decisions

Composer must not reopen these unless an acceptance criterion proves them infeasible.

| Topic | Decision |
|---|---|
| One padding | Content inset is `theme.padding` / `setPadding` / `getPadding` only. **Do not** add `BitmapTextStyle.padding`, `MessageSayOptions.padding`, or per-glyph padding. |
| Who honors padding | All content children (text, speaker, portrait, rows, log/document labels, cursor, scrollbar, clip). Outer `width`/`height` stay the chrome rectangle. |
| Default padding | Keep `{ top: 12, right: 12, bottom: 12, left: 12 }`. Zero is allowed. Negative / non-finite still `WindowConfigError`. Non-positive content area still `WindowLayoutError`. |
| Integer pixels | Do not newly require integer padding if current validation is non-negative finite. Render positions stay `Math.trunc` as today. |
| Chromeless construction | Public `createNullWindowRenderer` in `core/`, passed through existing `WindowBaseOptions.createRenderer`. No texture, no fill, no stroke. |
| Chromeless runtime | `WindowTheme.chromeVisible?: boolean` resolved to `ResolvedWindowTheme.chromeVisible` (default `true`). Graphics and NineSlice honor it. Null renderer stays empty regardless. |
| Isolation | `WindowBase` does not import `skin/` or Null-specific types beyond the generic renderer interface. Null lives in `core/`. NineSlice still constructed only via consumer factory. |
| No WindowBase chrome API | Do **not** add `setBackgroundImage`, `setWindowSkin`, `hideFrame`, or `opacity`. Chrome remains renderer + theme. |
| NineSlice split fill/frame | Out of scope. `chromeVisible: false` hides the whole NineSlice. |
| Graphics fill vs frame | Unchanged: `backgroundAlpha` / `borderWidth` still control fill vs stroke when `chromeVisible === true`. |
| Skin assets | Still consumer-owned. No RMMZ `Window.png`. Null path must not load placeholder textures. |
| Text | BitmapText only. No Phaser `Text`. |
| Phase 3 | Do not start ItemList / inventory / DOM a11y. |

### Rejected alternatives

- **`text.padding` in addition to window padding** — duplicates layout; Log/Document would not inherit it unless copied; wrap width would disagree with clip.
- **Optional `textureKey` on NineSlice that silently skips drawing** — hides missing-asset errors; violates “no silent fallback”.
- **`backgroundAlpha: 0` as the only NineSlice hide** — semantically a Graphics fill alpha; NineSlice is the whole chrome; still requires a loaded texture.
- **Subclass `ChromelessWindow`** — duplicates geometry/clip/lifecycle.
- **`WindowBase` flag `drawChrome`** — folds renderer policy into the base class and breaks ADR 0003.

## 4. Target API (after landing)

### 4.1 Padding

```ts
// construct
new MessageWindow(scene, {
  x, y, width, height,
  theme: { padding: 8 }, // or { top, right, bottom, left }
});

// runtime
window.setPadding(0);
window.setPadding({ top: 8, right: 16, bottom: 8, left: 16 });
const padding = window.getPadding(); // copy, not the live object
```

`setPadding` already relayouts. After this work it must remain the padding-only path (do not force a full `setTheme` merge that drops other fields). `setTheme({ padding })` continues to work.

`getContentBounds()` remains the derived rectangle; do not change its meaning.

### 4.2 Chromeless

```ts
import {
  createNullWindowRenderer,
  createNineSliceWindowRenderer,
} from "reusable-phaser4-window-system";

// never load a window image
new HelpWindow(scene, config, { createRenderer: createNullWindowRenderer });

// hide / show existing Graphics or NineSlice chrome
window.setTheme({ chromeVisible: false });
window.setTheme({ chromeVisible: true });
```

`createNullWindowRenderer` must be a `WindowRendererFactory` (same signature as `createDefaultGraphicsWindowRenderer`).

## 5. Tasks

Implement in order. Each task ends with `bun run check` unless noted.

---

## TASK-210 Content padding contract

### Goal

Make four-sided content padding a complete, tested, documented public contract that every text-bearing window already uses (and fix any window that lays out against outer width).

### Isolation

Edits stay in `core` types/theme/`WindowBase`, tests, and API docs. Do not add text-module padding fields. Do not change renderer drawing.

### Files (expected)

- `src/core/types.ts` — only if a doc comment on `WindowPadding` should state it insets **content** (text and all inner chrome)
- `src/core/WindowBase.ts` — add `getPadding(): WindowPadding` returning `{ ...this.theme.padding }`
- `src/core/theme.ts` — only if a comment or test helper is needed; do not change defaults
- `tests/core/theme.test.ts` — keep existing cases; add `chromeVisible` in TASK-211, not here
- `tests/core/padding.contract.test.ts` **(new)** — see tests below
- `docs/API.md` — document `setPadding` / `getPadding` and a four-sided example under テーマ
- Source-scan assertions that layout paths use `getContentBounds()` (not outer width)

### Required implementation

1. Add `getPadding()`. Read-only; do not throw on destroyed if sibling getters (`getContentBounds`) do not.
2. Audit and, if needed, fix any text layout that uses `this.width` / outer bounds instead of `getContentBounds()`. Known-good today: `TextWindowBase.getTextLayoutWidth/Height`, `MessageWindow` portrait-adjusted width, `HelpWindow`, `SelectableWindow.relayoutRows`, `LogWindow.rebuildLabels`, `DocumentWindow.rebuildLabels`.
3. Confirm `setPadding` calls `relayout()` so `onLayoutChanged` rebuilds message pages, help, rows, log, document. Do not skip `MessageWindow` / `SelectableWindow` / `LogWindow` / `DocumentWindow`.
4. `setPadding` must not call `renderer.applyTheme` unless padding starts affecting chrome (it must not).

### Tests

- `getPadding` returns a copy; mutating the copy does not change the next `getPadding()`.
- Uniform number and four-sided object both round-trip through `resolveWindowTheme` + `computeContentBounds` (existing tests may already cover resolve; add WindowBase-level if you can without booting Phaser — source-level + theme tests are acceptable).
- Source contract: `TextWindowBase`, `MessageWindow`, `HelpWindow`, `LogWindow`, `DocumentWindow`, `SelectableWindow` contain `getContentBounds()` in their layout methods and do **not** layout text with a raw outer `this.width` (allow `setSize` / config).
- Existing `computeContentBounds` non-positive case remains.

Do not boot a full Phaser.Game unless an existing helper already does.

### Acceptance Criteria

- [ ] `getPadding()` exists and returns a copy of four-sided padding
- [ ] API.md documents construct-time `theme.padding`, `setPadding`, `getPadding`, zero padding, and `WindowLayoutError`
- [ ] Source/unit tests prove text-bearing windows layout against content bounds
- [ ] No second padding field on `BitmapTextStyle`
- [ ] `bun run check` passes
- [ ] Isolation: `WindowBase` still has no `skin/` import

### Verification

```bash
bun run check
```

---

## TASK-211 Chromeless renderer + `chromeVisible`

### Goal

1. Public Null renderer: no texture, no fill, no stroke, content still clips and receives input.
2. Theme flag `chromeVisible` (default `true`) hides Graphics fill+stroke and NineSlice chrome at runtime.

### Isolation

- Null renderer in `src/core/`, not `src/skin/`.
- `NineSliceWindowRenderer.applyTheme` may read `theme.chromeVisible` only. It still must not recolor the atlas from `backgroundColor`.
- `WindowBase` continues to call `renderer.applyTheme(this.theme)` from `setTheme` (already does). Do not add `setChromeVisible` on `WindowBase`.

### Files (expected)

- `src/core/types.ts` — `chromeVisible?: boolean` on `WindowTheme`; `chromeVisible: boolean` on `ResolvedWindowTheme`
- `src/core/theme.ts` — default `true`; `false` must not be dropped by `??` (use `partial.chromeVisible ?? true` or equivalent)
- `src/core/NullWindowRenderer.ts` **(new)** — `createNullWindowRenderer`
- `src/core/windowRendererFactory.ts` — optional re-export only if it keeps the default Graphics path unchanged
- `src/core/GraphicsWindowRenderer.ts` — skip fill/stroke (and `setVisible(false)` on background/frame) when `chromeVisible === false`; restore when `true`
- `src/skin/NineSliceWindowRenderer.ts` — `chrome.setVisible(theme.chromeVisible)` in `applyTheme`; still throw `MissingWindowSkinError` if texture missing at construct
- `src/index.ts` — export `createNullWindowRenderer`
- `tests/core/theme.test.ts` — default true; explicit false preserved
- `tests/core/GraphicsWindowRenderer.test.ts` — no `fillRect` / `strokeRect` when hidden; redraw when shown again
- `tests/core/NullWindowRenderer.test.ts` **(new)**
- `tests/skin/NineSliceWindowRenderer.test.ts` — source assertion that `applyTheme` uses `chromeVisible` / `setVisible`
- `docs/adr/0006-chromeless-renderer.md` **(new)**

### Required implementation

**Null renderer**

- Implements `WindowRenderer`.
- `background` / `frame` are no-op `GraphicsLike` (do **not** parent Graphics or NineSlice to `root`).
- Prefer extracting a tiny `NoopGraphics` in `core/` and reuse it from NineSlice's current private `UnusedChromeGraphics` to avoid two stubs. If that refactor is noisy, duplicating a 20-line stub in Null only is acceptable; **do not** import from `skin/` into `core/`.
- `resize` / `applyTheme` / `setOpenness` are no-ops (openness presentation remains `WindowBase` root `scaleY`).
- `destroy` is idempotent.
- Factory: `createNullWindowRenderer(context: WindowRendererFactoryContext): WindowRenderer`. May ignore `context` except for typing.

**Graphics**

- `chromeVisible === false`: `clear()` both parts, do not fill/stroke, `setVisible(false)`.
- `chromeVisible === true`: `setVisible(true)` and existing redraw. `backgroundAlpha: 0` still draws a transparent fill (existing behavior); do not redefine it as chromeless.

**NineSlice**

- Construction unchanged (texture required).
- `applyTheme`: `this.chrome.setVisible(theme.chromeVisible)` (and keep size).
- Constructor should apply initial visibility after first `WindowBase` `applyTheme` (already called post-construct). If the NineSlice is visible for one frame, call `setVisible` in `applyTheme` only — `WindowBase` already `applyTheme`s in the constructor. Verify order: renderer construct → `resize` → `applyTheme`. If NineSlice is added visible before `applyTheme`, set `chrome.setVisible(false)` only inside `applyTheme` when the theme says so; acceptable one-frame flash is **not** acceptable — initialize visibility in the constructor from a default `true`, then `applyTheme` immediately after (existing WindowBase order). No constructor theme is passed to the renderer factory today; rely on `applyTheme` happening in the same constructor turn before the first render. Do not change `WindowRendererFactoryContext` unless tests prove a flash.

**Theme merge**

- `setTheme({ chromeVisible: false })` then `setTheme({ padding: 8 })` must **keep** `chromeVisible: false` because `WindowBase.setTheme` spreads `this.theme`. Confirm `ResolvedWindowTheme` includes `chromeVisible` so the spread retains it.
- `resolveWindowTheme({ ...resolved, ...partial })` used by `setPadding` (`{ ...this.theme, padding }`) must keep `chromeVisible`.

### Tests

- Default theme `chromeVisible === true`.
- `resolveWindowTheme({ chromeVisible: false }).chromeVisible === false`.
- Graphics: hidden → no `fillRect`/`strokeRect` after redraw; shown → fill returns.
- Null: factory does not call `scene.add.graphics` / `nineslice` (source test and/or stubbed context with call counters).
- Isolation: `WindowBase.ts` still has no `NullWindowRenderer` import if the default path stays `resolveWindowRenderer` → Graphics. Exporting from `src/index.ts` is required; WindowBase must not special-case Null.
- `MissingWindowSkinError` still thrown for NineSlice missing texture even if the consumer intends to hide chrome later.

### ADR 0006

Record:

- Context: consumers need overlay text without Window image / Graphics fill.
- Decision: Null factory + `chromeVisible`; not a WindowBase flag.
- Rejected alternatives (section 3).
- Phaser 4.2.1: Null adds no Game Objects; NineSlice `setVisible`; Graphics `clear` + `setVisible`.
- Isolation proof: `WindowBase` has no `skin/` import.

### Acceptance Criteria

- [ ] `createNullWindowRenderer` is exported from `src/index.ts`
- [ ] `chromeVisible` default true; false hides Graphics and NineSlice chrome
- [ ] Null path requires no texture and does not throw `MissingWindowSkinError`
- [ ] ADR 0006 exists
- [ ] `bun run check` passes

### Verification

```bash
bun run check
```

---

## TASK-212 Sandbox, consumer fixtures, docs index

### Goal

Demonstrate both features in the browser sandbox and keep package/consumer typecheck green.

### Isolation

Sandbox only in `examples/`. Do not put demo key bindings on `WindowBase`.

**Baseline already in tree:** `examples/scenes/PaddingChromeScene.ts` is registered as `?scene=padding-chrome`. It previews **current** APIs (`setPadding`, Graphics `backgroundAlpha`/`borderWidth` = 0). The implementer must upgrade that scene to `chromeVisible` and `createNullWindowRenderer` rather than creating a second scene. Do not remove the route.

### Files (expected)

- `examples/scenes/PaddingChromeScene.ts` **(new)**
- `examples/sceneKeys.ts` — add `"padding-chrome"` (not necessarily inside `PHASE2_SCENE_KEYS`; add to `ALL_SCENE_KEYS`)
- `examples/main.ts` — register the scene
- `tests/examples/scene-routes.test.ts` — will fail until `main.ts` + `ALL_SCENE_KEYS` match; keep that invariant
- `examples/consumer/phase2-surface.ts` — import `createNullWindowRenderer` so consumer typecheck covers it
- `tests/package/public-exports.test.ts` — add `createNullWindowRenderer` to `EXPECTED_EXPORTS`
- `docs/API.md` — Null renderer example next to NineSlice; `chromeVisible` in the theme list
- `docs/SPECIFICATION.md` — one sentence under Extension points: chrome may be Null or hidden via theme
- `docs/README.md` — no need to advertise the plan to game consumers
- `README.md` (repo root) — add `?scene=padding-chrome` only if other scenes are listed there; keep the list consistent
- `docs/PHASE2_RELEASE_CHECKLIST.md` — **do not rewrite Phase 2 history**. Add a short “Follow-up (padding / chromeless)” subsection with unchecked browser row for the new scene, or a new `docs/PADDING_CHROME_CHECKLIST.md` if you want isolation from Phase 2. Prefer a **new** `docs/PADDING_CHROME_CHECKLIST.md` so Phase 2 evidence stays frozen.

### Sandbox behavior (`?scene=padding-chrome`)

Single scene, two windows side by side (or stacked), BitmapText log (no Phaser `Text`):

1. **MessageWindow** (or HelpWindow) with default Graphics chrome. Keys:
   - `[` / `]` — decrease / increase uniform padding by 4 (clamp 0 .. max that still layouts)
   - `0` — `setPadding(0)`
   - `H` — toggle `chromeVisible`
2. **NineSlice MessageWindow or WindowBase+Help** using the existing placeholder skin (`PLACEHOLDER_WINDOW_SKIN_KEY` from NineSliceScene — reuse constants, do not duplicate provenance). Keys can be shared or use `N` to toggle that window's `chromeVisible`.
3. **Third optional overlay** constructed with `createNullWindowRenderer` showing a short BitmapText / Help string so “no image loaded for this window” is visible. This window must **not** call `this.load.image` for itself.

On-canvas log must show current padding values and chromeVisible.

Preload: `preloadDefaultBitmapFont`; load placeholder skin only for the NineSlice instance.

### Consumer / package

- `createNullWindowRenderer` in public exports test
- `phase2-surface.ts` (or a small addition) references the factory so `bun run typecheck:consumer` fails if the export is missing
- Do not add the new scene key to `PHASE2_SCENE_KEYS` unless you also want it in the Phase 2 list; `ALL_SCENE_KEYS` is required

### Acceptance Criteria

- [ ] `?scene=padding-chrome` boots via `examples/main.ts`
- [ ] Scene routes test passes
- [ ] Public export + consumer typecheck include Null factory
- [ ] API.md + SPECIFICATION.md updated
- [ ] Evidence checklist file exists with a row for `?scene=padding-chrome`
- [ ] `bun run check` passes

### Verification

```bash
bun run check
bun run dev
```

Manual: `http://localhost:5173/?scene=padding-chrome`

- Padding 12 → 0: text moves toward the outer edge; wrap may gain characters per line.
- Padding large: text inset; `WindowLayoutError` must not occur for the keyed range you implement (clamp in the scene).
- `H`: Graphics fill/border disappear; text remains.
- NineSlice toggle: window image disappears; text remains.
- Null overlay: never shows a window image.

If browser tools are available, exercise the keys end-to-end (not screenshot-only). If not, record that the operator must run the URL.

---

## TASK-213 Final gate

### Goal

Close the work order without Phase 3 scope creep.

### Required

- [ ] TASK-210 … TASK-212 acceptance checkboxes in **this** file updated to `[x]` by the implementer
- [ ] `bun run check` green
- [ ] Browser row recorded on the follow-up checklist
- [ ] `WindowBase` still has no `skin/`, `NineSlice`, `ScrollController`, focus, portrait, command, log, document, or a11y APIs
- [ ] No `BitmapTextStyle.padding`
- [ ] Archived Phase 1/2 plans under `docs/plan/` were not rewritten except if a one-line pointer is absolutely required (prefer not)

### Verification

```bash
bun run check
```

---

## 6. Documentation map (implementer)

| Document | Change |
|---|---|
| `docs/API.md` | padding methods; `chromeVisible`; Null renderer example |
| `docs/SPECIFICATION.md` | chrome may be absent |
| `docs/adr/0006-chromeless-renderer.md` | new |
| `docs/adr/0003-window-renderer-injection.md` | optional one-line “see also ADR 0006”; do not change the original decision |
| `docs/plan/README.md` | this file listed under Active plans (already done when the plan was filed) |
| `docs/PADDING_CHROME_CHECKLIST.md` | new evidence file |
| Phase 2 checklist / plans | do not uncheck or rewrite completed Phase 2 tasks |

## 7. Isolation proof (must remain true)

`tests/examples/scene-routes.test.ts` TASK-180 isolation and `tests/skin/NineSliceWindowRenderer.test.ts` “WindowBase has no skin import” must stay green.

Allowed `WindowBase` seams remain: `createRenderer`, `subscribeTransition`, geometry, theme, padding, visibility, input adapter injection.

Forbidden: `WindowBase` knowing Null vs Graphics vs NineSlice.

## 8. Risk register

| Risk | Control | Fallback |
|---|---|---|
| Implementer adds `text.padding` | Fixed decision in §3; TASK-210 AC forbids it | Revert the field |
| `setTheme` shallow merge drops nested `text` | Existing behavior; do not “fix” as part of this work unless a test already requires it | Out of scope |
| `chromeVisible: false` lost after `setPadding` | TASK-211 merge test | Put `chromeVisible` on `ResolvedWindowTheme` |
| NineSlice one-frame flash | Constructor order already `resize` then `applyTheme` | Set visible in `applyTheme` first line |
| Consumers think Null + `chromeVisible: true` draws Graphics | API.md states Null never draws chrome; toggle needs a Graphics/NineSlice renderer | Document only |
| Scope: hide NineSlice center, keep border | Explicitly out of scope | Graphics `backgroundAlpha: 0` |

## 9. Out of scope

- Per-side chrome slice (RMMZ Window.png background vs frame regions)
- `ItemListWindow`, settings, inventory
- Changing default padding from 12
- Camera-follow padding
- CSS/DOM padding
- Recoloring NineSlice from `backgroundColor`

## 10. Suggested commit shape (only if the user asks to commit)

Do not commit unless the user requests it. If they do, prefer two commits or one focused commit:

- `feat: honor content padding as a public contract and allow chromeless windows`

Do not mix unrelated refactors.
