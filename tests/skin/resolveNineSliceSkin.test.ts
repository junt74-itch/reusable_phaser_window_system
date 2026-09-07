import { describe, expect, test } from "bun:test";
import { resolveNineSliceSkin, validateNineSliceFrame } from "../../src/skin/resolveNineSliceSkin.ts";

describe("image skin padding", () => {
  test("accepts RGB tint including black and white in both option forms", () => {
    for (const tint of [0x000000, 0x80a0ff, 0xffffff]) {
      expect(resolveNineSliceSkin({ textureKey: "skin", padding: 12, tint }).tint).toBe(tint);
      expect(resolveNineSliceSkin({
        textureKey: "skin", leftWidth: 12, rightWidth: 12, topHeight: 12, bottomHeight: 12, tint,
      }).tint).toBe(tint);
    }
    expect(resolveNineSliceSkin({ textureKey: "skin", padding: 12 }).tint).toBeUndefined();
  });

  test("rejects tint outside the 24-bit integer range", () => {
    for (const tint of [-1, 0x1000000, 1.5, NaN, Infinity]) {
      expect(() => resolveNineSliceSkin({ textureKey: "skin", padding: 12, tint })).toThrow(RangeError);
    }
  });

  test("maps asymmetric TRBL values to Phaser slice dimensions", () => {
    expect(resolveNineSliceSkin({ textureKey: "skin", padding: [1, 2, 3, 4] })).toEqual({
      textureKey: "skin", topHeight: 1, rightWidth: 2, bottomHeight: 3, leftWidth: 4,
    });
  });

  test("supports uniform padding and the new 32px assets", () => {
    const skin = resolveNineSliceSkin({ textureKey: "skin", padding: 12 });
    expect([skin.topHeight, skin.rightWidth, skin.bottomHeight, skin.leftWidth]).toEqual([12, 12, 12, 12]);
    expect(() => validateNineSliceFrame(skin, 32, 32)).not.toThrow();
    expect(() => validateNineSliceFrame(skin, 24, 32)).toThrow(RangeError);
    expect(() => validateNineSliceFrame(skin, 32, 20)).toThrow(RangeError);
  });

  test("snapshots mutable input and preserves frame and tiling", () => {
    const padding: [number, number, number, number] = [1, 2, 3, 4];
    const skin = resolveNineSliceSkin({ textureKey: "skin", padding, frame: "panel", tileX: true });
    padding[0] = 99;
    expect(resolveNineSliceSkin(skin).topHeight).toBe(1);
    expect(skin.frame).toBe("panel");
    expect(skin.tileX).toBe(true);
  });

  test("preserves legacy explicit dimensions", () => {
    const skin = { textureKey: "skin", leftWidth: 4, rightWidth: 2, topHeight: 1, bottomHeight: 3 };
    expect(resolveNineSliceSkin(skin)).toEqual(skin);
  });

  test("rejects invalid source pixel borders", () => {
    for (const value of [-1, 1.5, NaN, Infinity]) {
      expect(() => resolveNineSliceSkin({ textureKey: "skin", padding: value })).toThrow(RangeError);
      expect(() => resolveNineSliceSkin({ textureKey: "skin", padding: [1, value, 1, 1] })).toThrow(RangeError);
    }
  });
});
