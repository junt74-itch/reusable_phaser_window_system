import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

describe("HelpWindow isolation", () => {
  test("HelpWindow layouts BitmapText and clears empty help", () => {
    const source = readFileSync(join(ROOT, "src/help/HelpWindow.ts"), "utf8");
    expect(source.includes("extends TextWindowBase")).toBe(true);
    expect(source.includes("RichText")).toBe(true);
    expect(source.includes("setHelp(content: string | RichText | null)")).toBe(true);
    expect(source.includes("getHelp(): string | RichText | null")).toBe(true);
    expect(source.includes("layoutTextContent")).toBe(true);
    expect(source.includes("clearText()")).toBe(true);
    expect(source.includes("pageIndex === 0")).toBe(true);
    expect(source.includes('from "../command/')).toBe(false);
    expect(source.includes("class CommandWindow")).toBe(false);
  });

  test("setHelp accepts RichText and getHelp returns the same reference", () => {
    const source = readFileSync(join(ROOT, "src/help/HelpWindow.ts"), "utf8");
    expect(source.includes("flattenRichText(content).text.length")).toBe(true);
    expect(source.includes("? content : null")).toBe(true);
    expect(source.includes("return this.source")).toBe(true);
  });

  test("empty string and empty RichText spans clear text", () => {
    const source = readFileSync(join(ROOT, "src/help/HelpWindow.ts"), "utf8");
    expect(source.includes("content.length > 0 ? content : null")).toBe(true);
    expect(source.includes("flattenRichText(content).text.length > 0 ? content : null")).toBe(true);
    expect(source.includes("this.clearText()")).toBe(true);
  });

  test("CommandWindow has no hard HelpWindow dependency", () => {
    const command = readFileSync(join(ROOT, "src/command/CommandWindow.ts"), "utf8");
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(command.includes('from "../help/')).toBe(false);
    expect(command.includes("class HelpWindow")).toBe(false);
    expect(windowBase.includes("HelpWindow")).toBe(false);
    expect(windowBase.includes("setHelp")).toBe(false);
  });
});
