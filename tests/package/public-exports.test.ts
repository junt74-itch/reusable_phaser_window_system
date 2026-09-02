import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const DIST_JS = join(ROOT, "dist/index.js");
const DIST_DTS = join(ROOT, "dist/index.d.ts");
const PACKAGE_JSON = join(ROOT, "package.json");
const SCAN_DIRS = [join(ROOT, "src"), join(ROOT, "examples")];

const EXPECTED_EXPORTS = [
  "MessageWindow",
  "ChoiceWindow",
  "PhaserWindowInput",
  "resolveWindowTheme",
  "DEFAULT_BITMAP_FONT_ASSET",
  "MessageBusyError",
  "ChoiceBusyError",
  "MissingBitmapGlyphError",
  "MissingMessagePortraitError",
  "CommandWindow",
  "HelpWindow",
  "LogWindow",
  "DocumentWindow",
  "WindowFocusController",
  "FontSwapBusyError",
  "bindWindowA11y",
  "layoutWindowInViewport",
  "ScrollController",
  "ScrollableWindow",
  "ScrollbarRenderer",
  "NineSliceWindowRenderer",
  "createNineSliceWindowRenderer",
  "MissingWindowSkinError",
  "bindFocusControllerToScene",
  "SelectableWindow",
  "shouldStickToLatest",
  "layoutRichText",
];

const FORBIDDEN_INTERNAL_EXPORTS = [
  "assertMessageSayPreflight",
  "sayPreflight",
  "splitLineColorRuns",
  "computeLayoutPageBreaks",
  "toSelectableCommands",
  "ScrollContentClip",
  "ScrollOverflowIndicators",
  "isPointInContentViewport",
  "splitTextFontRuns",
  "stackedTextHeight",
  "flattenRichText",
  "scaleFontMetrics",
  "collectPageFlatStyles",
];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("public package surface", () => {
  test("package.json exports map targets built dist artifacts", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      exports: { ".": { import: string; types: string } };
      module: string;
      types: string;
    };
    expect(pkg.exports["."].import).toBe("./dist/index.js");
    expect(pkg.exports["."].types).toBe("./dist/index.d.ts");
    expect(pkg.module).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
  });

  test("built JS exposes expected public exports without bundling Phaser", () => {
    const bundle = readFileSync(DIST_JS, "utf8");
    for (const name of EXPECTED_EXPORTS) {
      expect(bundle.includes(name)).toBe(true);
    }
    expect(bundle.includes('from "phaser"')).toBe(true);
    expect(bundle.includes("phaser/dist/phaser.esm")).toBe(false);
    expect(bundle.length).toBeLessThan(200_000);
  });

  test("dist/index.d.ts has no any in public API", () => {
    const declarations = readFileSync(DIST_DTS, "utf8");
    expect(/\bany\b/.test(declarations)).toBe(false);
    for (const name of EXPECTED_EXPORTS) {
      expect(declarations.includes(name)).toBe(true);
    }
  });

  test("dist bundle does not export a custom font XML/JSON parser", () => {
    const bundle = readFileSync(DIST_JS, "utf8");
    expect(bundle.includes("parseXml")).toBe(false);
    expect(bundle.includes("DOMParser")).toBe(false);
    expect(bundle.includes("font.json")).toBe(false);
  });

  test("barrel does not re-export internal helpers", () => {
    const declarations = readFileSync(DIST_DTS, "utf8");
    for (const name of FORBIDDEN_INTERNAL_EXPORTS) {
      expect(declarations.includes(`export { ${name}`)).toBe(false);
      expect(declarations.includes(`export declare function ${name}`)).toBe(false);
      expect(declarations.includes(`export declare class ${name}`)).toBe(false);
    }
    expect(declarations.includes("from \"./message/sayPreflight")).toBe(false);
    expect(declarations.includes("from \"./scroll/scrollChrome")).toBe(false);
    expect(declarations.includes("from \"./text/fontFallback")).toBe(false);
  });

  test("source scan finds no Phaser Text construction in src/ or examples/", () => {
    const forbidden = [/add\.text\s*\(/, /make\.text\s*\(/, /GameObjects\.Text/];
    for (const dir of SCAN_DIRS) {
      for (const file of collectSourceFiles(dir)) {
        const source = readFileSync(file, "utf8");
        for (const pattern of forbidden) {
          expect(pattern.test(source)).toBe(false);
        }
      }
    }
  });
});
