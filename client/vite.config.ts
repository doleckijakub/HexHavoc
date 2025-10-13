import tsconfig from "./tsconfig.json";
import path from "path";

// Vite doesn't support tsconfig paths natively, so we need to convert them to vite aliases
const tsconfigPathAliases = Object.fromEntries(
  Object.entries(tsconfig.compilerOptions.paths).map(([key, values]) => {
    let value = values[0];
    if (key.endsWith("/*")) {
      key = key.slice(0, -2);
      value = value.slice(0, -2);
    }

    const nodeModulesPrefix = "node_modules/";
    if (value.startsWith(nodeModulesPrefix)) {
      value = value.replace(nodeModulesPrefix, "");
    } else {
      value = path.join(__dirname, value);
    }

    return [key, value];
  })
);

import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: tsconfigPathAliases,
  },
  build: {
    rollupOptions: {
      input: {
        landing: './index.html',
        game: './game.html',
      },
    },
  },
  server: {
    port: 3000,
  },
});
