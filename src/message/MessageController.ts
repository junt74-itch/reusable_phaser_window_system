import type { WindowInputAdapter } from "../input/WindowInputAdapter.ts";
import type { MessageToken } from "./types.ts";
import {
  createInitialTextState,
  getRevealedPageText,
  reduceTextState,
  requiresAdvanceInput,
  type TextState,
} from "./TextState.ts";
import { WindowOperationCancelledError } from "../core/types.ts";

export class MessageBusyError extends Error {
  public override readonly name = "MessageBusyError";

  public constructor() {
    super("MessageWindow is already displaying a message.");
  }
}

export interface MessageStartRequest {
  readonly tokens: readonly MessageToken[];
  readonly charsPerSecond: number;
  readonly layoutPageBreaksByPage?: readonly (readonly number[])[];
}

export interface MessageRenderSnapshot {
  readonly revealedText: string;
  readonly pageIndex: number;
  readonly layoutPageIndex: number;
  readonly pausedForAdvance: boolean;
  readonly completed: boolean;
}

type Resolve = (snapshot: MessageRenderSnapshot) => void;
type Reject = (error: Error) => void;

/**
 * Owns one message operation and coordinates parser/layout state with semantic input.
 */
export class MessageController {
  private tokens: readonly MessageToken[] = [];
  private layoutPageBreaksByPage: readonly (readonly number[])[] = [];
  private state: TextState = createInitialTextState();
  private charsPerSecond = 30;
  private busy = false;
  private disposed = false;
  private resolve: Resolve | null = null;
  private reject: Reject | null = null;
  private subscriptions: Array<{ unsubscribe: () => void }> = [];
  private latestSnapshot: MessageRenderSnapshot = {
    revealedText: "",
    pageIndex: 0,
    layoutPageIndex: 0,
    pausedForAdvance: false,
    completed: false,
  };

  public constructor(
    private readonly input: WindowInputAdapter | null,
    private readonly canConsumeInput: () => boolean = () => true,
  ) {}

  public getLatestSnapshot(): MessageRenderSnapshot {
    return this.latestSnapshot;
  }

  public isBusy(): boolean {
    return this.busy;
  }

  public start(request: MessageStartRequest): Promise<MessageRenderSnapshot> {
    if (this.disposed) {
      return Promise.reject(new WindowOperationCancelledError("disposed"));
    }
    if (this.busy) {
      return Promise.reject(new MessageBusyError());
    }
    this.busy = true;
    this.tokens = request.tokens;
    this.layoutPageBreaksByPage = request.layoutPageBreaksByPage ?? [];
    this.charsPerSecond = request.charsPerSecond;
    this.state = createInitialTextState();
    this.bindInput();
    this.publishSnapshot();
    return new Promise<MessageRenderSnapshot>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  public update(deltaMs: number): void {
    if (!this.busy || this.disposed) {
      return;
    }
    const result = reduceTextState(
      this.tokens,
      this.state,
      { deltaMs },
      this.charsPerSecond,
      { layoutPageBreaksByPage: this.layoutPageBreaksByPage },
    );
    this.state = result.state;
    this.publishSnapshot();
    if (this.state.completed) {
      this.finish();
    }
  }

  public cancelOperation(reason = "cancelled"): void {
    this.finalizePending(new WindowOperationCancelledError(reason));
  }

  public dispose(reason = "disposed"): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.unbindInput();
    this.finalizePending(new WindowOperationCancelledError(reason));
  }

  private bindInput(): void {
    this.unbindInput();
    if (this.input === null) {
      return;
    }
    this.subscriptions.push(
      this.input.subscribeAction((event) => {
        if (
          event.phase !== "pressed" ||
          !this.busy ||
          this.disposed ||
          !this.canConsumeInput()
        ) {
          return;
        }
        if (event.action === "confirm") {
          this.handleConfirm();
        } else if (event.action === "skip") {
          this.handleSkip();
        }
      }),
    );
  }

  private unbindInput(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
  }

  private handleConfirm(): void {
    if (this.state.pausedForAdvance) {
      const result = reduceTextState(
        this.tokens,
        this.state,
        { advance: true },
        this.charsPerSecond,
        { layoutPageBreaksByPage: this.layoutPageBreaksByPage },
      );
      this.state = result.state;
      this.publishSnapshot();
      if (this.state.completed) {
        this.finish();
      }
      return;
    }
    this.applySkipOrConfirm();
  }

  private handleSkip(): void {
    this.applySkipOrConfirm();
  }

  private applySkipOrConfirm(): void {
    const result = reduceTextState(
      this.tokens,
      this.state,
      { skip: true },
      this.charsPerSecond,
      { layoutPageBreaksByPage: this.layoutPageBreaksByPage },
    );
    this.state = result.state;
    this.publishSnapshot();
    if (this.state.completed) {
      this.finish();
    }
  }

  private publishSnapshot(): void {
    this.latestSnapshot = {
      revealedText: getRevealedPageText(this.tokens, this.state, this.layoutPageBreaksByPage),
      pageIndex: this.state.pageIndex,
      layoutPageIndex: this.state.layoutPageIndex,
      pausedForAdvance: requiresAdvanceInput(this.tokens, this.state, this.layoutPageBreaksByPage),
      completed: this.state.completed,
    };
  }

  private finish(): void {
    this.finalizePending(this.latestSnapshot);
  }

  private finalizePending(value: MessageRenderSnapshot | Error): void {
    if (!this.busy) {
      return;
    }
    this.busy = false;
    this.unbindInput();
    const resolve = this.resolve;
    const reject = this.reject;
    this.resolve = null;
    this.reject = null;
    if (value instanceof Error) {
      reject?.(value);
    } else {
      resolve?.(value);
    }
  }
}
