import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/codegen.ts", "src/codegen-bin.ts"],
  format: ["esm", "cjs"],
  target: "es2022",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: true,
  treeshake: true,
})
