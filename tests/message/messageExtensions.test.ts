import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { WindowDestroyedError, WindowLayoutError } from "../../src/core/types.ts";
import { splitLineColorRuns } from "../../src/message/colorRuns.ts";
import { MessageBusyError } from "../../src/message/MessageController.ts";
import {
  assertMessageSayPreflight,
  portraitReservedWidth,
  resolveMessageSayPortrait,
} from "../../src/message/sayPreflight.ts";
import { MissingMessagePortraitError } from "../../src/message/types.ts";

const ROOT = resolve(import.meta.dir, "../..");
const PORTRAIT = { textureKey: "face", width: 48, height: 48 };

describe("splitLineColorRuns", () => {
  test("groups consecutive glyphs that share a tint", () => {
    const runs = splitLineColorRuns("ABC", 0, [0xff0000, 0xff0000, 0x00ff00]);
    expect(runs).toEqual([
      { text: "AB", color: 0xff0000 },
      { text: "C", color: 0x00ff00 },
    ]);
  });
});

describe("assertMessageSayPreflight", () => {
  test("rejects busy before consulting the texture atlas", () => {
    let textureLookups = 0;
    expect(() =>
      assertMessageSayPreflight({
        destroyed: false,
        busy: true,
        portrait: PORTRAIT,
        textureExists: () => {
          textureLookups += 1;
          return false;
        },
        contentWidth: 200,
      }),
    ).toThrow(MessageBusyError);
    expect(textureLookups).toBe(0);
  });

  test("rejects destroyed before busy or texture checks", () => {
    let textureLookups = 0;
    expect(() =>
      assertMessageSayPreflight({
        destroyed: true,
        busy: true,
        portrait: PORTRAIT,
        textureExists: () => {
          textureLookups += 1;
          return true;
        },
        contentWidth: 200,
      }),
    ).toThrow(WindowDestroyedError);
    expect(textureLookups).toBe(0);
  });

  test("rejects a missing portrait texture without treating it as busy", () => {
    expect(() =>
      assertMessageSayPreflight({
        destroyed: false,
        busy: false,
        portrait: PORTRAIT,
        textureExists: () => false,
        contentWidth: 200,
      }),
    ).toThrow(MissingMessagePortraitError);
  });

  test("rejects a portrait that leaves no room for body text", () => {
    expect(() =>
      assertMessageSayPreflight({
        destroyed: false,
        busy: false,
        portrait: { textureKey: "face", width: 200, height: 48 },
        textureExists: () => true,
        contentWidth: 200,
      }),
    ).toThrow(WindowLayoutError);
  });

  test("allows a null portrait without texture lookup", () => {
    let textureLookups = 0;
    assertMessageSayPreflight({
      destroyed: false,
      busy: false,
      portrait: null,
      textureExists: () => {
        textureLookups += 1;
        return false;
      },
      contentWidth: 200,
    });
    expect(textureLookups).toBe(0);
  });

  test("resolveMessageSayPortrait keeps an explicit null over the default", () => {
    expect(resolveMessageSayPortrait(null, PORTRAIT)).toBeNull();
    expect(resolveMessageSayPortrait(undefined, PORTRAIT)).toEqual(PORTRAIT);
    expect(portraitReservedWidth(PORTRAIT)).toBe(56);
  });

  test("accepts a loaded portrait that leaves room for body text", () => {
    assertMessageSayPreflight({
      destroyed: false,
      busy: false,
      portrait: PORTRAIT,
      textureExists: (key) => key === "face",
      contentWidth: 200,
    });
  });
});

describe("message extension isolation", () => {
  test("WindowBase has no portrait, auto-advance, or audio API", () => {
    const windowBase = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(windowBase.includes("portrait")).toBe(false);
    expect(windowBase.includes("autoAdvance")).toBe(false);
    expect(windowBase.includes("onType")).toBe(false);
    expect(windowBase.includes("MissingMessagePortraitError")).toBe(false);
  });

  test("MessageWindow owns portrait Image and does not use Phaser Text", () => {
    const source = readFileSync(join(ROOT, "src/message/MessageWindow.ts"), "utf8");
    expect(source.includes("scene.add.image")).toBe(true);
    expect(source.includes("MissingMessagePortraitError")).toBe(true);
    expect(source.includes("autoAdvanceMs")).toBe(true);
    expect(source.includes("add.text")).toBe(false);
  });

  test("say() runs preflight before mutating speaker, portrait, or autoOpen", () => {
    const source = readFileSync(join(ROOT, "src/message/MessageWindow.ts"), "utf8");
    const sayStart = source.indexOf("public say(");
    const sayBody = source.slice(sayStart, source.indexOf("public override update("));
    const preflightAt = sayBody.indexOf("assertMessageSayPreflight");
    expect(preflightAt).toBeGreaterThan(-1);
    expect(sayBody.indexOf("this.sourceText = rawText")).toBeGreaterThan(preflightAt);
    expect(sayBody.indexOf("this.currentSpeaker = speaker")).toBeGreaterThan(preflightAt);
    expect(sayBody.indexOf("this.applyPortrait(portrait)")).toBeGreaterThan(preflightAt);
    expect(sayBody.indexOf("this.open()")).toBeGreaterThan(preflightAt);
    expect(sayBody.indexOf("this.activate()")).toBeGreaterThan(preflightAt);
  });

  test("applyPortrait confirms the texture exists before destroying the current Image", () => {
    const source = readFileSync(join(ROOT, "src/message/MessageWindow.ts"), "utf8");
    const applyStart = source.indexOf("private applyPortrait(");
    const applyBody = source.slice(applyStart, source.indexOf("private layoutPortrait("));
    const existsAt = applyBody.indexOf("textures.exists");
    const destroyAt = applyBody.indexOf("this.destroyPortrait()");
    expect(existsAt).toBeGreaterThan(-1);
    expect(destroyAt).toBeGreaterThan(existsAt);
    expect(applyBody.indexOf("this.activePortrait = portrait")).toBeGreaterThan(destroyAt);
  });

  test("missing portrait error names the texture key", () => {
    const error = new MissingMessagePortraitError("face");
    expect(error.name).toBe("MissingMessagePortraitError");
    expect(error.textureKey).toBe("face");
  });
});
