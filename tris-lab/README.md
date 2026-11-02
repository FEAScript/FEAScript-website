<img src="assets/tris-lab-icon.svg" width="80" alt="Tri's Lab logo: Tri, the FEAScript triangle robot">

# Tri's Lab

Playful, browser-only ways to meet the finite element method. Every result is a real FEAScript solve. The tutorials link here from their "Tri's tip" callouts (`assets/tri-tip.svg` in the website root), and to single FEM Blocks missions with `blocks/?mission=<id>` (ids in `blocks/js/missions.js`).

```
index.html          the Tri's Lab page
tris-lab.css         its styles (website tokens + pixel accents)
assets/             the Tri's Lab logo (tris-lab-icon.svg, tris-lab-logo.svg) and the page screenshots
critical-mesh/      Critical Mesh, a pixel-art heat-conduction game (see its README)
blocks/             FEM Blocks, a no-code block editor with missions for young learners
```

## FEM Blocks

Pixel-art Blockly blocks build a heat-conduction, creeping-flow or front-propagation (eikonal) model: a shape (bar or plate), a material (k), heaters (Q), edge conditions, and the solve and show steps. Run executes the generated FEAScript code, which is shown in the Code tab.

- **Missions**: nine missions (`js/missions.js`), each about one idea: a straight-line profile, a source term, 2D conduction, insulated edges, conductivity, convective cooling, mesh refinement, a lid-driven cavity and a freezing front (eikonal), plus a sandbox. Each goal is checked on the real FEAScript result.
- **Picture and Code**: the result as pixel art, and the FEAScript code the blocks write. Clicking a block lights up its lines of code.
- **The math**: first the governing equation, with the term the clicked block controls highlighted and explained in plain words; then how the run was solved (mesh, nodes, the sparsity pattern of K, the solve time).

```
js/pixels.js     pixel art: block icons (SVG data URIs) and Tri, the mascot
js/blocks.js     pixel renderer, themes, block definitions, toolbox, block explanations
js/generator.js  blocks → checks with friendly messages → FEAScript code
js/missions.js   missions and their starting workspaces
js/results.js    pixel heat maps, bar graphs, flow tracers, the animated front, "How it's solved"
js/app.js        workspace, running, missions, The math tab, Tri, save/open, theme
```

Blockly 12 (Apache 2.0) and FEAScript load from CDNs. FEAScript is pinned to a release (`FEASCRIPT_VERSION` in `js/app.js` and `critical-mesh/js/config.js`); bump it on purpose and replay the missions and shifts. Progress is kept in `localStorage` (`femBlocks.v1`). Both apps also work from `file://`.
