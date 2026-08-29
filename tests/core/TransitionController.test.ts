import { describe, expect, test } from "bun:test";
import { TransitionController } from "../../src/core/TransitionController.ts";
import { WindowOperationCancelledError } from "../../src/core/types.ts";

describe("TransitionController", () => {
  test("opens and closes with deterministic updates", async () => {
    const controller = new TransitionController(100);
    const openPromise = controller.open();
    controller.update(50);
    expect(controller.getState().phase).toBe("opening");
    controller.update(50);
    await openPromise;
    expect(controller.getState()).toEqual({ phase: "open", openness: 1 });

    const closePromise = controller.close();
    controller.update(100);
    await closePromise;
    expect(controller.getState()).toEqual({ phase: "closed", openness: 0 });
  });

  test("reversal cancels the superseded promise", async () => {
    const controller = new TransitionController(100);
    const openPromise = controller.open();
    controller.update(50);
    let openRejected = false;
    openPromise.catch((error) => {
      if (error instanceof WindowOperationCancelledError) {
        openRejected = true;
      }
    });
    const closePromise = controller.close();
    controller.update(100);
    await closePromise;
    expect(openRejected).toBe(true);
    expect(controller.getState().openness).toBe(0);
  });

  test("zero-duration transitions settle synchronously", async () => {
    const controller = new TransitionController(100);
    await controller.open(0);
    expect(controller.getState().phase).toBe("open");
  });

  test("ignores invalid deltas", () => {
    const controller = new TransitionController(100);
    void controller.open();
    controller.update(-1);
    expect(controller.getState().openness).toBe(0);
  });
});
