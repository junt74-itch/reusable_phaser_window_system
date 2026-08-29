/**
 * Typecheck target for Phase 2 public symbols.
 * Uses only package exports — no deep src/ imports.
 */
import {
  CommandWindow,
  DocumentWindow,
  FontSwapBusyError,
  HelpWindow,
  LogWindow,
  MissingWindowSkinError,
  ScrollController,
  ScrollableWindow,
  WindowFocusController,
  WindowFocusError,
  bindFocusControllerToScene,
  bindWindowA11y,
  createNineSliceWindowRenderer,
  layoutWindowInViewport,
  shouldStickToLatest,
} from "reusable-phaser4-window-system";

export const phase2Constructors = {
  CommandWindow,
  DocumentWindow,
  HelpWindow,
  LogWindow,
  ScrollController,
  ScrollableWindow,
  WindowFocusController,
} as const;

export const phase2Functions = {
  bindFocusControllerToScene,
  bindWindowA11y,
  createNineSliceWindowRenderer,
  layoutWindowInViewport,
  shouldStickToLatest,
} as const;

export const phase2Errors = {
  FontSwapBusyError,
  MissingWindowSkinError,
  WindowFocusError,
} as const;

export function sampleViewportBounds() {
  return layoutWindowInViewport({
    viewportWidth: 960,
    viewportHeight: 540,
    width: 520,
    height: 160,
    margin: 40,
    anchor: "top-center",
  });
}
