import Phaser from "phaser";
import type { WindowFocusController } from "./WindowFocusController.ts";

/**
 * Releases focus on Scene shutdown/destroy. The controller does not import windows;
 * the Scene owns this binding and any dimmer Graphics.
 */
export function bindFocusControllerToScene(
  scene: Phaser.Scene,
  controller: WindowFocusController,
): () => void {
  const onShutdown = (): void => {
    controller.dispose();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
  scene.events.once(Phaser.Scenes.Events.DESTROY, onShutdown);
  return () => {
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    scene.events.off(Phaser.Scenes.Events.DESTROY, onShutdown);
    controller.dispose();
  };
}
