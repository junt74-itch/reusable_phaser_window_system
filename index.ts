/**
 * Stable source entry point for repositories that consume this project as a Git submodule.
 *
 * Application code should import from this file instead of deep-importing implementation
 * modules under `src/`. The packaged build continues to use `dist/index.js`.
 */
export * from "./src/index.ts";
