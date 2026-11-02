/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · build-meshes.mjs
 *  Copies the .msh files into js/meshes.js, so the embedded text
 *  (needed for file://) cannot drift from the meshes in this folder
 * ════════════════════════════════════════════════════════════════
 *
 *  node meshes/build-meshes.mjs          rewrite js/meshes.js
 *  node meshes/build-meshes.mjs --check  exit 1 if js/meshes.js is out of date
 *
 *  Only the text inside each `const NAME = \`...\`;` literal is replaced;
 *  the header and the other constants in js/meshes.js stay as written.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "../js/meshes.js");

// Constant in js/meshes.js → .msh file in this folder
const MESHES = { MESH_PLATE_BYPASS: "plate-bypass.msh" };

const original = readFileSync(target, "utf8");
let out = original;
for (const [name, file] of Object.entries(MESHES)) {
  const text = readFileSync(join(here, file), "utf8");
  if (text.includes("`") || text.includes("${") || text.includes("\\")) {
    throw new Error(`${file} contains characters that would break a template literal`);
  }
  const literal = new RegExp(`(const ${name} = \`)[^\`]*(\`;)`);
  if (!literal.test(out)) throw new Error(`const ${name} = \`...\`; not found in js/meshes.js`);
  out = out.replace(literal, (_, open, close) => open + text + close);
}

if (process.argv.includes("--check")) {
  if (out !== original) {
    console.error("js/meshes.js is out of date; run: node meshes/build-meshes.mjs");
    process.exit(1);
  }
  console.log("js/meshes.js is up to date");
} else if (out !== original) {
  writeFileSync(target, out);
  console.log("js/meshes.js rewritten");
} else console.log("js/meshes.js already up to date");
