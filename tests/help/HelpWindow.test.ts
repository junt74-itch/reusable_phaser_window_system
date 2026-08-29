import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

describe("HelpWindow isolation", () => {
  test("HelpWindow layouts BitmapText and clears empty help", () => {
    const source = readFileSync(join(ROOT, "src/help/HelpWindow.ts"), "utf8");
    expect(source.includes("extends TextWindowBase")).toBe(true);
    expect(source.includes("setHelp(text: string | null)")).toBe(true);
    expect(source.includes("layoutTextContent")).toBe(true);
    expect(source.includes("clearText()")).toBe(true);
    expect(source.includes("pageIndex === 0")).toBe(true);
    expect(source.includes('from "../command/')).toBe(false);
    expect(source.includes("class CommandWindow")).toBe(false);
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
