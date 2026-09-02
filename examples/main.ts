import Phaser from "phaser";
import { ALL_SCENE_KEYS } from "./sceneKeys.ts";
import { IntegrationScene } from "./scenes/IntegrationScene.ts";
import { MessageScene } from "./scenes/MessageScene.ts";
import { ChoiceScene } from "./scenes/ChoiceScene.ts";
import { WindowBaseScene } from "./scenes/WindowBaseScene.ts";
import { LifecycleScene } from "./scenes/LifecycleScene.ts";
import { ClippingSpikeScene } from "./scenes/ClippingSpikeScene.ts";
import { BitmapFontSpikeScene } from "./scenes/BitmapFontSpikeScene.ts";
import { ScrollScene } from "./scenes/ScrollScene.ts";
import { LongListScene } from "./scenes/LongListScene.ts";
import { NineSliceScene } from "./scenes/NineSliceScene.ts";
import { CommandHelpScene } from "./scenes/CommandHelpScene.ts";
import { LogDocumentScene } from "./scenes/LogDocumentScene.ts";
import { FocusModalScene } from "./scenes/FocusModalScene.ts";
import { MessagePortraitScene } from "./scenes/MessagePortraitScene.ts";
import { FontFallbackScene } from "./scenes/FontFallbackScene.ts";
import { PaddingChromeScene } from "./scenes/PaddingChromeScene.ts";
import { RichTextScene } from "./scenes/RichTextScene.ts";

const scenario = new URLSearchParams(window.location.search).get("scene") ?? "integration";

const scenes: Record<(typeof ALL_SCENE_KEYS)[number], typeof Phaser.Scene> = {
  integration: IntegrationScene,
  message: MessageScene,
  choice: ChoiceScene,
  "window-base": WindowBaseScene,
  lifecycle: LifecycleScene,
  clipping: ClippingSpikeScene,
  "bitmap-font": BitmapFontSpikeScene,
  scroll: ScrollScene,
  "long-list": LongListScene,
  nineslice: NineSliceScene,
  "command-help": CommandHelpScene,
  "log-document": LogDocumentScene,
  "focus-modal": FocusModalScene,
  "message-portrait": MessagePortraitScene,
  "font-fallback": FontFallbackScene,
  "padding-chrome": PaddingChromeScene,
  "rich-text": RichTextScene,
};

const SelectedScene = scenes[scenario as keyof typeof scenes] ?? IntegrationScene;

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "app",
  width: 960,
  height: 540,
  roundPixels: true,
  scene: [SelectedScene],
});
