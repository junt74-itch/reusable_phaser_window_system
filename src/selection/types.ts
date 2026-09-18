import type { RichText } from "../text/types.ts";

export interface SelectableItem<T> {
  readonly id: string;
  readonly label: string | RichText;
  readonly value: T;
  readonly enabled: boolean;
}

export type SelectionChangeListener<T> = (index: number, item: SelectableItem<T> | null) => void;
export type SelectionConfirmListener<T> = (index: number, item: SelectableItem<T>) => void;
export type SelectionCancelListener = () => void;

export interface SelectionSubscription {
  unsubscribe(): void;
}

export interface SelectionControllerOptions {
  readonly writingMode?: import("../text/writingMode.ts").WritingMode;
  readonly vertical?: boolean;
  readonly columns?: number;
  readonly wrap?: boolean;
  readonly onConfirm?: () => void;
  readonly onCancel?: () => void;
}
