import { describe, expect, test } from "bun:test";
import { ManualWindowInput } from "../helpers/ManualWindowInput.ts";
import { MessageController } from "../../src/message/MessageController.ts";
import { WindowOperationCancelledError } from "../../src/core/types.ts";
import type { MessageToken } from "../../src/message/types.ts";

const PENDING_TOKENS: MessageToken[] = [
  { type: "text", value: "ABCDEFGHIJklmnop", start: 0, end: 16 },
];

describe("pending operation settlement", () => {
  test("MessageController dispose settles an in-flight say once", async () => {
    const input = new ManualWindowInput();
    const message = new MessageController(input, () => true);
    const pending = message.start({
      tokens: PENDING_TOKENS,
      charsPerSecond: 30,
      layoutPageBreaksByPage: [[10]],
    });
    message.dispose("destroyed");
    await expect(pending).rejects.toBeInstanceOf(WindowOperationCancelledError);
    await expect(pending).rejects.toThrow("destroyed");
    message.dispose("ignored");
  });

  test("cancel after dispose does not double-settle", async () => {
    const message = new MessageController(null);
    const pending = message.start({ tokens: PENDING_TOKENS, charsPerSecond: 30 });
    message.dispose("destroyed");
    message.cancelOperation("ignored");
    await expect(pending).rejects.toThrow("destroyed");
  });
});
