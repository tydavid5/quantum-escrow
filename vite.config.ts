import type { ViteUserConfig } from "vite";

const config: ViteUserConfig = {
  build: {
    outDir: "dist",
    target: "es2022",
  },
};

export default config;
