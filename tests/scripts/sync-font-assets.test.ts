import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FontArtifactError, syncFontAssets } from "../../scripts/sync-font-assets.ts";

const ROOT = join(import.meta.dir, "../..");
const REQUIRED_FILES = ["font.png", "font.xml", "report.json", "missing-characters.txt", "license.txt"] as const;

describe("sync-font-assets", () => {
  test("rejects stale artifact layouts before copying", () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "font-source-"));
    const fontDir = join(sourceRoot, "dist", "demo");
    mkdirSync(fontDir, { recursive: true });
    writeFileSync(join(fontDir, "font.fnt"), "stale");
    expect(() => syncFontAssets({ sourceRoot, fontId: "demo", destinationRoot: join(sourceRoot, "out") })).toThrow(
      FontArtifactError,
    );
    rmSync(sourceRoot, { recursive: true, force: true });
  });

  test("syncs valid upstream font artifacts", () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "font-source-"));
    const destinationRoot = mkdtempSync(join(tmpdir(), "font-dest-"));
    const fontId = "jf-dot-mplus12";
    const fontDir = join(sourceRoot, "dist", fontId);
    const fixtureDir = join(ROOT, "examples/assets/fonts", fontId);

    mkdirSync(fontDir, { recursive: true });
    for (const file of REQUIRED_FILES) {
      cpSync(join(fixtureDir, file), join(fontDir, file));
    }
    mkdirSync(join(sourceRoot, ".git"), { recursive: true });
    writeFileSync(join(sourceRoot, ".git", "HEAD"), "20fa374ba24d3d70ff7437ab39532f28261f45f5\n");

    try {
      const result = syncFontAssets({ sourceRoot, fontId, destinationRoot });
      const provenance = JSON.parse(readFileSync(result.provenancePath, "utf8")) as { fontId: string };
      expect(provenance.fontId).toBe(fontId);
      expect(readFileSync(join(result.destinationDir, "font.png")).length).toBeGreaterThan(0);
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
      rmSync(destinationRoot, { recursive: true, force: true });
    }
  });
});
