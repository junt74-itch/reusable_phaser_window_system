# MVP Release Checklist

Last updated: 2026-08-29 (Chromium verified)

## Automated gate

- [x] `bun run check` passes — **59 tests** (54 unit + 5 package), `tsc --noEmit`, Vite build (~55.84 kB), `typecheck:consumer`
- [x] Production bundle externalizes Phaser (`dist/index.js` imports `from "phaser"`, no inlined phaser.esm)
- [x] Font sync script validates upstream artifacts and writes `provenance.json`
- [x] Public exports fixture — `tests/package/public-exports.test.ts`
- [x] README consumer example typechecks — `examples/consumer/readme-example.ts`
- [x] Exclusive input + 50-iteration settlement — `tests/integration/exclusiveInput.settlement.test.ts`
- [x] Pending operation settlement — `tests/integration/pendingSettlement.test.ts`
- [x] No Phaser `Text` in `src/` or `examples/`
- [x] `dist/index.d.ts` contains no `any`

## Browser evidence (Chromium)

Verified in Chromium (WebGL) on **2026-08-29** by manual observation.

Dev server: `bun run dev` → `http://localhost:5173/` (or next free port).

| Row | URL | Evidence (Chromium 2026-08-29) |
|---|---|---|
| WindowBase clipping/move/resize | `?scene=window-base` | Overflow circle clipped inside window while animating |
| Lifecycle base restart | `?scene=lifecycle` | Three spawn/open/destroy cycles; no duplicate input |
| Lifecycle restart during say | `?scene=lifecycle&mode=restart-say` | Pending say → one restart; second start runs base lifecycle (no infinite restart) |
| Lifecycle restart during choose | `?scene=lifecycle&mode=restart-choose` | Pending choose → one restart; second start runs base lifecycle |
| Bitmap font spike | `?scene=bitmap-font` | Japanese + ASCII BitmapText samples render correctly |
| Message keyboard | `?scene=message` | Typewriter completes; event log shows completion |
| Choice keyboard/pointer | `?scene=choice` | Selection resolves; event log shows selected label |
| Integration loop | `?scene=integration` | Log shows `loop owner started` then iterations 1–3 |
| Integration restart during say | `?scene=integration&exercise=restart-say` | One restart; second start shows `loop owner started` (single loop owner) |
| Integration restart during choose | `?scene=integration&exercise=restart-choose` | One restart; second start shows `loop owner started` |
| Integration destroy exercise | `?scene=integration` + **D** | Pending say/choose settle; log ends with `destroy exercise complete`; windows respond |
| Integration manual restart | `?scene=integration` + **R** | Scene restarts once; log shows `loop owner started` on next create |
| Clipping spike | `?scene=clipping` | Overflow clipped after move/resize |
| Gamepad confirm | `?scene=message` or `?scene=choice` | **Blocked**: no gamepad hardware connected |

### Row checklist

- [x] `?scene=window-base`
- [x] `?scene=lifecycle`
- [x] `?scene=lifecycle&mode=restart-say`
- [x] `?scene=lifecycle&mode=restart-choose`
- [x] `?scene=bitmap-font`
- [x] `?scene=message`
- [x] `?scene=choice`
- [x] `?scene=integration`
- [x] `?scene=integration&exercise=restart-say`
- [x] `?scene=integration&exercise=restart-choose`
- [x] Integration **D** destroy exercise
- [x] Integration **R** manual restart
- [x] `?scene=clipping`
- [x] Gamepad — **Blocked** (no connected pad)

## Known MVP limits

- WebGL mask clipping primary path; Canvas uses GeometryMask fallback (ADR 0001)
- No Japanese kinsoku in text layout
- No scrolling for overflowing selectable lists
- Gamepad polling uses first connected pad only
- Integration demo loop runs 3 visible iterations; 50-iteration leak proof is automated in `tests/integration/exclusiveInput.settlement.test.ts`

## Phase 1 closeout status

- TASK-080-R1: **closed**
- TASK-080-R2: **closed** (automated + Chromium)
- TASK-081-R1/R2: **closed**
- TASK-081-R3: **closed**
- Final gate: **closed** — see `docs/plan/PHASE1_CLOSEOUT_PLAN.md` §7
