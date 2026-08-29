/** Public API for the reusable Phaser 4 window system. */

export type {
  WindowConfig,
  WindowPadding,
  WindowTheme,
  ResolvedWindowTheme,
  WindowPhase,
  WindowBounds,
  WindowStateSnapshot,
  BitmapTextStyle,
  CursorStyle,
} from "./core/types.ts";

export {
  WindowConfigError,
  WindowOperationCancelledError,
  WindowDestroyedError,
  WindowLayoutError,
} from "./core/types.ts";

export { resolveWindowTheme, validateWindowConfig, computeContentBounds } from "./core/theme.ts";
export { TransitionController } from "./core/TransitionController.ts";
export type { TransitionState } from "./core/TransitionController.ts";
export type { WindowRenderer } from "./core/WindowRenderer.ts";
export { GraphicsWindowRenderer } from "./core/GraphicsWindowRenderer.ts";
export { ContentClipper, ContentClipperUnsupportedError } from "./core/ContentClipper.ts";
export { WindowBase } from "./core/WindowBase.ts";
export type { WindowBaseOptions } from "./core/WindowBase.ts";

export type {
  WindowInputAction,
  WindowInputPhase,
  WindowInputSource,
  WindowActionEvent,
  WindowPointerEvent,
  WindowActionListener,
  WindowPointerListener,
  WindowInputSubscription,
} from "./input/types.ts";
export type { WindowInputAdapter } from "./input/WindowInputAdapter.ts";
export { PhaserWindowInput } from "./input/PhaserWindowInput.ts";
export type {
  PhaserWindowInputBindings,
  PhaserWindowInputOptions,
} from "./input/PhaserWindowInput.ts";

export type {
  BitmapTextMeasurer,
  BitmapTextMeasureStyle,
  BitmapTextMeasurement,
  LayoutLine,
  TextLayoutResult,
  TextLayoutOptions,
} from "./text/types.ts";
export { MissingBitmapGlyphError, BitmapFontNotLoadedError } from "./text/types.ts";
export { layoutText } from "./text/TextLayout.ts";
export { DEFAULT_BITMAP_FONT_ASSET } from "./text/BitmapFontAsset.ts";
export type { BitmapFontAsset } from "./text/BitmapFontAsset.ts";
export { PhaserBitmapTextMeasurer } from "./text/PhaserBitmapTextMeasurer.ts";
export { TextWindowBase } from "./text/TextWindowBase.ts";

export type { MessageToken, MessageParseResult } from "./message/types.ts";
export { parseMessage } from "./message/MessageParser.ts";
export {
  createInitialTextState,
  reduceTextState,
  getRevealedText,
  getRevealedPageText,
  requiresAdvanceInput,
} from "./message/TextState.ts";
export type { TextState, TextStateEffect, TextStateStepResult } from "./message/TextState.ts";
export {
  MessageController,
  MessageBusyError,
} from "./message/MessageController.ts";
export type { MessageStartRequest, MessageRenderSnapshot } from "./message/MessageController.ts";
export { MessageWindow } from "./message/MessageWindow.ts";
export type { MessageSayOptions } from "./message/MessageWindow.ts";

export type { SelectableItem, SelectionControllerOptions } from "./selection/types.ts";
export { SelectionController } from "./selection/SelectionController.ts";
export { SelectableWindow } from "./selection/SelectableWindow.ts";
export type { SelectableWindowOptions, RowBounds } from "./selection/SelectableWindow.ts";
export { CursorRenderer } from "./selection/CursorRenderer.ts";

export {
  ChoiceWindow,
  ChoiceBusyError,
  ChoiceConfigurationError,
} from "./choice/ChoiceWindow.ts";
export type { ChoiceResult, ChoiceOptions } from "./choice/ChoiceWindow.ts";
