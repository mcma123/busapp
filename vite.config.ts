import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // inline (empty) PostCSS config so Vite does not pick up a postcss.config.js from a parent folder
  css: { postcss: { plugins: [] } },
  server: { host: true },
});
