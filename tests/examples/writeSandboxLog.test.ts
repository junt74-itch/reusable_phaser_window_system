import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { writeSandboxLog } from "../../examples/writeSandboxLog.ts";

const ROOT = resolve(import.meta.dir, "../..");

describe("writeSandboxLog", () => {
  test("writes when the generation matches and the target is active", () => {
    const calls: string[] = [];
    writeSandboxLog(
      {
        active: true,
        setText: (value) => {
          calls.push(value);
        },
      },
      1,
      1,
      "Event log: loop owner started",
    );
    expect(calls).toEqual(["Event log: loop owner started"]);
  });

  test("does not call setText on a stale generation or destroyed target", () => {
    const stale: string[] = [];
    writeSandboxLog(
      {
        active: true,
        setText: (value) => {
          stale.push(value);
        },
      },
      2,
      1,
      "stale generation",
    );
    expect(stale).toEqual([]);

    writeSandboxLog(null, 1, 1, "null log");

    writeSandboxLog(
      {
        active: false,
        setText: () => {
          throw new Error("GameObject already destroyed");
        },
      },
      1,
      1,
      "destroyed",
    );
  });
});

describe("restart exercise isolation", () => {
  test("Integration and Lifecycle catch handlers use writeSandboxLog", () => {
    const integration = readFileSync(join(ROOT, "examples/scenes/IntegrationScene.ts"), "utf8");
    const lifecycle = readFileSync(join(ROOT, "examples/scenes/LifecycleScene.ts"), "utf8");
    for (const source of [integration, lifecycle]) {
      expect(source.includes("writeSandboxLog")).toBe(true);
      expect(source.includes("SHUTDOWN")).toBe(true);
      expect(source.includes("logGeneration")).toBe(true);
    }
  });
});
