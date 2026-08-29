import { describe, expect, test } from "bun:test";
import { parseMessage } from "../../src/message/MessageParser.ts";

describe("parseMessage", () => {
  test("parses text, newline, page break, wait, pause, and escaping", () => {
    const result = parseMessage("Hello\n\f{wait:500}{pause}{{brace}");
    expect(result.tokens.map((token) => token.type)).toEqual([
      "text",
      "newline",
      "pageBreak",
      "wait",
      "pause",
      "text",
    ]);
    const wait = result.tokens.find((token) => token.type === "wait");
    expect(wait && wait.type === "wait" ? wait.ms : null).toBe(500);
  });

  test("keeps invalid waits as literal text", () => {
    const result = parseMessage("{wait:70000}");
    expect(result.tokens).toEqual([
      expect.objectContaining({ type: "text", value: "{wait:70000}" }),
    ]);
  });
});
