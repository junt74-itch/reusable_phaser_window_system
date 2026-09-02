import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseMessage } from "../../src/message/MessageParser.ts";
import { buildFlatTextFromTokens } from "../../src/message/layoutPages.ts";
import {
  buildRawIndexStyles,
  collectPageFlatStyles,
  richTextFromFlat,
} from "../../src/message/richTextStyles.ts";
import { flattenRichText } from "../../src/text/richText.ts";

const ROOT = resolve(import.meta.dir, "../..");
const MESSAGE_WINDOW = readFileSync(join(ROOT, "src/message/MessageWindow.ts"), "utf8");

describe("collectPageFlatStyles", () => {
  test("maps styles to visible text only and skips color directives", () => {
    const content = {
      spans: [{ text: "a{color:FF0000}" }, { text: "b", fontSize: 24 }],
    };
    const raw = flattenRichText(content).text;
    const tokens = parseMessage(raw).tokens;
    const flat = buildFlatTextFromTokens(tokens);
    expect(flat).toBe("ab");
    const styles = collectPageFlatStyles(tokens, content);
    expect(styles).toEqual([{}, { fontSize: 24 }]);
  });

  test("preserves fontKey and fontSize on the same span", () => {
    const content = {
      spans: [{ text: "x", fontKey: "other-font", fontSize: 18 }],
    };
    const tokens = parseMessage("x").tokens;
    expect(collectPageFlatStyles(tokens, content)).toEqual([
      { fontKey: "other-font", fontSize: 18 },
    ]);
  });

  test("assigns the same style to both UTF-16 code units of an emoji", () => {
    const emoji = "😀";
    const content = { spans: [{ text: emoji, fontSize: 20 }] };
    const raw = flattenRichText(content).text;
    expect(raw.length).toBe(2);
    const rawStyles = buildRawIndexStyles(content, raw);
    expect(rawStyles).toEqual([{ fontSize: 20 }, { fontSize: 20 }]);
    const tokens = parseMessage(raw).tokens;
    expect(collectPageFlatStyles(tokens, content)).toEqual([{ fontSize: 20 }, { fontSize: 20 }]);
  });
});

describe("richTextFromFlat", () => {
  test("merges consecutive code units with the same style into one span", () => {
    const result = richTextFromFlat("abc", [{ fontSize: 12 }, { fontSize: 12 }, { fontSize: 24 }]);
    expect(result).toEqual({
      spans: [{ text: "ab", fontSize: 12 }, { text: "c", fontSize: 24 }],
    });
  });

  test("preserves align on the returned RichText", () => {
    const result = richTextFromFlat("hi", [{}, {}], "center");
    expect(result).toEqual({
      align: "center",
      spans: [{ text: "hi" }],
    });
  });
});

describe("MessageWindow rich-text contract", () => {
  test("say accepts string or RichText content", () => {
    expect(MESSAGE_WINDOW.includes("content: string | RichText")).toBe(true);
  });

  test("renderRevealed uses line.runs and scaleFontMetrics", () => {
    const start = MESSAGE_WINDOW.indexOf("private renderRevealed(");
    const body = MESSAGE_WINDOW.slice(start, MESSAGE_WINDOW.indexOf("private updateSpeakerLine("));
    expect(body.includes("line.runs")).toBe(true);
    expect(body.includes("scaleFontMetrics(")).toBe(true);
  });

  test("renderRevealed does not split lines with splitTextFontRuns", () => {
    expect(MESSAGE_WINDOW.includes("splitTextFontRuns")).toBe(false);
  });

  test("speaker line keeps theme.text.fontSize", () => {
    const start = MESSAGE_WINDOW.indexOf("private updateSpeakerLine(");
    const body = MESSAGE_WINDOW.slice(start, MESSAGE_WINDOW.indexOf("private redrawPauseIndicator("));
    expect(body.includes("style.fontSize")).toBe(true);
  });

  test("MessageWindow avoids Phaser Text fallbacks", () => {
    expect(MESSAGE_WINDOW.includes("add.text")).toBe(false);
    expect(MESSAGE_WINDOW.includes("Arial")).toBe(false);
    expect(MESSAGE_WINDOW.includes("{font")).toBe(false);
  });
});
