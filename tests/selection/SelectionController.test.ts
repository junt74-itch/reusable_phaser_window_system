import { describe, expect, test } from "bun:test";
import { SelectionController } from "../../src/selection/SelectionController.ts";
import type { SelectableItem } from "../../src/selection/types.ts";

const items: SelectableItem<string>[] = [
  { id: "0", label: "A", value: "a", enabled: true },
  { id: "1", label: "B", value: "b", enabled: false },
  { id: "2", label: "C", value: "c", enabled: true },
];

describe("SelectionController", () => {
  test("skips disabled items and confirms only enabled rows", () => {
    const controller = new SelectionController<string>();
    controller.setItems(items);
    expect(controller.getSelectedIndex()).toBe(0);
    controller.move("down");
    expect(controller.getSelectedIndex()).toBe(2);
    let confirmed: SelectableItem<string> | undefined;
    controller.onConfirm((_index, item) => {
      confirmed = item;
    });
    expect(controller.confirm()).toBe(true);
    expect(confirmed?.value).toBe("c");
  });

  test("returns -1 for empty lists", () => {
    const controller = new SelectionController<string>();
    controller.setItems([]);
    expect(controller.getSelectedIndex()).toBe(-1);
  });

  test("selectIndex jumps directly in multi-column layout", () => {
    const controller = new SelectionController<string>({ columns: 2 });
    controller.setItems([
      { id: "0", label: "A", value: "a", enabled: true },
      { id: "1", label: "B", value: "b", enabled: true },
      { id: "2", label: "C", value: "c", enabled: true },
    ]);
    expect(controller.selectIndex(1)).toBe(true);
    expect(controller.getSelectedIndex()).toBe(1);
  });

  test("optional confirm and cancel hooks fire once and not after dispose", () => {
    let confirms = 0;
    let cancels = 0;
    const controller = new SelectionController<string>({
      onConfirm: () => {
        confirms += 1;
      },
      onCancel: () => {
        cancels += 1;
      },
    });
    controller.setItems(items);
    expect(controller.confirm()).toBe(true);
    controller.cancel();
    expect(confirms).toBe(1);
    expect(cancels).toBe(1);
    controller.dispose();
    expect(controller.confirm()).toBe(false);
    controller.cancel();
    expect(confirms).toBe(1);
    expect(cancels).toBe(1);
  });
});


describe("vertical writing navigation", () => {
  const verticalItems = [
    { id: "a", label: "一", value: 1, enabled: true },
    { id: "b", label: "二", value: 2, enabled: true },
    { id: "c", label: "三", value: 3, enabled: true },
  ];

  test("vertical-rl advances through items with left", () => {
    const controller = new SelectionController<number>({ writingMode: "vertical-rl", wrap: false });
    controller.setItems(verticalItems);
    expect(controller.getSelectedIndex()).toBe(0);
    controller.move("left");
    expect(controller.getSelectedIndex()).toBe(1);
    controller.move("right");
    expect(controller.getSelectedIndex()).toBe(0);
  });

  test("vertical-lr advances through items with right", () => {
    const controller = new SelectionController<number>({ writingMode: "vertical-lr", wrap: false });
    controller.setItems(verticalItems);
    controller.move("right");
    expect(controller.getSelectedIndex()).toBe(1);
  });
});
