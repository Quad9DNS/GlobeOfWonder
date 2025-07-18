import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import svgLoader from "vite-svg-loader";

// https://vite.dev/config/
export default defineConfig({
  plugins: [viteSingleFile(), svgLoader()],
  esbuild: {
    target: "ES2020",
  },
});
