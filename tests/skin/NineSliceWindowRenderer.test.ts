import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MissingWindowSkinError } from "../../src/skin/types.ts";

const ROOT = resolve(import.meta.dir, "../..");

describe("NineSliceWindowRenderer", () => {
  test("missing texture error is typed and names the key", () => {
    const error = new MissingWindowSkinError("window-placeholder");
    expect(error.name).toBe("MissingWindowSkinError");
    expect(error.textureKey).toBe("window-placeholder");
    expect(error.message).toContain("window-placeholder");
  });

  test("WindowBase has no skin import and uses createRenderer only", () => {
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(windowBase.includes("skin/")).toBe(false);
    expect(windowBase.includes("NineSlice")).toBe(false);
    expect(windowBase.includes("createRenderer")).toBe(true);
  });

  test("placeholder skin is repo-owned and not RMMZ Window.png", () => {
    const provenance = readFileSync(join(ROOT, "examples/assets/skins/provenance.json"), "utf8");
    const scene = readFileSync(join(ROOT, "examples/scenes/NineSliceScene.ts"), "utf8");
    expect(provenance.includes("Not derived from RPG Maker Window.png")).toBe(true);
    expect(scene.includes("Window.png")).toBe(false);
    expect(scene.includes("createNineSliceWindowRenderer")).toBe(true);
    expect(scene.includes("createRenderer")).toBe(true);
    expect(existsSync(join(ROOT, "examples/assets/skins/window-placeholder.png"))).toBe(true);
  });

  test("renderer uses Phaser 4.2.1 nineslice factory and nearest sampling", () => {
    const source = readFileSync(join(ROOT, "src/skin/NineSliceWindowRenderer.ts"), "utf8");
    expect(source.includes("scene.add.nineslice")).toBe(true);
    expect(source.includes("FilterMode.NEAREST")).toBe(true);
    expect(source.includes("textures.exists")).toBe(true);
    expect(source.includes("setOrigin(0, 0)")).toBe(true);
    expect(source.includes("GraphicsWindowRenderer")).toBe(false);
  });
});
