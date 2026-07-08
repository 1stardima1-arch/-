import { vlyPlugin } from "@vly-ai/integrations";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";

function removeCrossorigin(): Plugin {
  return {
    name: "remove-crossorigin",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const [key, asset] of Object.entries(bundle)) {
        if (key.endsWith(".html") && asset.type === "asset") {
          const html = typeof asset.source === "string" ? asset.source : "";
          // Remove `crossorigin` attributes from script and link tags
          asset.source = html.replace(/\s+crossorigin(=["'][^"']*["'])?/g, "");
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), removeCrossorigin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    modulePreload: false,
  },
});
