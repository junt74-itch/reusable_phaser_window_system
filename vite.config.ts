import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const pages = mode === "pages";
  return {
    base: pages ? "/reusable_phaser_window_system/" : "/",
    build: pages
      ? {
          outDir: "dist-pages",
        }
      : {
          lib: {
            entry: "src/index.ts",
            formats: ["es"],
            fileName: "index",
          },
          rollupOptions: {
            external: ["phaser"],
          },
        },
  };
});
