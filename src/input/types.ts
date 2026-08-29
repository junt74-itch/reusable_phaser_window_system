/** Semantic window input actions. */
export type WindowInputAction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "confirm"
  | "cancel"
  | "pageUp"
  | "pageDown"
  | "skip";

/** Action event phase. */
export type WindowInputPhase = "pressed" | "repeated" | "released";

/** Source device for normalized input. */
export type WindowInputSource = "keyboard" | "pointer" | "gamepad" | "manual";

/** Readonly action event snapshot. */
export interface WindowActionEvent {
  readonly action: WindowInputAction;
  readonly phase: WindowInputPhase;
  readonly timestamp: number;
  readonly source: WindowInputSource;
}

/** Readonly pointer event snapshot in local/world coordinates. */
export interface WindowPointerEvent {
  readonly localX: number;
  readonly localY: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly isPrimaryDown: boolean;
  readonly phase: WindowInputPhase;
  readonly timestamp: number;
  readonly source: WindowInputSource;
}

export type WindowActionListener = (event: WindowActionEvent) => void;
export type WindowPointerListener = (event: WindowPointerEvent) => void;

export interface WindowInputSubscription {
  unsubscribe(): void;
}
