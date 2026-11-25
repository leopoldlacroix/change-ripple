import * as esbuild from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/ui/styles.css"), "utf8");
const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ["src/ui/main.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  write: false,
  minify: true,
  legalComments: "none",
});
const js = result.outputFiles[0]?.text ?? "";
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Change Ripple</title>
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>
`;
writeFileSync(
  join(root, "src/server/board.generated.ts"),
  `export const BOARD_HTML = ${JSON.stringify(html)};\n`,
);
console.log(`board html ${html.length} bytes`);
