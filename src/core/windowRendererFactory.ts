import { GraphicsWindowRenderer } from "./GraphicsWindowRenderer.ts";
import { createPhaserGraphicsFactory } from "./PhaserGraphicsFactory.ts";
import type {
  WindowRenderer,
  WindowRendererFactory,
  WindowRendererFactoryContext,
} from "./WindowRenderer.ts";

/** Default chrome: Graphics background and frame parented to the window root. */
export function createDefaultGraphicsWindowRenderer(
  context: WindowRendererFactoryContext,
): WindowRenderer {
  return new GraphicsWindowRenderer(createPhaserGraphicsFactory(context.scene, context.root));
}

/** Resolves an injected factory or falls back to {@link createDefaultGraphicsWindowRenderer}. */
export function resolveWindowRenderer(
  factory: WindowRendererFactory | undefined,
  context: WindowRendererFactoryContext,
): WindowRenderer {
  return (factory ?? createDefaultGraphicsWindowRenderer)(context);
}
