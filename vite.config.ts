import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: https://suimaire.github.io/carbohydrate-3d-explorer/
// All asset and molecule URLs are built from import.meta.env.BASE_URL.
export default defineConfig({
  plugins: [react()],
  base: "/carbohydrate-3d-explorer/",
  build: { chunkSizeWarningLimit: 1600 },
});
