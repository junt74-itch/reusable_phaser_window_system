import type {
  WindowActionEvent,
  WindowActionListener,
  WindowInputSubscription,
  WindowPointerEvent,
  WindowPointerListener,
} from "./types.ts";

/**
 * Semantic, injectable input surface for window controllers.
 */
export interface WindowInputAdapter {
  subscribeAction(listener: WindowActionListener): WindowInputSubscription;
  subscribePointer(listener: WindowPointerListener): WindowInputSubscription;
  dispose(): void;
}

/** Base class with independent subscriber lists. */
export abstract class BaseWindowInputAdapter implements WindowInputAdapter {
  private actionListeners = new Set<WindowActionListener>();
  private pointerListeners = new Set<WindowPointerListener>();
  private disposed = false;

  public subscribeAction(listener: WindowActionListener): WindowInputSubscription {
    this.actionListeners.add(listener);
    return {
      unsubscribe: () => {
        this.actionListeners.delete(listener);
      },
    };
  }

  public subscribePointer(listener: WindowPointerListener): WindowInputSubscription {
    this.pointerListeners.add(listener);
    return {
      unsubscribe: () => {
        this.pointerListeners.delete(listener);
      },
    };
  }

  public dispose(): void {
    this.disposed = true;
    this.actionListeners.clear();
    this.pointerListeners.clear();
  }

  protected emitAction(event: WindowActionEvent): void {
    if (this.disposed) {
      return;
    }
    for (const listener of this.actionListeners) {
      listener(event);
    }
  }

  protected emitPointer(event: WindowPointerEvent): void {
    if (this.disposed) {
      return;
    }
    for (const listener of this.pointerListeners) {
      listener(event);
    }
  }

  protected get isDisposed(): boolean {
    return this.disposed;
  }
}
