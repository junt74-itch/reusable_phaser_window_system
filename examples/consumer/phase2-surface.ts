/**
 * Typecheck target for Phase 2 public symbols.
 * Uses only package exports — no deep src/ imports.
 */
import type { RichText } from "reusable-phaser4-window-system";
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
  layoutRichText,
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

export const sampleRichTextContent: RichText = {
  spans: [{ text: "Hello, rich text." }],
  align: "left",
};

export function sampleRichTextLayout(
  measurer: Parameters<typeof layoutRichText>[1],
) {
  return layoutRichText(sampleRichTextContent, measurer, {
    width: 400,
    height: 120,
    style: { fontKey: "default", fontSize: 16, scale: 1, letterSpacing: 0 },
    lineSpacing: 4,
  });
}
