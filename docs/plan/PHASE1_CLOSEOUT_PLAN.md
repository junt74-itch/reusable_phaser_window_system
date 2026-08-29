# Phase 1 closeout plan — through TASK-081

Last reviewed: 2026-08-29  
Execution target: Cursor Composer 2.5, one task at a time  
Baseline: inherit [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (Bun 1.3+, TypeScript strict, Vite, Phaser 4.2.1)

This document authorizes **remaining work only**. It does not replace the Phase 1 WBS, does not reopen fixed decisions, and does **not** authorize Phase 2.

Phase 1 is closed only when the original TASK-080 and TASK-081 acceptance criteria are checked with evidence. Until then, do not create detailed Phase 2 tasks.

## 1. Current status

| Range | Code / scenes | Formal gate |
|---|---|---|
| TASK-000 … TASK-074 | Present under `src/`, `tests/`, `examples/` | Checkboxes in the WBS are unmarked; treat as implemented unless a closeout task finds a defect |
| TASK-080 | `IntegrationScene` exists | Acceptance criteria **not** met |
| TASK-081 | `src/index.ts`, package fields, README, `docs/API.md`, `docs/MVP_RELEASE_CHECKLIST.md` exist | Acceptance criteria **not** met |
| Phase 2 | Backlog list only | Unauthorized |

`docs/plan/IMPLEMENTATION_PLAN.md` remains the source of architecture, scope, and original task text. This file is the source of **what still must be done**.

## 2. Gap analysis

### 2.1 TASK-080 — implemented vs required

Present today:

- `examples/scenes/IntegrationScene.ts` runs `say` → `choose` → result → repeat (3 times).
- Shared font key is loaded once in `preload()` and passed to both windows.
- Event-log text uses `BitmapText`.
- Active state is transferred with `activate()` / `deactivate()`.

Missing against the original task:

| Required item | Current gap |
|---|---|
| Exactly one window consumes confirm/cancel | Two `PhaserWindowInput` instances listen on the same Scene. Exclusivity is assumed via `canConsumeInput()`, not proven. |
| Fifty scripted iterations without subscriber / Game Object growth | Loop stops at 3. No leak assertion exists. |
| Scene restart during **both** message and choice | `LifecycleScene` only constructs `WindowBase` and destroys it. It does not restart mid-`say` or mid-`choose`. |
| close/open reversal, resize during operation, hide/show, destroy during pending | Not exercised in `IntegrationScene`. |
| `on`/`off` and Promise terminal-path audit | Not recorded. |

Do not add a dialogue engine, focus manager, or global window manager while closing these gaps.

### 2.2 TASK-081 — implemented vs required

Present today:

- `package.json` has `exports`, `module`, and `types` pointing at `dist/`.
- Vite externalizes `phaser`.
- Public barrel exists at `src/index.ts`.
- README and `docs/API.md` show `load.bitmapFont`, `say`, and `choose`.
- Automated rows in `docs/MVP_RELEASE_CHECKLIST.md` are checked.
- Source scan finds no `Phaser.GameObjects.Text` / `add.text` in `src/` or canvas examples.

Missing against the original task:

| Required item | Current gap |
|---|---|
| Temporary consumer fixture importing built JS + `.d.ts` via public exports only | No fixture. |
| README examples typecheck | No consumer/typecheck target for the documented snippet. |
| Document Scene setup, input ownership, theme, lifecycle, cancellation, browser support | README/API are thinner than the required list. |
| Provenance workflow, license-file preservation, missing-glyph policy, integer pixel scaling | Partial (ADR 0002 has some of this; user-facing docs do not). |
| `.d.ts` audit: no internal leaks, no `any` in public API | Not recorded. |
| Exact automated/manual results | Browser-evidence rows in the checklist are unchecked. |
| Every Phase 1 acceptance criterion checked or explicitly blocked with evidence | WBS checkboxes remain empty; no evidence log. |

Do not publish a package or create a release/tag.

## 3. Fixed decisions

Composer must not reopen [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) §2 unless an acceptance criterion proves a decision infeasible.

Additional closeout constraints:

- Fix only demonstrated TASK-080/081 defects. Desirable new behavior goes to the Phase 2 backlog list, not into this closeout.
- Window text remains `BitmapText` from a validated `reusable_pixel_font_builder` artifact. No Phaser `Text`, CSS/web fonts, or system-font fallback.
- Phaser stays a dependency and an external bundle import.
- One in-flight operation per concrete window; cancel/destroy settles each Promise exactly once.
- Files are added only when their owning task starts.

## 4. Cursor execution contract

Give Composer exactly one `TASK-*` section from this document. Prefix it with:

```text
Implement only the task below. First inspect docs/plan/IMPLEMENTATION_PLAN.md,
docs/plan/PHASE1_CLOSEOUT_PLAN.md, and the listed dependency files.
Do not implement later tasks, change the fixed decisions, or start Phase 2.
Use only bitmap-font artifacts from reusable_pixel_font_builder for displayed window text.
Do not use Phaser Text or system/web-font fallback.
Keep Phaser dependencies at adapter/window boundaries. Add focused tests.
Run every Verification command and report exact results plus the Acceptance Criteria checklist.
If an API named in the plan does not exist in installed Phaser 4.2.1 types, stop and report the mismatch.
```

Composer may repair a directly caused type/test/build failure in files it changed. Broader refactors become a new plan task.

## 5. Dependency order

```text
080-R1 exclusive input + 50-iteration settlement
  └─ 080-R2 boundary operations + scene restart during say/choose
       └─ 081-R1 public docs
            └─ 081-R2 consumer fixture, d.ts, scans
                 └─ 081-R3 evidence gate (closes TASK-080 and TASK-081)
```

## 6. Tasks

## TASK-080-R1 Exclusive input and fifty-iteration settlement

### Goal

Prove that only one window consumes confirm/cancel, and that a scripted message→choice loop can run fifty times without leaking subscriptions.

### Dependencies

- Existing TASK-064 / TASK-074 implementations
- `tests/helpers/ManualWindowInput.ts`

### Files

- `tests/integration/exclusiveInput.settlement.test.ts` (create)
- Focused existing controller/window tests only if a demonstrated leak requires a production fix
- `examples/scenes/IntegrationScene.ts` only if the current two-adapter setup is the defect

### Required implementation

- Write a deterministic test that drives `say` then `choose` (or the equivalent controllers + `canConsumeInput` gates) for 50 iterations using `ManualWindowInput`.
- Assert after each iteration, and after the 50th, that listener/subscriber counts on the shared adapter do not grow.
- Prove that while the message side is the consumer, choice confirm/cancel is ignored, and the reverse.
- Inspect `IntegrationScene`: it currently constructs two `PhaserWindowInput` instances on one Scene. If both adapters emit the same physical key, either share one adapter and gate with `canConsumeInput()`, or otherwise make exclusivity mechanically true. Do not add `WindowFocusManager`.
- If a leak or double-consume is demonstrated, fix only that defect.

### Acceptance Criteria

- [x] A test fails if both windows would act on the same confirm/cancel event.
- [x] 50 scripted iterations complete; subscriber count is stable.
- [x] `bun test` / `bun run typecheck` / `bun run build` pass.

### Verification

```bash
bun run check
```

---

## TASK-080-R2 Boundary operations and scene restart

### Goal

Exercise the lifecycle edges named by original TASK-080, including restart during an in-flight `say` and an in-flight `choose`.

### Dependencies

- TASK-080-R1

### Files

- `examples/scenes/IntegrationScene.ts`
- `examples/scenes/LifecycleScene.ts` or a dedicated restart path inside the integration scene
- `examples/main.ts` only if a new query flag is required
- Focused existing tests for demonstrated settlement defects only

### Required implementation

- Keep the happy path: say → choose → show result → repeat; transfer active state explicitly.
- Add explicit, inspectable exercises (keyboard, query flag, or on-screen BitmapText instructions — not HTML UI) for:
  - close then open reversal during or between operations
  - resize during an in-flight operation
  - hide/show during an in-flight operation
  - destroy during a pending `say` and a pending `choose`
  - Scene restart while `say` is pending
  - Scene restart while `choose` is pending
- Each pending Promise must settle exactly once (cancel/destroyed). The next Scene start must create windows once and not double-subscribe.
- Audit every `on` against `off` or owned `destroy`, and every Promise against all terminal paths. Record findings in the task report. Fix only demonstrated defects.

### Acceptance Criteria

- [x] Restart during message settles the pending `say` and the next start runs a single loop owner. Chromium verified 2026-08-29 (`?scene=integration&exercise=restart-say`).
- [x] Restart during choice settles the pending `choose` and the next start runs a single loop owner. Chromium verified 2026-08-29 (`?scene=integration&exercise=restart-choose`).
- [x] Destroy during pending `say`/`choose` does not leave an unsettled Promise. Chromium verified 2026-08-29 (Integration **D** key).
- [x] Full-gate commands pass after the audit.

### Verification

```bash
bun run check
bun run dev
```

Manual: `?scene=integration` and `?scene=lifecycle` (or the documented restart URL) in Chromium.

---

## TASK-081-R1 Public documentation

### Goal

Make the implemented MVP consumable from user-facing docs without publishing.

### Dependencies

- TASK-080-R2

### Files

- `README.md`
- `docs/API.md`

### Required implementation

Document, with copy-pasteable TypeScript where an API is shown:

- install (`bun install`), sandbox (`bun run dev`), and `font:sync`
- Scene `preload` + `create` setup
- input ownership (`ownsInput`, shared vs per-window adapter, `activate`/`deactivate`)
- `MessageWindow.say` and `ChoiceWindow.choose`
- theme customization via `WindowConfig.theme` / `resolveWindowTheme`
- lifecycle: open/close, hide/show, destroy, Scene shutdown
- errors and cancellation (`MessageBusyError`, `ChoiceBusyError`, `WindowOperationCancelledError`, `WindowDestroyedError`, `MissingBitmapGlyphError`, `BitmapFontNotLoadedError`)
- browser support as known today (WebGL primary; Canvas clipping fallback per ADR 0001)
- required artifact pair `font.png` + `font.xml`
- standard `scene.load.bitmapFont` example (no custom XML/JSON parser)
- pinned provenance workflow and license-file preservation
- missing-glyph policy (typed throw, no system-font fallback)
- integer pixel scaling / `roundPixels` / nearest-neighbor

Do not invent APIs. If a behavior is an MVP limit, say so and point at `docs/MVP_RELEASE_CHECKLIST.md`.

### Acceptance Criteria

- [x] Every item in the list above appears in README and/or `docs/API.md`.
- [x] Documented examples use only public exports from `src/index.ts`.
- [x] No publish/release/tag instructions are added.

### Verification

```bash
bun run check
```

Also re-read README and `docs/API.md` against this task's required list.

---

## TASK-081-R2 Consumer fixture, declaration audit, and source scans

### Goal

Prove the built package is importable as a library and that the public surface matches the docs.

### Dependencies

- TASK-081-R1

### Files

- `tests/package/public-exports.test.ts` (or equivalent fixture created by this task)
- `examples/consumer/readme-example.ts` (or equivalent typecheck target for the README snippet)
- `package.json` / `tsconfig*.json` only if the fixture needs a documented typecheck script
- `src/index.ts` only to remove an unintended export (do not add new public API)

### Required implementation

- After `bun run build`, a fixture imports the built JS and `.d.ts` using only `package.json` `exports` (not deep `src/` paths).
- Typecheck the documented README consumer example.
- Inspect `dist/index.d.ts`: no `any`; no types that exist only as unexported internals leaking as required consumer knowledge.
- Confirm `dist/index.js` does not contain a second bundled Phaser copy.
- Confirm no custom XML/JSON font parser is exported or bundled; the fixture loads fonts only via `scene.load.bitmapFont` in comments or a non-executing type-level example.
- Repository scan: no Phaser `Text` construction in `src/` or canvas examples.

### Acceptance Criteria

- [x] Fixture imports built JS and declarations from public exports only.
- [x] README example typechecks.
- [x] Production bundle has no bundled Phaser.
- [x] No custom font parser is part of the public or bundled surface.
- [x] Source scan finds no Phaser `Text` in `src/` or canvas examples.

### Verification

```bash
bun run check
```

Also inspect `dist/index.js` and `dist/index.d.ts`.

---

## TASK-081-R3 Evidence gate

### Goal

Close original TASK-080 and TASK-081 with recorded evidence. This is the last authorized Phase 1 task.

### Dependencies

- TASK-081-R2

### Files

- `docs/MVP_RELEASE_CHECKLIST.md`
- `docs/plan/IMPLEMENTATION_PLAN.md` (check original TASK-080 / TASK-081 boxes only when evidence exists)
- this file (check the final gate below)

### Required implementation

- Re-run `bun run check` and record the exact command output summary (test count, typecheck, build).
- Record browser evidence for every row in `docs/MVP_RELEASE_CHECKLIST.md`. A row may be marked blocked only with renderer/hardware evidence (for example gamepad hardware absent).
- Walk [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) §10 acceptance matrix. Each capability must be checked or explicitly blocked with a pointer to a test file, scene URL, or ADR.
- Walk unmarked TASK-000…074 checkboxes: mark checked when existing tests/scenes already prove the criterion; mark blocked with evidence if not. Do not silently invent new features to make a box green.
- Update known MVP limits: clipping renderer support, kinsoku, no list scrolling, gamepad “first pad only”, and any defect found during 080-R* that is deferred.
- Do not publish. Do not tag. Do not write Phase 2 task specs here.

### Acceptance Criteria

- [x] `docs/MVP_RELEASE_CHECKLIST.md` has automated and browser rows checked or blocked with evidence.
- [x] Original TASK-080 acceptance criteria are checked.
- [x] Original TASK-081 acceptance criteria are checked.
- [x] IMPLEMENTATION_PLAN §10 matrix is filled.
- [x] The final gate in this document is checked.

### Verification

```bash
bun run check
```

Manual: every sandbox URL listed in the checklist, in Chromium.

---

## 7. Final gate (Phase 1 closed)

- [x] TASK-080-R1 … TASK-081-R3 acceptance criteria are all checked.
- [x] Original TASK-080 and TASK-081 in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) are checked.
- [x] [MVP_RELEASE_CHECKLIST.md](../MVP_RELEASE_CHECKLIST.md) browser evidence is recorded in Chromium.
- [x] No Phase 2 implementation has been started.

Phase 2 tasks are in [PHASE2_IMPLEMENTATION_PLAN.md](PHASE2_IMPLEMENTATION_PLAN.md). Each Phase 2 task must still prove it does not force derived-specific logic back into `WindowBase`.
