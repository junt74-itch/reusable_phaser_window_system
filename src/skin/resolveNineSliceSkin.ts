import type { NineSliceImageSkinOptions, NineSliceSkinOptions } from "./types.ts";

/** Snapshot and validate source-pixel slicing options before creating any display objects. */
export function resolveNineSliceSkin(
  options: NineSliceSkinOptions | NineSliceImageSkinOptions,
): NineSliceSkinOptions {
  let resolved: NineSliceSkinOptions;
  if ("padding" in options) {
    const values = typeof options.padding === "number"
      ? [options.padding, options.padding, options.padding, options.padding]
      : options.padding;
    if (values.length !== 4) {
      throw new RangeError("NineSlice padding must contain four values in TRBL order.");
    }
    const [topHeight, rightWidth, bottomHeight, leftWidth] = values;
    const { padding: _padding, ...image } = options;
    resolved = { ...image, topHeight: topHeight!, rightWidth: rightWidth!, bottomHeight: bottomHeight!, leftWidth: leftWidth! };
  } else {
    resolved = { ...options };
  }
  for (const value of [resolved.topHeight, resolved.rightWidth, resolved.bottomHeight, resolved.leftWidth]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError("NineSlice padding must use finite, non-negative integer pixels.");
    }
  }
  if (resolved.tint !== undefined &&
      (!Number.isInteger(resolved.tint) || resolved.tint < 0 || resolved.tint > 0xffffff)) {
    throw new RangeError("NineSlice tint must be a 24-bit RGB integer (0x000000–0xffffff).");
  }
  return resolved;
}

export function validateNineSliceFrame(options: NineSliceSkinOptions, width: number, height: number): void {
  if (options.leftWidth + options.rightWidth >= width || options.topHeight + options.bottomHeight >= height) {
    throw new RangeError("NineSlice padding must leave a positive center region in the source frame.");
  }
}
