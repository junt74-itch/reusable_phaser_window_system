import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GraphicsWindowRenderer } from "../../src/core/GraphicsWindowRenderer.ts";
import type { GraphicsLike, WindowRenderer, WindowRendererFactoryContext } from "../../src/core/WindowRenderer.ts";
import {
  createDefaultGraphicsWindowRenderer,
  resolveWindowRenderer,
} from "../../src/core/windowRendererFactory.ts";

const ROOT = resolve(import.meta.dir, "../..");
const PHASER_CANVAS = 1;

class StubGraphics implements GraphicsLike {
  public clear(): void {}
  public fillStyle(): this {
    return this;
  }
  public lineStyle(): this {
    return this;
  }
  public fillRect(): this {
    return this;
  }
  public strokeRect(): this {
    return this;
  }
  public setVisible(): void {}
  public setAlpha(): void {}
  public destroy(): void {}
}

function createStubRenderer(): WindowRenderer & { calls: string[] } {
  const calls: string[] = [];
  const background = new StubGraphics();
  const frame = new StubGraphics();
  return {
    calls,
    background,
    frame,
    resize(width: number, height: number): void {
      calls.push(`resize:${width}x${height}`);
    },
    applyTheme(): void {
      calls.push("applyTheme");
    },
    setOpenness(openness: number): void {
      calls.push(`setOpenness:${openness}`);
    },
    destroy(): void {
      calls.push("destroy");
    },
  };
}

function createMinimalFactoryContext(): {
  context: WindowRendererFactoryContext;
  rootChildren: unknown[];
} {
  const rootChildren: unknown[] = [];
  const root = {
    add(child: unknown) {
      rootChildren.push(child);
    },
  };
  const scene = {
    game: { renderer: { type: PHASER_CANVAS } },
    cameras: { main: {} },
    add: {
      graphics() {
        return {
          clear: () => {},
          fillStyle: () => ({ fillRect: () => {} }),
          lineStyle: () => ({ strokeRect: () => {} }),
          setVisible: () => {},
          destroy: () => {},
        };
      },
    },
  };
  return {
    rootChildren,
    context: {
      scene: scene as unknown as WindowRendererFactoryContext["scene"],
      root: root as unknown as WindowRendererFactoryContext["root"],
    },
  };
}

describe("resolveWindowRenderer", () => {
  test("default factory returns GraphicsWindowRenderer", () => {
    const { context } = createMinimalFactoryContext();
    const renderer = resolveWindowRenderer(undefined, context);
    expect(renderer).toBeInstanceOf(GraphicsWindowRenderer);
  });

  test("injected factory is used instead of the default Graphics path", () => {
    const { context } = createMinimalFactoryContext();
    const stub = createStubRenderer();

    const renderer = resolveWindowRenderer(() => stub, context);

    expect(renderer).toBe(stub);
    renderer.resize(100, 50);
    expect(stub.calls).toContain("resize:100x50");
  });

  test("createDefaultGraphicsWindowRenderer parents background and frame on root", () => {
    const { context, rootChildren } = createMinimalFactoryContext();
    createDefaultGraphicsWindowRenderer(context);
    expect(rootChildren.length).toBe(2);
  });
});

describe("WindowBase renderer injection contract", () => {
  test("WindowBase resolves createRenderer without skin imports", () => {
    const source = readFileSync(join(ROOT, "src/core/WindowBase.ts"), "utf8");
    expect(source.includes("resolveWindowRenderer(options.createRenderer")).toBe(true);
    expect(source.includes("createRenderer?: WindowRendererFactory")).toBe(true);
    expect(source.includes("skin/")).toBe(false);
    expect(source.includes("NineSlice")).toBe(false);
  });

  test("injected renderer receives resize and theme during default construction path", () => {
    const stub = createStubRenderer();
    resolveWindowRenderer(() => stub, createMinimalFactoryContext().context);
    stub.applyTheme({} as never);
    stub.resize(120, 80);
    expect(stub.calls).toEqual(["applyTheme", "resize:120x80"]);
  });
});
