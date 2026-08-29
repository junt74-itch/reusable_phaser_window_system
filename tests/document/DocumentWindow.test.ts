import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stackedTextHeight } from "../../src/text/stackedText.ts";

const ROOT = resolve(import.meta.dir, "../..");

describe("DocumentWindow isolation", () => {
  test("layouts the full document on a ScrollableWindow body", () => {
    const source = readFileSync(join(ROOT, "src/document/DocumentWindow.ts"), "utf8");
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(source.includes("extends ScrollableWindow")).toBe(true);
    expect(source.includes("setDocument(text: string)")).toBe(true);
    expect(source.includes("layoutText")).toBe(true);
    expect(source.includes("setScrollContentSize")).toBe(true);
    expect(source.includes("setScrollOffset(0)")).toBe(true);
    expect(source.includes("say(")).toBe(false);
    expect(source.includes("add.text")).toBe(false);
    expect(windowBase.includes("setDocument")).toBe(false);
    expect(windowBase.includes("DocumentWindow")).toBe(false);
    expect(windowBase.includes("document/")).toBe(false);
  });

  test("document height stacks wrapped lines for scrolling", () => {
    expect(stackedTextHeight(160, 16)).toBe(176);
  });
});
