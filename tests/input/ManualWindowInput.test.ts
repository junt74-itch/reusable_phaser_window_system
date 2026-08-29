import { describe, expect, test } from "bun:test";
import { ManualWindowInput } from "../helpers/ManualWindowInput.ts";

describe("ManualWindowInput", () => {
  test("supports independent subscriptions and readonly snapshots", () => {
    const input = new ManualWindowInput();
    const seen: string[] = [];
    const subA = input.subscribeAction((event) => {
      seen.push(`${event.action}:${event.phase}`);
    });
    input.subscribeAction((event) => {
      seen.push(`b:${event.action}`);
    });
    input.pushAction("confirm");
    subA.unsubscribe();
    input.pushAction("cancel");
    expect(seen).toEqual(["confirm:pressed", "b:confirm", "b:cancel"]);
  });

  test("disposed adapter emits nothing", () => {
    const input = new ManualWindowInput();
    let count = 0;
    input.subscribeAction(() => {
      count += 1;
    });
    input.dispose();
    input.pushAction("up");
    expect(count).toBe(0);
  });
});
