import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FontArtifactError, syncFontAssets } from "../../scripts/sync-font-assets.ts";

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
    const result = syncFontAssets({
      sourceRoot: "D:/projects/reusable/reusable_pixel_font_builder",
      fontId: "jf-dot-mplus12",
      destinationRoot: mkdtempSync(join(tmpdir(), "font-dest-")),
    });
    const provenance = JSON.parse(readFileSync(result.provenancePath, "utf8")) as { fontId: string };
    expect(provenance.fontId).toBe("jf-dot-mplus12");
    expect(readFileSync(join(result.destinationDir, "font.png")).length).toBeGreaterThan(0);
    rmSync(result.destinationDir, { recursive: true, force: true });
  });
});
