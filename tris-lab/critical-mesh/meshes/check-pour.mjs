/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · check-pour.mjs
 *  Solves every Cold Pour chill setup (up to three chilled walls)
 *  on a Gmsh mould and reports which ones FEAScript can't converge
 * ════════════════════════════════════════════════════════════════
 *
 *  node check-pour.mjs <feascript.esm.mjs> <mould.msh>
 *
 *  The FEAScript ES module build needs an .mjs name for Node, e.g.
 *  copy dist/feascript.esm.js to feascript.mjs. Every physical line of
 *  the mesh is a wall (FEAScript boundary key = physical tag − 1).
 *  A setup is usable when it converges; the last metal to freeze is
 *  where φ is within 0.04 of its maximum, as in the game.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [feaPath, mshPath] = process.argv.slice(2);
if (!feaPath || !mshPath) {
  console.error("usage: node check-pour.mjs <feascript.esm.mjs> <mould.msh>");
  process.exit(2);
}
const FEA = await import(pathToFileURL(resolve(feaPath)).href);
const text = readFileSync(mshPath, "utf8");
// importGmshMesh only needs file.text(), so this also works on Node versions without a global File
const parsedMesh = await FEA.importGmshMesh({ name: mshPath, text: async () => text });

// Wall names from the $PhysicalNames block (dimension 1 = lines)
const names = [...text.matchAll(/^1 (\d+) "([^"]+)"$/gm)].sort((a, b) => a[1] - b[1]).map((m) => m[2]);

let failures = 0;
let total = 0;
for (let mask = 1; mask < 1 << names.length; mask++) {
  const chilled = names.map((_, k) => !!(mask & (1 << k)));
  if (chilled.filter(Boolean).length > 3) continue;
  total++;
  const model = new FEA.FEAScriptModel();
  model.setModelConfig("frontPropagationScript");
  model.setMeshConfig({ parsedMesh: structuredClone(parsedMesh), meshDimension: "2D", elementOrder: "quadratic" });
  chilled.forEach((on, k) => model.addBoundaryCondition(String(k), on ? ["constantValue", 0] : ["zeroGradient"]));
  model.setSolverMethod("lusolve");

  // FEAScript reports a failed solve through its log, so listen to it while solving
  let converged = true;
  const quiet = [console.log, console.warn, console.error];
  console.log = console.warn = console.error = (...args) => {
    if (args.join(" ").includes("did not converge")) converged = false;
  };
  let result;
  try {
    result = model.solve();
  } finally {
    [console.log, console.warn, console.error] = quiet;
  }

  const label = names.filter((_, k) => chilled[k]).join(" + ");
  if (!converged) {
    failures++;
    console.log(`FAILED     ${label}`);
    continue;
  }
  const phi = Array.from(result.solutionVector, (v) => (Array.isArray(v) ? v[0] : v));
  const { nodesXCoordinates: X, nodesYCoordinates: Y } = result.nodesCoordinates;
  const max = Math.max(...phi);
  const last = phi.map((_, i) => i).filter((i) => phi[i] >= max - 0.04);
  const cx = last.reduce((a, i) => a + X[i], 0) / last.length;
  const cy = last.reduce((a, i) => a + Y[i], 0) / last.length;
  console.log(`converged  ${label.padEnd(26)} max φ ${max.toFixed(2)} · last to freeze near (${cx.toFixed(2)}, ${cy.toFixed(2)})`);
}
console.log(`\n${failures} of ${total} setups did not converge`);
process.exit(failures ? 1 : 0);
