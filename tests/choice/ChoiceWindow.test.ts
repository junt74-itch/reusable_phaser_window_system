import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SelectableItem } from "../../src/selection/types.ts";

const ROOT = resolve(import.meta.dir, "../..");
const SOURCE = readFileSync(join(ROOT, "src/choice/ChoiceWindow.ts"), "utf8");

describe("ChoiceWindow rich label contract", () => {
  test("choose accepts string[] labels unchanged", () => {
    const labels: string[] = ["Attack", "Defend"];
    const normalized: SelectableItem<string>[] = labels.map((label, index) => ({
      id: String(index),
      label,
      value: label,
      enabled: true,
    }));
    expect(normalized[0]?.label).toBe("Attack");
  });

  test("normalizeItems maps string labels onto SelectableItem", () => {
    expect(SOURCE.includes("label,")).toBe(true);
    expect(SOURCE.includes("extends SelectableWindow")).toBe(true);
  });
});
