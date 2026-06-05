import { defineConfig } from "tsup"

export default defineConfig([
  // Library entries: dual ESM + CJS so consumers on either module
  // system get types and runtime.
  {
    entry: ["src/index.ts", "src/codegen.ts"],
    format: ["esm", "cjs"],
    target: "es2022",
    outDir: "dist",
    clean: true,
    dts: true,
    sourcemap: true,
    treeshake: true,
  },
  // CLI bin: ESM only. The `bin` field maps to `dist/codegen-bin.js`,
  // so a CJS twin would just be dead weight in the tarball. No types.
  {
    entry: ["src/codegen-bin.ts"],
    format: ["esm"],
    target: "es2022",
    outDir: "dist",
    clean: false,
    dts: false,
    sourcemap: true,
    treeshake: true,
  },
])
