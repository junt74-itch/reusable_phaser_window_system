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
export type { TransitionState, TransitionSubscription } from "./core/TransitionController.ts";
export type {
  WindowRenderer,
  WindowRendererFactory,
  WindowRendererFactoryContext,
  GraphicsLike,
  GraphicsFactory,
} from "./core/WindowRenderer.ts";
export {
  createDefaultGraphicsWindowRenderer,
  resolveWindowRenderer,
} from "./core/windowRendererFactory.ts";
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
  WindowWheelEvent,
  WindowDragPhase,
  WindowDragEvent,
  WindowActionListener,
  WindowPointerListener,
  WindowWheelListener,
  WindowDragListener,
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
  BitmapFontNativeMetrics,
  ScaledFontMetrics,
  LayoutLine,
  LayoutLineRun,
  TextLayoutResult,
  TextLayoutOptions,
  TextAlign,
  RichTextSpan,
  RichText,
  WindowTextContent,
} from "./text/types.ts";
export { MissingBitmapGlyphError, BitmapFontNotLoadedError, FontSwapBusyError } from "./text/types.ts";
export { layoutText, layoutRichText } from "./text/TextLayout.ts";
export { DEFAULT_BITMAP_FONT_ASSET } from "./text/BitmapFontAsset.ts";
export type { BitmapFontAsset } from "./text/BitmapFontAsset.ts";
export { PhaserBitmapTextMeasurer } from "./text/PhaserBitmapTextMeasurer.ts";
export { FallbackBitmapTextMeasurer, createBitmapTextMeasurer } from "./text/FallbackBitmapTextMeasurer.ts";
export { TextWindowBase } from "./text/TextWindowBase.ts";

export type { MessageToken, MessageParseResult, MessagePortraitOptions, MessageAudioHooks } from "./message/types.ts";
export { MissingMessagePortraitError } from "./message/types.ts";
export { parseMessage } from "./message/MessageParser.ts";
export {
  createInitialTextState,
  reduceTextState,
  getRevealedText,
  getRevealedPageText,
  getRevealedPageColors,
  requiresAdvanceInput,
} from "./message/TextState.ts";
export type { TextState, TextStateEffect, TextStateStepResult } from "./message/TextState.ts";
export {
  MessageController,
  MessageBusyError,
} from "./message/MessageController.ts";
export type { MessageStartRequest, MessageRenderSnapshot } from "./message/MessageController.ts";
export { MessageWindow } from "./message/MessageWindow.ts";
export type { MessageSayOptions, MessageWindowOptions } from "./message/MessageWindow.ts";

export type { SelectableItem, SelectionControllerOptions } from "./selection/types.ts";
export { SelectionController } from "./selection/SelectionController.ts";
export { SelectableWindow } from "./selection/SelectableWindow.ts";
export type { SelectableWindowOptions, RowBounds } from "./selection/SelectableWindow.ts";
export { CursorRenderer } from "./selection/CursorRenderer.ts";
export { cursorBlinkVisible } from "./selection/cursorBlink.ts";

export {
  ChoiceWindow,
  ChoiceBusyError,
  ChoiceConfigurationError,
} from "./choice/ChoiceWindow.ts";
export type { ChoiceResult, ChoiceOptions } from "./choice/ChoiceWindow.ts";

export { ScrollController } from "./scroll/ScrollController.ts";
export { ScrollableWindow } from "./scroll/ScrollableWindow.ts";
export type { ScrollableWindowOptions } from "./scroll/ScrollableWindow.ts";
export { ScrollbarRenderer } from "./scroll/ScrollbarRenderer.ts";
export type { ScrollbarRendererOptions } from "./scroll/ScrollbarRenderer.ts";
export { bindScrollInput } from "./scroll/scrollInputBinding.ts";
export type {
  ScrollAxis,
  ScrollBounds,
  ScrollChangeListener,
  ScrollChangeSubscription,
  ScrollControllerOptions,
} from "./scroll/types.ts";

export { NineSliceWindowRenderer, createNineSliceWindowRenderer } from "./skin/NineSliceWindowRenderer.ts";
export { MissingWindowSkinError } from "./skin/types.ts";
export type { NineSliceSkinOptions } from "./skin/types.ts";

export { CommandWindow, CommandBusyError, CommandConfigurationError } from "./command/CommandWindow.ts";
export type { CommandWindowOptions } from "./command/CommandWindow.ts";
export type { CommandItem, CommandResult } from "./command/types.ts";

export { HelpWindow } from "./help/HelpWindow.ts";

export { LogWindow } from "./log/LogWindow.ts";
export { shouldStickToLatest } from "./log/stickToLatest.ts";

export { DocumentWindow } from "./document/DocumentWindow.ts";

export { WindowFocusController } from "./focus/WindowFocusController.ts";
export { bindFocusControllerToScene } from "./focus/bindSceneShutdown.ts";
export { WindowFocusError } from "./focus/types.ts";
export type {
  FocusableWindow,
  FocusAcquireOptions,
  FocusSnapshot,
  FocusChangeListener,
  FocusChangeSubscription,
} from "./focus/types.ts";

export { bindWindowA11y } from "./a11y/bindWindowA11y.ts";
export type {
  WindowA11yEvent,
  WindowA11yListener,
  WindowA11ySubscription,
  BindWindowA11yOptions,
  A11yLifecycleSource,
  A11ySelectionSource,
  A11yMessageSource,
  A11yFocusSource,
} from "./a11y/types.ts";

export { layoutWindowInViewport } from "./layout/viewportLayout.ts";
export type { ViewportAnchor, ViewportLayoutRequest } from "./layout/viewportLayout.ts";
