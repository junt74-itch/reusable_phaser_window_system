import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { shouldStickToLatest } from "../../src/log/stickToLatest.ts";
import { stackedTextHeight } from "../../src/text/stackedText.ts";

const ROOT = resolve(import.meta.dir, "../..");

describe("shouldStickToLatest", () => {
  test("sticks only when already at the bottom", () => {
    expect(shouldStickToLatest(0, 0)).toBe(true);
    expect(shouldStickToLatest(80, 80)).toBe(true);
    expect(shouldStickToLatest(40, 80)).toBe(false);
  });
});

describe("LogWindow isolation", () => {
  test("composes ScrollableWindow and does not add a WindowBase log API", () => {
    const source = readFileSync(join(ROOT, "src/log/LogWindow.ts"), "utf8");
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(source.includes("extends ScrollableWindow")).toBe(true);
    expect(source.includes("append(line: string)")).toBe(true);
    expect(source.includes("clear()")).toBe(true);
    expect(source.includes("shouldStickToLatest")).toBe(true);
    expect(source.includes("layoutText")).toBe(true);
    expect(source.includes("destroyLabels()")).toBe(true);
    expect(source.includes("add.text")).toBe(false);
    expect(windowBase.includes("append(")).toBe(false);
    expect(windowBase.includes("LogWindow")).toBe(false);
    expect(windowBase.includes("log/")).toBe(false);
  });

  test("stacked log height includes the last line box", () => {
    expect(stackedTextHeight(undefined, 16)).toBe(0);
    expect(stackedTextHeight(32, 16)).toBe(48);
  });
});
