import { defineConfig } from "tsup"
import pkg from "./package.json" with { type: "json" }

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  /**
   * Workspace packages export raw TS via their `main: ./src/index.ts`
   * entries. tsup externalises `dependencies` by default — but the
   * `@streamboard/*` workspace deps are intentionally bundled into
   * this CLI binary so end users can `npm i -g streamboard` and run
   * it with no transitive resolution.
   */
  noExternal: [/^@streamboard\//],
})
