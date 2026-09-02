import { describe, expect, test } from "bun:test";
import { ManualWindowInput } from "../helpers/ManualWindowInput.ts";
import { MessageController } from "../../src/message/MessageController.ts";
import { SelectionController } from "../../src/selection/SelectionController.ts";
import type { MessageToken } from "../../src/message/types.ts";
import type { SelectableItem } from "../../src/selection/types.ts";
import type { WindowInputAdapter } from "../../src/input/WindowInputAdapter.ts";

const SHORT_TOKENS: MessageToken[] = [{ type: "text", value: "Hi", start: 0, end: 2 }];
const LONG_TOKENS: MessageToken[] = [
  { type: "text", value: "ABCDEFGHIJklmnop", start: 0, end: 16 },
];

const CHOICE_ITEMS: SelectableItem<string>[] = [
  { id: "0", label: "Continue", value: "continue", enabled: true },
  { id: "1", label: "Stop", value: "stop", enabled: true },
];

/** Mirrors SelectableWindow action binding with an external active gate. */
class ChoiceInputBridge {
  private readonly subscriptions: Array<{ unsubscribe: () => void }> = [];
  public active = false;
  public confirmCount = 0;
  public cancelCount = 0;

  public constructor(
    private readonly input: WindowInputAdapter,
    private readonly controller: SelectionController<string>,
  ) {
    this.subscriptions.push(
      input.subscribeAction((event) => {
        if (!this.active || event.phase !== "pressed") {
          return;
        }
        if (event.action === "confirm") {
          if (this.controller.confirm()) {
            this.confirmCount += 1;
          }
        } else if (event.action === "cancel") {
          this.controller.cancel();
          this.cancelCount += 1;
        }
      }),
    );
  }

  public dispose(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.length = 0;
  }
}


describe("exclusive input and fifty-iteration settlement", () => {
  test("only the active window consumes confirm and cancel", async () => {
    const input = new ManualWindowInput();
    let messageActive = false;
    const message = new MessageController(input, () => messageActive);
    const choiceController = new SelectionController<string>();
    choiceController.setItems(CHOICE_ITEMS);
    const choice = new ChoiceInputBridge(input, choiceController);

    messageActive = true;
    choice.active = false;
    const longPromise = message.start({
      tokens: LONG_TOKENS,
      charsPerSecond: 30,
      layoutPageBreaksByPage: [[10]],
    });
    message.update(16);
    const beforeChoiceConfirm = choice.confirmCount;
    input.pushAction("confirm");
    expect(message.getLatestSnapshot().revealedText.length).toBeGreaterThan(0);
    expect(choice.confirmCount).toBe(beforeChoiceConfirm);

    messageActive = false;
    choice.active = true;
    const beforeMessageComplete = message.getLatestSnapshot().completed;
    input.pushAction("cancel");
    expect(choice.cancelCount).toBe(1);
    expect(message.getLatestSnapshot().completed).toBe(beforeMessageComplete);

    message.cancelOperation("test-reset");
    await expect(longPromise).rejects.toThrow("test-reset");
    messageActive = true;
    choice.active = false;
    const sayPromise = message.start({ tokens: SHORT_TOKENS, charsPerSecond: 1000 });
    message.update(16);
    input.pushAction("confirm");
    const completed = await sayPromise;
    expect(completed.completed).toBe(true);
    expect(choice.confirmCount).toBe(beforeChoiceConfirm);

    choice.dispose();
    message.dispose("test");
  });

  test("gated shared input lets only one role react per confirm", () => {
    const input = new ManualWindowInput();
    let messageActive = true;
    let choiceActive = false;
    let messageConfirm = 0;
    let choiceConfirm = 0;

    input.subscribeAction((event) => {
      if (event.phase !== "pressed" || event.action !== "confirm") {
        return;
      }
      if (messageActive) {
        messageConfirm += 1;
      }
      if (choiceActive) {
        choiceConfirm += 1;
      }
    });

    input.pushAction("confirm");
    expect(messageConfirm).toBe(1);
    expect(choiceConfirm).toBe(0);
    expect(messageConfirm + choiceConfirm).toBe(1);

    messageActive = false;
    choiceActive = true;
    input.pushAction("confirm");
    expect(messageConfirm).toBe(1);
    expect(choiceConfirm).toBe(1);
    expect(messageConfirm + choiceConfirm).toBe(2);
  });

  test("fifty say→choose iterations keep shared adapter subscriptions stable", async () => {
    const input = new ManualWindowInput();
    let messageActive = false;
    const message = new MessageController(input, () => messageActive);
    const choiceController = new SelectionController<string>();
    const choice = new ChoiceInputBridge(input, choiceController);

    const idleActionCount = input.getSubscriptionCounts().action;
    expect(idleActionCount).toBe(1);

    for (let iteration = 0; iteration < 50; iteration += 1) {
      messageActive = true;
      choice.active = false;
      const sayPromise = message.start({ tokens: SHORT_TOKENS, charsPerSecond: 1000 });
      expect(input.getSubscriptionCounts().action).toBe(idleActionCount + 1);
      message.update(16);
      input.pushAction("confirm");
      await sayPromise;
      expect(message.isBusy()).toBe(false);
      expect(input.getSubscriptionCounts().action).toBe(idleActionCount);

      messageActive = false;
      choice.active = true;
      choiceController.setItems(CHOICE_ITEMS);
      let selected = false;
      const confirmSub = choiceController.onConfirm(() => {
        selected = true;
      });
      input.pushAction("confirm");
      expect(selected).toBe(true);
      confirmSub.unsubscribe();
      expect(input.getSubscriptionCounts().action).toBe(idleActionCount);
    }

    choice.dispose();
    message.dispose("test");
    expect(input.getSubscriptionCounts().action).toBe(0);
  });
});
