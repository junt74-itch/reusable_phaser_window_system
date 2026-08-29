#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REQUIRED_FILES = [
  "font.png",
  "font.xml",
  "report.json",
  "missing-characters.txt",
  "license.txt",
] as const;

const STALE_MARKERS = ["font.fnt", "font.json"];

export interface SyncFontOptions {
  readonly sourceRoot: string;
  readonly fontId: string;
  readonly destinationRoot?: string;
}

export interface SyncFontResult {
  readonly fontId: string;
  readonly destinationDir: string;
  readonly provenancePath: string;
}

export class FontArtifactError extends Error {
  public override readonly name = "FontArtifactError";
}

export function syncFontAssets(options: SyncFontOptions): SyncFontResult {
  const sourceDir = join(options.sourceRoot, "dist", options.fontId);
  const destinationRoot = options.destinationRoot ?? join(process.cwd(), "examples/assets/fonts");
  const destinationDir = join(destinationRoot, options.fontId);
  const tempDir = `${destinationDir}.tmp`;

  validateSourceDirectory(sourceDir, options.fontId);
  const report = readReport(sourceDir);
  validateReport(report, sourceDir, options.fontId);

  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  mkdirSync(tempDir, { recursive: true });

  const hashes: Record<string, string> = {};
  for (const fileName of REQUIRED_FILES) {
    const sourcePath = join(sourceDir, fileName);
    const destinationPath = join(tempDir, fileName);
    cpSync(sourcePath, destinationPath);
    hashes[fileName] = sha256(readFileSync(sourcePath));
  }

  const commit = detectGitCommit(options.sourceRoot);
  const provenance = {
    upstreamUrl: "https://github.com/junt74-itch/reusable_pixel_font_builder",
    upstreamCommit: commit,
    fontId: options.fontId,
    sourceRelativeDir: relative(options.sourceRoot, sourceDir),
    syncedAt: new Date().toISOString(),
    files: Object.entries(hashes).map(([file, sha256]) => ({
      file,
      sha256,
    })),
  };
  const provenancePath = join(tempDir, "provenance.json");
  writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

  if (existsSync(destinationDir)) {
    rmSync(destinationDir, { recursive: true, force: true });
  }
  cpSync(tempDir, destinationDir, { recursive: true });
  rmSync(tempDir, { recursive: true, force: true });

  return { fontId: options.fontId, destinationDir, provenancePath: join(destinationDir, "provenance.json") };
}

function validateSourceDirectory(sourceDir: string, fontId: string): void {
  if (!existsSync(sourceDir)) {
    throw new FontArtifactError(`Font source directory not found: ${sourceDir}`);
  }
  for (const stale of STALE_MARKERS) {
    if (existsSync(join(sourceDir, stale))) {
      throw new FontArtifactError(
        `Stale artifact layout detected (${stale}). Expected Phaser-standard font.png + font.xml output.`,
      );
    }
  }
  for (const fileName of REQUIRED_FILES) {
    if (!existsSync(join(sourceDir, fileName))) {
      throw new FontArtifactError(`Missing required file "${fileName}" in ${sourceDir}.`);
    }
  }
  const siblings = readdirSync(sourceDir);
  if (siblings.some((name) => name.startsWith("atlas-") && name.endsWith(".png"))) {
    throw new FontArtifactError("Stale multi-atlas layout detected (atlas-*.png).");
  }
  const xml = readFileSync(join(sourceDir, "font.xml"), "utf8");
  if (!xml.includes("<font>")) {
    throw new FontArtifactError("font.xml root element must be <font>.");
  }
  const pageMatches = [...xml.matchAll(/<page[^>]*file="([^"]+)"/g)];
  if (pageMatches.length !== 1) {
    throw new FontArtifactError("font.xml must declare exactly one page.");
  }
  const pageFile = pageMatches[0]?.[1];
  if (pageFile !== "font.png") {
    throw new FontArtifactError(`font.xml page file must be font.png, got "${pageFile ?? "unknown"}".`);
  }
  void fontId;
}

interface FontReport {
  page_count?: number;
  atlas_size?: number;
  validation?: Record<string, boolean>;
}

function readReport(sourceDir: string): FontReport {
  return JSON.parse(readFileSync(join(sourceDir, "report.json"), "utf8")) as FontReport;
}

function validateReport(report: FontReport, sourceDir: string, fontId: string): void {
  if (report.page_count !== 1) {
    throw new FontArtifactError(`report.page_count must be 1 for ${fontId}.`);
  }
  const xml = readFileSync(join(sourceDir, "font.xml"), "utf8");
  const commonMatch = xml.match(/scaleW="(\d+)" scaleH="(\d+)"/);
  const scaleW = Number(commonMatch?.[1]);
  const scaleH = Number(commonMatch?.[2]);
  const png = readFileSync(join(sourceDir, "font.png"));
  // PNG IHDR width/height at bytes 16..24
  const pngWidth = png.readUInt32BE(16);
  const pngHeight = png.readUInt32BE(20);
  if (scaleW !== pngWidth || scaleH !== pngHeight) {
    throw new FontArtifactError("PNG dimensions do not match font.xml common page size.");
  }
  if (report.atlas_size !== undefined && (scaleW !== report.atlas_size || scaleH !== report.atlas_size)) {
    throw new FontArtifactError("report.atlas_size does not match atlas dimensions.");
  }
  for (const [flag, value] of Object.entries(report.validation ?? {})) {
    if (value !== true) {
      throw new FontArtifactError(`report.validation.${flag} must be true.`);
    }
  }
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function detectGitCommit(sourceRoot: string): string {
  const headPath = join(sourceRoot, ".git", "HEAD");
  if (!existsSync(headPath)) {
    throw new FontArtifactError("Unable to detect upstream commit from source checkout.");
  }
  const head = readFileSync(headPath, "utf8").trim();
  if (head.startsWith("ref: ")) {
    const refPath = join(sourceRoot, ".git", head.slice(5).trim());
    return readFileSync(refPath, "utf8").trim();
  }
  return head;
}

function parseArgs(argv: string[]): SyncFontOptions {
  let sourceRoot = "";
  let fontId = "jf-dot-mplus12";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") {
      sourceRoot = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--font") {
      fontId = argv[index + 1] ?? fontId;
      index += 1;
    }
  }
  if (sourceRoot.length === 0) {
    throw new FontArtifactError("Missing required --source <local reusable_pixel_font_builder checkout>.");
  }
  return { sourceRoot: resolve(sourceRoot), fontId };
}

if (import.meta.main) {
  const result = syncFontAssets(parseArgs(process.argv.slice(2)));
  console.log(`Synced ${result.fontId} -> ${result.destinationDir}`);
}
