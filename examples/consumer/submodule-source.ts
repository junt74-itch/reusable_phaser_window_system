/** Typecheck target for the stable Git-submodule source entry point. */
import {
  MessageWindow,
  PhaserWindowInput,
  WindowFocusController,
  layoutWindowInViewport,
  type WindowConfig,
} from "../../index.ts";

export const submoduleSourceSurface = {
  MessageWindow,
  PhaserWindowInput,
  WindowFocusController,
  layoutWindowInViewport,
} as const;

export const submoduleWindowConfig: WindowConfig = {
  x: 40,
  y: 40,
  width: 520,
  height: 160,
};
