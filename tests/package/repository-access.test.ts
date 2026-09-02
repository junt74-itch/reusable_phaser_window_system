import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

describe("repository source and documentation access", () => {
  test("root source entry point delegates only to the public source barrel", () => {
    const source = readFileSync(join(ROOT, "index.ts"), "utf8");
    expect(source.includes('export * from "./src/index.ts"')).toBe(true);
    expect(source.includes("./src/core/")).toBe(false);
    expect(source.includes("./src/message/")).toBe(false);
  });

  test("submodule consumer uses the stable root source entry point", () => {
    const fixture = readFileSync(join(ROOT, "examples/consumer/submodule-source.ts"), "utf8");
    expect(fixture.includes('from "../../index.ts"')).toBe(true);
    expect(fixture.includes("../../src/")).toBe(false);
  });

  test("documentation has discoverable specification, submodule, API, and source-map entry points", () => {
    const required = [
      "docs/README.md",
      "docs/SPECIFICATION.md",
      "docs/SUBMODULE.md",
      "docs/API.md",
      "src/README.md",
    ];
    for (const path of required) {
      expect(existsSync(join(ROOT, path))).toBe(true);
    }
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme.includes("docs/SUBMODULE.md")).toBe(true);
    expect(readme.includes("docs/SPECIFICATION.md")).toBe(true);
    expect(readme.includes("docs/README.md")).toBe(true);
  });

  test("implementation plans are isolated from consumer-facing documentation", () => {
    const planFiles = [
      "IMPLEMENTATION_PLAN.md",
      "PHASE1_CLOSEOUT_PLAN.md",
      "PHASE2_IMPLEMENTATION_PLAN.md",
      "reusable-phaser4-window-system_IMPLEMENTATION_PLAN.md",
      "TEXT_PADDING_AND_CHROMELESS_PLAN.md",
    ];
    for (const name of planFiles) {
      expect(existsSync(join(ROOT, "docs/plan", name))).toBe(true);
      expect(existsSync(join(ROOT, "docs", name))).toBe(false);
    }
    expect(existsSync(join(ROOT, "reusable-phaser4-window-system_IMPLEMENTATION_PLAN.md"))).toBe(
      false,
    );
    const planIndex = readFileSync(join(ROOT, "docs/plan/README.md"), "utf8");
    expect(planIndex.includes("ゲーム援用者向けの仕様書ではありません")).toBe(true);
  });
});
