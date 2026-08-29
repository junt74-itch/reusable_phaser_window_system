import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { ALL_SCENE_KEYS, PHASE2_SCENE_KEYS } from "../../examples/sceneKeys.ts";

const ROOT = resolve(import.meta.dir, "../..");
const EXAMPLES = join(ROOT, "examples");
const SCENES_DIR = join(EXAMPLES, "scenes");
const WINDOW_BASE = join(ROOT, "src/core/WindowBase.ts");

const TEXT_FORBIDDEN = [/add\.text\s*\(/, /make\.text\s*\(/, /GameObjects\.Text/];

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("sandbox scene routes", () => {
  test("main.ts registers every documented scene key", () => {
    const main = readFileSync(join(EXAMPLES, "main.ts"), "utf8");
    expect(main.includes("from \"./sceneKeys.ts\"")).toBe(true);
    for (const key of ALL_SCENE_KEYS) {
      const mapped = new RegExp(`["']?${key}["']?\\s*:`).test(main);
      expect(mapped).toBe(true);
    }
    for (const key of PHASE2_SCENE_KEYS) {
      expect(ALL_SCENE_KEYS.includes(key)).toBe(true);
    }
  });

  test("on-canvas logs use BitmapText and scenes share font preload", () => {
    const sceneFiles = collectTsFiles(SCENES_DIR);
    const logScenes = sceneFiles.filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("logText") || source.includes("hintText");
    });
    expect(logScenes.length).toBeGreaterThan(0);
    for (const file of logScenes) {
      const source = readFileSync(file, "utf8");
      expect(source.includes("bitmapText")).toBe(true);
      expect(source.includes("add.text")).toBe(false);
    }
    const fontScenes = sceneFiles.filter((file) =>
      readFileSync(file, "utf8").includes("DEFAULT_BITMAP_FONT_ASSET"),
    );
    for (const file of fontScenes) {
      const source = readFileSync(file, "utf8");
      expect(source.includes("preloadDefaultBitmapFont")).toBe(true);
    }
  });

  test("examples create no Phaser Text", () => {
    for (const file of collectTsFiles(EXAMPLES)) {
      const source = readFileSync(file, "utf8");
      for (const pattern of TEXT_FORBIDDEN) {
        expect(pattern.test(source)).toBe(false);
      }
    }
  });
});

describe("TASK-180 isolation", () => {
  test("WindowBase has no scroll/skin/focus/portrait/command/log/document/a11y/layout API", () => {
    const source = readFileSync(WINDOW_BASE, "utf8");
    expect(source.includes("subscribeTransition")).toBe(true);
    expect(source.includes("createRenderer")).toBe(true);
    expect(source.includes("ScrollController")).toBe(false);
    expect(source.includes("NineSlice")).toBe(false);
    expect(source.includes("skin/")).toBe(false);
    expect(source.includes("WindowFocusController")).toBe(false);
    expect(source.includes("portrait")).toBe(false);
    expect(source.includes("chooseCommands")).toBe(false);
    expect(source.includes("LogWindow")).toBe(false);
    expect(source.includes("DocumentWindow")).toBe(false);
    expect(source.includes("fontKeys")).toBe(false);
    expect(source.includes("bindWindowA11y")).toBe(false);
    expect(source.includes("layoutWindowInViewport")).toBe(false);
    expect(source.includes("cameras")).toBe(false);
  });

  test("preload helper and scene keys stay Phaser-runtime-free", () => {
    const preload = readFileSync(join(EXAMPLES, "preloadDefaultBitmapFont.ts"), "utf8");
    const keys = readFileSync(join(EXAMPLES, "sceneKeys.ts"), "utf8");
    expect(preload.includes('from "phaser"')).toBe(true);
    expect(preload.includes("import type Phaser")).toBe(true);
    expect(keys.includes("phaser")).toBe(false);
    expect(keys.includes("add.text")).toBe(false);
  });
});
