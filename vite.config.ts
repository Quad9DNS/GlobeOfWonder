import { defineConfig, withFilter } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import svgLoader from "vite-svg-loader";
import swc from "@rollup/plugin-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    viteSingleFile(),
    svgLoader(),
    withFilter(
      swc({
        swc: {
          jsc: {
            parser: { decorators: true, decoratorsBeforeExport: true },
            transform: { decoratorVersion: "2023-11" },
          },
        },
      }),
      // Only run this transform if the file contains a decorator.
      { transform: { code: "@", id: /\.ts/ } },
    ),
  ],
  esbuild: {
    target: "ES2020",
  },
});
