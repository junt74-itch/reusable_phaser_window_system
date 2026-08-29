import { describe, expect, test } from "bun:test";
import { ManualWindowInput } from "../helpers/ManualWindowInput.ts";
import { MessageController } from "../../src/message/MessageController.ts";
import type { MessageToken } from "../../src/message/types.ts";

const tokens: MessageToken[] = [{ type: "text", value: "Hello", start: 0, end: 5 }];

describe("MessageController", () => {
  test("ignores input when canConsumeInput returns false", () => {
    const input = new ManualWindowInput();
    let canConsume = false;
    const controller = new MessageController(input, () => canConsume);
    void controller.start({ tokens, charsPerSecond: 60 });
    input.pushAction("confirm");
    expect(controller.getLatestSnapshot().revealedText).toBe("");
    canConsume = true;
    input.pushAction("confirm");
    expect(controller.getLatestSnapshot().revealedText).toBe("Hello");
  });

  test("cancelOperation settles once", async () => {
    const controller = new MessageController(null);
    const pending = controller.start({ tokens, charsPerSecond: 30 });
    controller.cancelOperation("test");
    await expect(pending).rejects.toThrow("test");
    controller.cancelOperation("ignored");
  });

  test("layout page breaks pause until confirm advances layout page", () => {
    const longTokens: MessageToken[] = [
      { type: "text", value: "ABCDEFGHIJklmnop", start: 0, end: 16 },
    ];
    const controller = new MessageController(null);
    void controller.start({
      tokens: longTokens,
      charsPerSecond: 120,
      layoutPageBreaksByPage: [[10]],
    });
    for (let step = 0; step < 20; step += 1) {
      controller.update(16);
      if (controller.getLatestSnapshot().pausedForAdvance) {
        break;
      }
    }
    expect(controller.getLatestSnapshot().revealedText).toBe("ABCDEFGHIJ");
    expect(controller.getLatestSnapshot().layoutPageIndex).toBe(0);
  });

  test("confirm while typing stops at the next layout boundary like skip", () => {
    const longTokens: MessageToken[] = [
      { type: "text", value: "ABCDEFGHIJklmnop", start: 0, end: 16 },
    ];
    const layoutPageBreaksByPage = [[10]];
    const input = new ManualWindowInput();
    const controller = new MessageController(input);
    void controller.start({
      tokens: longTokens,
      charsPerSecond: 120,
      layoutPageBreaksByPage,
    });
    controller.update(16);
    input.pushAction("confirm");
    expect(controller.getLatestSnapshot().revealedText).toBe("ABCDEFGHIJ");
    expect(controller.getLatestSnapshot().pausedForAdvance).toBe(true);
    expect(controller.getLatestSnapshot().layoutPageIndex).toBe(0);
  });
});
