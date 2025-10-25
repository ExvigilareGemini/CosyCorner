// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

import node from "@astrojs/node";

export default defineConfig({
  integrations: [react()],
  alias: { "@": "./src" },

  // Security configuration
  security: {
    checkOrigin: true,
  },

  vite: {
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.log", "console.info"],
        },
      },
      cssCodeSplit: true,
      cssMinify: true,
    },
    css: {
      devSourcemap: false,
    },
  },

  build: {
    inlineStylesheets: 'auto',
  },
  output: 'server',
  adapter: node({
    mode: "standalone",
  }),
});