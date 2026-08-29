# Phase 2 Release Checklist

Last updated: 2026-08-29

Do not publish or tag. This file records automated evidence and sandbox URLs. Chromium WebGL rows were observed by the operator on 2026-08-29.

## Automated gate

- [x] `bun run check` — **168 unit tests** + typecheck + Vite build (`dist/index.js` 106.09 kB) + **10 package tests** + consumer typecheck (`readme-example.ts`, `phase2-surface.ts`, `submodule-source.ts`)
- [x] Production bundle externalizes Phaser (`dist/index.js` imports `from "phaser"`)
- [x] Public exports fixture includes Phase 2 symbols — `tests/package/public-exports.test.ts`
- [x] Barrel does not re-export internals (`sayPreflight`, `ScrollContentClip`, `fontFallback`, …)
- [x] Consumer fixtures typecheck — `examples/consumer/readme-example.ts`, `examples/consumer/phase2-surface.ts`
- [x] Git-submodule source entry, documentation navigation, and maintainer-plan isolation — repository `index.ts`, `examples/consumer/submodule-source.ts`, `docs/plan/README.md`, `tests/package/repository-access.test.ts`
- [x] Scene routes — `tests/examples/scene-routes.test.ts` (every §10 URL key in `examples/main.ts`)
- [x] No Phaser `Text` in `src/` or `examples/`
- [x] `dist/index.d.ts` contains no `any`
- [x] `WindowBase` isolation — no scroll/skin/focus/portrait/command/log/document/a11y/layout API (generic `subscribeTransition` / `createRenderer` only)

## Browser evidence

Dev server: `bun run dev` → `http://localhost:5173/` (or next free port).

| Capability | URL | Automated | Chromium (operator) |
|---|---|---|---|
| Renderer injection (Graphics default) | `?scene=window-base` | GraphicsWindowRenderer tests; Vite 200 | Observed 2026-08-29 |
| Wheel/page/drag + scrollbar | `?scene=scroll` | TASK-101/110/111/113 tests; Vite 200 | Observed 2026-08-29 |
| Long selectable list + scrollbar | `?scene=long-list` | TASK-112/114 tests; Vite 200 | Observed 2026-08-29 |
| NineSlice chrome | `?scene=nineslice` | TASK-120/121 + ADR 0003; Vite 200 | Observed 2026-08-29 |
| Command + help | `?scene=command-help` | TASK-130/131 tests; Vite 200 | Observed 2026-08-29 |
| Log / document | `?scene=log-document` | TASK-132/133 tests; Vite 200 | Observed 2026-08-29 |
| Focus / modal | `?scene=focus-modal` | TASK-140/141 + ADR 0005; Vite 200 | Observed 2026-08-29 |
| Tokens / portrait / auto / audio hooks | `?scene=message-portrait` | TASK-150–153 tests; Vite 200 | Observed 2026-08-29 |
| Font fallback / hot swap | `?scene=font-fallback` | TASK-160/161 tests; Vite 200 | Observed 2026-08-29 |
| Viewport helper (message + choice) | `?scene=integration` | TASK-171 tests; Vite 200 | Observed 2026-08-29 |
| A11y semantic events | Documented in `docs/API.md` | TASK-170 tests | N/A (no DOM overlay) |
| Package surface | N/A | TASK-181 package + consumer | N/A |

Gamepad confirm remains **blocked** without connected hardware (same as Phase 1).

Operator observed every README `?scene=` route in Chromium/WebGL on 2026-08-29, including Phase 1 spikes (`message`, `choice`, `lifecycle`, `clipping`, `bitmap-font`). Integration restart exercises were independently re-verified after the BitmapText-after-shutdown fix on 2026-08-29; both returned to the normal integration route with no browser warning/error or Vite unhandled rejection. Vite HTML 200 remains the compile-graph check; pixels are the operator column above.

### Row checklist

- [x] `?scene=window-base` — Chromium observed 2026-08-29
- [x] `?scene=scroll` — Chromium observed 2026-08-29
- [x] `?scene=long-list` — Chromium observed 2026-08-29
- [x] `?scene=nineslice` — Chromium observed 2026-08-29
- [x] `?scene=command-help` — Chromium observed 2026-08-29
- [x] `?scene=log-document` — Chromium observed 2026-08-29
- [x] `?scene=focus-modal` — Chromium observed 2026-08-29
- [x] `?scene=message-portrait` — Chromium observed 2026-08-29
- [x] `?scene=font-fallback` — Chromium observed 2026-08-29
- [x] `?scene=integration` — Chromium observed 2026-08-29 (viewport helper)
- [x] `?scene=integration&exercise=restart-say` — re-verified 2026-08-29 after `writeSandboxLog` + `logGeneration` fix; no browser/Vite error
- [x] `?scene=integration&exercise=restart-choose` — re-verified 2026-08-29 after the same fix; no browser/Vite error
- [x] A11y — unit tests; no sandbox DOM
- [x] Package surface — `bun run check`

## Task rollup (TASK-100 … TASK-181)

Implemented in `src/`, `tests/`, and `examples/`. Automated gate plus Chromium rows are recorded. No Phase 3 types (`ItemListWindow`, inventory, DOM a11y overlay) were added.

## Known Phase 2 limits

- WebGL mask clipping primary path; Canvas uses GeometryMask fallback (ADR 0001)
- No Japanese kinsoku in text layout
- Gamepad polling uses first connected pad only
- Font fallback chain is builder cache keys only; `?scene=font-fallback` aliases the same in-repo artifact
- Accessibility is semantic events only (no DOM / screen-reader tree)
- `WindowBase` does not subscribe to the camera; Scene calls `layoutWindowInViewport`
- No npm publish / git release tag

## Isolation proof (TASK-180 / TASK-181)

- `WindowBase` gained no scroll, skin, focus, portrait, command, log, document, font-fallback, a11y, or viewport APIs. Allowed generic seams: `createRenderer`, `subscribeTransition`.
- Sandbox wiring lives in `examples/` (`sceneKeys.ts`, `preloadDefaultBitmapFont.ts`, `main.ts`).
- `src/index.ts` exports the landed Phase 2 surface and does not re-export `sayPreflight`, `ScrollContentClip`, or `fontFallback` helpers.
