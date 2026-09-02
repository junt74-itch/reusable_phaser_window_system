import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertCommandChoiceReady, toSelectableCommands } from "../../src/command/commandItems.ts";
import {
  CommandBusyError,
  CommandConfigurationError,
  type CommandItem,
} from "../../src/command/types.ts";

const ROOT = resolve(import.meta.dir, "../..");

const ATTACK: CommandItem = { id: "attack", label: "Attack", enabled: true };
const ITEM: CommandItem = { id: "item", label: "Item", enabled: true };
const DISABLED: CommandItem = { id: "swap", label: "Swap", enabled: false };

describe("commandItems", () => {
  test("rejects busy, empty, and all-disabled lists", () => {
    expect(() => assertCommandChoiceReady([ATTACK], true)).toThrow(CommandBusyError);
    expect(() => assertCommandChoiceReady([], false)).toThrow(CommandConfigurationError);
    expect(() => assertCommandChoiceReady([DISABLED], false)).toThrow(CommandConfigurationError);
    expect(() => assertCommandChoiceReady([ATTACK, ITEM], false)).not.toThrow();
  });

  test("maps records to selectable items without invoking handlers", () => {
    const mapped = toSelectableCommands([ATTACK]);
    expect(mapped[0]).toEqual({
      id: "attack",
      label: "Attack",
      value: ATTACK,
      enabled: true,
    });
  });
});

describe("CommandWindow isolation", () => {
  test("CommandItem.label is string | RichText", () => {
    const types = readFileSync(join(ROOT, "src/command/types.ts"), "utf8");
    expect(types.includes("label: string | RichText")).toBe(true);
  });

  test("WindowBase gained no command API", () => {
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(windowBase.includes("command/")).toBe(false);
    expect(windowBase.includes("CommandWindow")).toBe(false);
    expect(windowBase.includes("chooseCommands")).toBe(false);
  });

  test("CommandWindow does not import HelpWindow or call application handlers", () => {
    const source = readFileSync(join(ROOT, "src/command/CommandWindow.ts"), "utf8");
    expect(source.includes('from "../help/')).toBe(false);
    expect(source.includes("class HelpWindow")).toBe(false);
    expect(/\.handler\s*\(/.test(source)).toBe(false);
    expect(source.includes("chooseCommands")).toBe(true);
    expect(source.includes("extends SelectableWindow")).toBe(true);
    expect(source.includes("onHighlight")).toBe(true);
  });

  test("scene binds help from highlight without a WindowBase back-pointer", () => {
    const scene = readFileSync(join(ROOT, "examples/scenes/CommandHelpScene.ts"), "utf8");
    expect(scene.includes("onHighlight")).toBe(true);
    expect(scene.includes("setHelp")).toBe(true);
    expect(scene.includes("chooseCommands")).toBe(true);
  });
});
