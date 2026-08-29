import Phaser from "phaser";
import { IntegrationScene } from "./scenes/IntegrationScene.ts";
import { MessageScene } from "./scenes/MessageScene.ts";
import { ChoiceScene } from "./scenes/ChoiceScene.ts";
import { WindowBaseScene } from "./scenes/WindowBaseScene.ts";
import { LifecycleScene } from "./scenes/LifecycleScene.ts";
import { ClippingSpikeScene } from "./scenes/ClippingSpikeScene.ts";
import { BitmapFontSpikeScene } from "./scenes/BitmapFontSpikeScene.ts";

const scenario = new URLSearchParams(window.location.search).get("scene") ?? "integration";

const scenes: Record<string, typeof Phaser.Scene> = {
  integration: IntegrationScene,
  message: MessageScene,
  choice: ChoiceScene,
  "window-base": WindowBaseScene,
  lifecycle: LifecycleScene,
  clipping: ClippingSpikeScene,
  "bitmap-font": BitmapFontSpikeScene,
};

const SelectedScene = scenes[scenario] ?? IntegrationScene;

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "app",
  width: 960,
  height: 540,
  roundPixels: true,
  scene: [SelectedScene],
});
