/** Query-param scene keys for the sandbox (`?scene=`). Phaser-free so tests can import it. */

export const PHASE2_SCENE_KEYS = [
  "scroll",
  "long-list",
  "nineslice",
  "command-help",
  "log-document",
  "focus-modal",
  "message-portrait",
  "font-fallback",
] as const;

export const ALL_SCENE_KEYS = [
  "integration",
  "message",
  "choice",
  "window-base",
  "lifecycle",
  "clipping",
  "bitmap-font",
  ...PHASE2_SCENE_KEYS,
  "padding-chrome",
  "rich-text",
] as const;

export type SceneKey = (typeof ALL_SCENE_KEYS)[number];
