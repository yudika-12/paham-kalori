import * as esbuild from "esbuild";
import path from "path";
import fs from "fs";

const rootDir = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(rootDir, ".vercel/output");
const funcDir = path.join(outputDir, "functions", "index.func");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(funcDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(rootDir, "api/index.ts")],
  bundle: true,
  outfile: path.join(funcDir, "index.js"),
  platform: "node",
  format: "cjs",
  target: "node22",
  external: [],
  outbase: path.join(rootDir, "."),
});

fs.writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      maxDuration: 60,
    },
    null,
    2
  )
);

fs.writeFileSync(
  path.join(outputDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2
  )
);

console.log("Backend build output API v3 ready");