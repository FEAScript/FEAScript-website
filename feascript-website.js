/**
 * ════════════════════════════════════════════════════════════════
 *  FEAScript Website
 *  Finite Element Simulation in JavaScript
 *  https://feascript.com
 *  CC BY 4.0 License © 2023–2026 FEAScript
 * ════════════════════════════════════════════════════════════════
 */

// Home page behaviour
(function () {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─────────────────────────────────────────────────────────────
     NAVIGATION & THEME
     ───────────────────────────────────────────────────────────── */

  // Theme toggle (preference stored locally)
  const themeButton = document.getElementById("theme-toggle");
  if (themeButton) {
    themeButton.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("feascript-theme", next);
      } catch (e) {}
    });
  }

  // Mobile navigation
  const burger = document.getElementById("nav-burger");
  const mobileNav = document.getElementById("mobile-nav");
  if (burger && mobileNav) {
    burger.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    mobileNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }),
    );
  }

  /* ─────────────────────────────────────────────────────────────
     PAGE CONTENT
     ───────────────────────────────────────────────────────────── */

  // Reveal on scroll
  const revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    revealItems.forEach((el) => io.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("in"));
  }

  // Show the current section title in the sticky bar of document pages
  const docBar = document.querySelector("[data-doc-bar]");
  const docHeadings = [...document.querySelectorAll('.doc h2, .doc [role="heading"][aria-level="2"]')];
  if (docBar && docHeadings.length) {
    const initialTitle = docBar.textContent;
    const updateDocBar = () => {
      const limit = docBar.closest(".eyebrow").getBoundingClientRect().bottom + 8;
      let current = initialTitle;
      for (const heading of docHeadings) {
        if (heading.getBoundingClientRect().top > limit) break;
        current = heading.textContent.trim();
      }
      if (docBar.textContent !== current) docBar.textContent = current;
      const bar = docBar.closest(".eyebrow");
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--read", max > 0 ? Math.min(1, window.scrollY / max).toFixed(3) : 0);
    };
    window.addEventListener("scroll", updateDocBar, { passive: true });
    updateDocBar();
  }

  // Copy buttons that carry their text in data-copy
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(button.dataset.copy).then(() => {
        const label = button.querySelector("span");
        button.classList.add("copied");
        label.textContent = "Copied";
        setTimeout(() => {
          button.classList.remove("copied");
          label.textContent = "Copy";
        }, 2000);
      });
    });
  });

  // Copy buttons that copy the text of another element, named in data-copy-target
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(target.innerText.trim()).then(() => {
        const label = button.querySelector("span");
        button.classList.add("copied");
        label.textContent = "Copied";
        setTimeout(() => {
          button.classList.remove("copied");
          label.textContent = "Copy";
        }, 2000);
      });
    });
  });

  // Copy the quick-start code
  const copyButton = document.getElementById("copy-qs-btn");
  const codeBlock = document.getElementById("quickstart-code");

  // Syntax highlighting (HTML + JavaScript) for the quick-start and tutorial code blocks;
  // copying still uses the plain text
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const wrap = (cls, s) => `<span class="tok-${cls}">${esc(s)}</span>`;
  const highlightTag = (tag) => {
    const m = tag.match(/^(<\/?)([^\s>/]+)([\s\S]*?)(\/?>)$/);
    if (!m) return wrap("tag", tag);
    const attrs = m[3].replace(/([\w:-]+)(=)?("[^"]*")?|(\s+)/g, (_, name, eq, val, space) =>
      space ? space : wrap("attr", name) + (eq ? esc(eq) : "") + (val ? wrap("str", val) : ""),
    );
    return wrap("tag", m[1] + m[2]) + attrs + wrap("tag", m[4]);
  };
  const tokens =
    /(<!--[\s\S]*?-->|\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(<\/?[A-Za-z!][^>]*>)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|export|from|const|let|var|async|await|new|return|function|if|else|for|while|of|true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)(?=\()/g;
  const highlight = (block) => {
    let out = "";
    let last = 0;
    const source = block.textContent;
    for (const m of source.matchAll(tokens)) {
      out += esc(source.slice(last, m.index));
      if (m[1]) out += wrap("comment", m[1]);
      else if (m[2]) out += highlightTag(m[2]);
      else if (m[3]) out += wrap("str", m[3]);
      else if (m[4]) out += wrap("kw", m[4]);
      else if (m[5]) out += wrap("num", m[5]);
      else out += wrap("fn", m[6]);
      last = m.index + m[0].length;
    }
    block.innerHTML = out + esc(source.slice(last));
  };
  if (codeBlock) highlight(codeBlock);
  document.querySelectorAll(".doc pre.prettyprint").forEach(highlight);

  /* ─────────────────────────────────────────────────────────────
     LIVE QUICK-START RESULT
     ───────────────────────────────────────────────────────────── */

  // Solve the quick-start example in the page, and keep its code in step with the sliders
  const live = document.getElementById("qs-live");
  if (live && codeBlock) {
    const plotDiv = document.getElementById("qs-plot");
    const status = document.getElementById("qs-status");
    const hkSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]; // h/k spans orders of magnitude
    const inputs = {
      temp: document.getElementById("qs-temp"),
      hk: document.getElementById("qs-hk"),
      ext: document.getElementById("qs-ext"),
    };
    const outputs = {
      temp: document.getElementById("qs-temp-out"),
      hk: document.getElementById("qs-hk-out"),
      ext: document.getElementById("qs-ext-out"),
    };
    const meshButton = document.getElementById("qs-mesh");
    const baseCode = codeBlock.textContent;
    let core = null;
    let mesh = null;
    let meshLines = null; // Element edges as one polyline, with null gaps between edges
    let showMesh = false;
    let busy = false;
    let pending = false;

    const values = () => ({
      temp: Number(inputs.temp.value),
      hk: hkSteps[Number(inputs.hk.value)],
      ext: Number(inputs.ext.value),
    });

    // Write the values into the boundary conditions of the code, keeping the comments aligned
    const updateCode = ({ temp, hk, ext }) => {
      const lines = baseCode.split("\n").map((line) => {
        if (!line.includes("addBoundaryCondition")) return line;
        const comment = line.indexOf("//");
        const code = line
          .slice(0, comment)
          .trimEnd()
          .replace(/\["constantTemperature", [-\d.]+\]/, `["constantTemperature", ${temp}]`)
          .replace(/\["convection", [-\d.]+, [-\d.]+\]/, `["convection", ${hk}, ${ext}]`);
        return code.padEnd(comment - 1) + " " + line.slice(comment);
      });
      codeBlock.textContent = lines.join("\n");
      highlight(codeBlock);
      markValues();
    };

    // Mark the numbers the sliders set, and scroll the code to them
    const markValues = () => {
      const text = codeBlock.textContent;
      const starts = new Set();
      for (const bc of text.matchAll(/\["(?:constantTemperature|convection)", ([^\]]+)\]/g)) {
        const offset = bc.index + bc[0].indexOf(bc[1]);
        for (const number of bc[1].matchAll(/\d+(?:\.\d+)?/g)) starts.add(offset + number.index);
      }
      let offset = 0;
      let first = null;
      codeBlock.childNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList.contains("tok-num") && starts.has(offset)) {
          node.classList.add("tok-live");
          first ??= node;
        }
        offset += node.textContent.length;
      });
      if (!first) return;
      const box = codeBlock.getBoundingClientRect();
      const mark = first.getBoundingClientRect();
      if (mark.top < box.top || mark.bottom > box.bottom) {
        codeBlock.scrollTop += mark.top - box.top - codeBlock.clientHeight / 3;
      }
    };

    // Trace each element edge once, through its mid-side node (Gmsh 9-node quad order, 1-based)
    const buildMeshLines = (parsed) => {
      const xs = parsed.nodesXCoordinates;
      const ys = parsed.nodesYCoordinates;
      const x = [];
      const y = [];
      const seen = new Set();
      for (const nodes of parsed.nodalNumbering.quadElements) {
        for (let side = 0; side < 4; side++) {
          const a = nodes[side];
          const b = nodes[(side + 1) % 4];
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const path = nodes.length === 9 ? [a, nodes[4 + side], b] : [a, b];
          path.forEach((n) => {
            x.push(xs[n - 1]);
            y.push(ys[n - 1]);
          });
          x.push(null);
          y.push(null);
        }
      }
      return { x, y };
    };

    const meshColor = () => getComputedStyle(root).getPropertyValue("--ink-strong").trim();

    const meshTraceIndex = () => (plotDiv.data || []).findIndex((trace) => trace.name === "mesh");

    const drawMesh = () => {
      if (!plotDiv.data || !meshLines) return;
      const index = meshTraceIndex();
      if (!showMesh) {
        if (index >= 0) window.Plotly.deleteTraces(plotDiv, index);
        return;
      }
      if (index >= 0) return;
      window.Plotly.addTraces(plotDiv, {
        type: "scatter",
        mode: "lines",
        name: "mesh",
        x: meshLines.x,
        y: meshLines.y,
        line: { width: 0.5, color: meshColor() },
        opacity: 0.45,
        hoverinfo: "skip",
        showlegend: false,
      });
    };

    const showValues = ({ temp, hk, ext }) => {
      outputs.temp.textContent = `${temp} °C`;
      outputs.hk.textContent = `${hk} m⁻¹`;
      outputs.ext.textContent = `${ext} °C`;
    };

    // Plotly draws with fixed colours: take them from the site tokens instead
    const themePlot = () => {
      if (!plotDiv.data) return;
      const css = getComputedStyle(root);
      const ink = css.getPropertyValue("--muted").trim();
      const line = css.getPropertyValue("--line").trim();
      const { nodesXCoordinates: xs, nodesYCoordinates: ys } = plotDiv.feascriptNodes;
      const xRange = [Math.min(...xs), Math.max(...xs)];
      const yRange = [Math.min(...ys), Math.max(...ys)];
      const aspect = (yRange[1] - yRange[0]) / (xRange[1] - xRange[0]);
      // Keep the plot no taller than about 22rem, so the sliders stay in view
      const style = getComputedStyle(plotDiv);
      const room = plotDiv.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const width = Math.round(Math.min(room, 300 / aspect + 90));
      const xMid = (xRange[0] + xRange[1]) / 2;
      const yMid = (yRange[0] + yRange[1]) / 2;
      // Name the boundary condition on each side, with the values the sliders set
      const { temp, hk, ext } = values();
      const label = (text, x, y, extra) => ({
        text,
        x,
        y,
        showarrow: false,
        font: { size: 10, color: css.getPropertyValue("--ink-strong").trim() },
        bgcolor: css.getPropertyValue("--bg").trim(),
        bordercolor: line,
        borderpad: 2,
        opacity: 0.85,
        ...extra,
      });
      const convection = `Convection, h/k = ${hk} m⁻¹, T<sub>ext</sub> = ${ext} °C`;
      const annotations = [
        label(`T = ${temp} °C`, xMid, yRange[0], { yanchor: "bottom", yshift: 4 }),
        label(`T = ${temp} °C`, xRange[1], yMid, { xanchor: "right", xshift: -4, textangle: -90 }),
        label("Symmetry", xRange[0], yMid, { xanchor: "left", xshift: 4, textangle: -90 }),
        label(convection, xMid, yRange[1], { yanchor: "top", yshift: -4 }),
        label("Convection", 2, 1), // Hole centre
      ];
      window.Plotly.relayout(plotDiv, {
        title: { text: "" },
        width,
        height: Math.round((width - 90) * aspect) + 50,
        margin: { l: 34, r: 8, t: 10, b: 30 },
        annotations,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "Roboto, sans-serif", size: 11, color: ink },
        "xaxis.title.text": "",
        "yaxis.title.text": "",
        "xaxis.gridcolor": line,
        "yaxis.gridcolor": line,
        "xaxis.zeroline": false,
        "yaxis.zeroline": false,
        // Fixed to the domain, so the mesh overlay does not pad the axes and shrink the plot
        "xaxis.range": xRange,
        "yaxis.range": yRange,
        "xaxis.autorange": false,
        "yaxis.autorange": false,
        // A preview: no zoom or pan, so there is no view to reset
        "xaxis.fixedrange": true,
        "yaxis.fixedrange": true,
      });
      const fields = plotDiv.data
        .map((trace, index) => (trace.name === "mesh" ? -1 : index))
        .filter((index) => index >= 0);
      window.Plotly.restyle(plotDiv, { "colorbar.title.text": "T (°C)", "colorbar.thickness": 12 }, fields);
      const index = meshTraceIndex();
      if (index >= 0) window.Plotly.restyle(plotDiv, { "line.color": meshColor() }, [index]);
    };

    const solve = () => {
      if (busy) {
        pending = true;
        return;
      }
      busy = true;
      const { temp, hk, ext } = values();
      const model = new core.FEAScriptModel();
      model.setModelConfig("heatConductionScript");
      model.setMeshConfig({ parsedMesh: mesh });
      model.addBoundaryCondition("0", ["constantTemperature", temp]);
      model.addBoundaryCondition("1", ["symmetry"]);
      model.addBoundaryCondition("2", ["convection", hk, ext]);
      model.addBoundaryCondition("3", ["constantTemperature", temp]);
      model.addBoundaryCondition("4", ["convection", hk, ext]);
      model.setSolverMethod("lusolve");
      const start = performance.now();
      const result = model.solve();
      const time = performance.now() - start;
      plotDiv.textContent = "";
      core.plotInterpolatedSolution(model, result, "contour", "qs-plot");
      plotDiv.feascriptNodes = result.nodesCoordinates;
      drawMesh();
      themePlot();
      const nodes = result.nodesCoordinates.nodesXCoordinates.length;
      status.textContent = `Solved in ${time < 10 ? time.toFixed(1) : Math.round(time)} ms · ${nodes} nodes · FEAScript ${core.printVersion}`;
      // Let the browser paint before the next solve
      setTimeout(() => {
        busy = false;
        if (pending) {
          pending = false;
          solve();
        }
      }, 0);
    };

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

    const start = async () => {
      status.textContent = "Loading FEAScript…";
      try {
        const [module] = await Promise.all([
          import("https://core.feascript.com/dist/feascript.esm.js"),
          window.Plotly
            ? null
            : loadScript("https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.35.3/plotly.min.js"),
        ]);
        core = module;
        const response = await fetch("tutorials/rect_with_hole_quad_quadratic.msh");
        if (!response.ok) throw new Error(`Mesh file: ${response.status}`);
        mesh = await core.importGmshMesh(new File([await response.text()], "rect_with_hole_quad_quadratic.msh"));
        // Read the edges now: the first solve renumbers the elements in place
        meshLines = buildMeshLines(mesh);
        meshButton.disabled = false;
        meshButton.addEventListener("click", () => {
          showMesh = !showMesh;
          meshButton.setAttribute("aria-pressed", String(showMesh));
          meshButton.textContent = showMesh ? "Hide mesh" : "Show mesh";
          drawMesh();
        });
        Object.values(inputs).forEach((input) => {
          input.disabled = false;
          input.addEventListener("input", () => {
            const current = values();
            showValues(current);
            updateCode(current);
            solve();
          });
        });
        live.classList.add("is-live");
        solve();
      } catch (error) {
        console.error("Live example:", error);
        live.classList.add("is-failed");
        plotDiv.innerHTML =
          '<p class="qs-wait">The live result could not be loaded. Run the code on CodePen.</p>';
        status.textContent = "";
      }
    };

    // Load Plotly and FEAScript only when the example comes near the screen
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            io.disconnect();
            start();
          }
        },
        { rootMargin: "300px" },
      );
      io.observe(live);
    } else {
      start();
    }

    // Follow the theme and the width of the page
    new MutationObserver(themePlot).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", themePlot);
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(themePlot, 150);
    });
  }

  if (copyButton && codeBlock) {
    copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(codeBlock.innerText.trim()).then(() => {
        const label = copyButton.querySelector("span");
        copyButton.classList.add("copied");
        label.textContent = "Copied";
        setTimeout(() => {
          copyButton.classList.remove("copied");
          label.textContent = "Copy";
        }, 2000);
      });
    });
  }

  // Footer year
  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();

  // GitHub stars: the nav icon and the star link at the end of tutorials share one request
  const stars = document.querySelectorAll("#github-stars, [data-github-stars]");
  if (stars.length) {
    fetch("https://api.github.com/repos/FEAScript/FEAScript-core")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.stargazers_count) stars.forEach((el) => (el.textContent = `★ ${d.stargazers_count}`));
      })
      .catch((error) => console.error("Error fetching GitHub stars:", error));
  }

  // Screenshot carousels: arrows, dots and arrow keys on top of a native scroll-snap track
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".shots-track");
    const slides = Array.from(track.children);
    if (slides.length < 2) return;

    const arrow = (dir, label, path) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "shots-arrow";
      b.setAttribute("aria-label", label);
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
      b.addEventListener("click", () => go(current + dir));
      return b;
    };

    const nav = document.createElement("div");
    nav.className = "shots-nav";
    const dotsBox = document.createElement("div");
    dotsBox.className = "shots-dots";
    const dots = slides.map((slide, i) => {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "shots-dot";
      const label = slide.dataset.label || `Screenshot ${i + 1}`;
      d.setAttribute("aria-label", label);
      d.title = label;
      d.addEventListener("click", () => go(i));
      dotsBox.appendChild(d);
      return d;
    });
    nav.append(
      arrow(-1, "Previous screenshot", "m15 18-6-6 6-6"),
      dotsBox,
      arrow(1, "Next screenshot", "m9 18 6-6-6-6"),
    );
    carousel.appendChild(nav);

    let current = 0;
    const mark = (i) => {
      current = i;
      dots.forEach((d, k) => d.setAttribute("aria-current", k === i ? "true" : "false"));
      slides.forEach((s, k) => s.setAttribute("aria-hidden", k === i ? "false" : "true"));
    };
    // Wrap around at both ends
    const go = (i) => {
      const n = (i + slides.length) % slides.length;
      track.scrollTo({ left: n * track.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
      mark(n);
    };

    // Follow swipes and trackpad scrolling
    let frame = 0;
    track.addEventListener("scroll", () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== current) mark(i);
      });
    });

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        go(current + (e.key === "ArrowRight" ? 1 : -1));
      }
    });

    // Keep the current slide in view when the width changes
    window.addEventListener("resize", () => (track.scrollLeft = current * track.clientWidth));

    mark(0);
  });

  /* ─────────────────────────────────────────────────────────────
     HERO MESH ANIMATION
     ───────────────────────────────────────────────────────────── */

  // Hero: animated finite element mesh with a scalar field
  const canvas = document.getElementById("mesh-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const CELL = 56;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let nodes = [];
  let running = false;
  let raf = 0;

  // Blue (cold) to gold to crimson (hot)
  const stops = [
    [0, [0, 134, 212]],
    [0.5, [212, 170, 0]],
    [1, [200, 0, 63]],
  ];

  function colour(t) {
    t = Math.min(1, Math.max(0, t));
    const i = t < 0.5 ? 0 : 1;
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    const k = (t - t0) / (t1 - t0);
    return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(width / CELL) + 1;
    rows = Math.ceil(height / CELL) + 1;
    nodes = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const edge = i === 0 || j === 0 || i === cols - 1 || j === rows - 1;
        const jitter = edge ? 0 : CELL * 0.22;
        nodes.push({
          x: i * CELL + (Math.random() - 0.5) * 2 * jitter,
          y: j * CELL + (Math.random() - 0.5) * 2 * jitter,
        });
      }
    }
  }

  function field(x, y, t) {
    const a = Math.sin(x * 0.006 + t * 0.6) * Math.cos(y * 0.008 - t * 0.4);
    const b = Math.sin((x + y) * 0.004 + t * 0.3);
    return 0.5 + 0.3 * a + 0.2 * b;
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = getComputedStyle(root).getPropertyValue("--line-strong").trim() || "rgba(0,0,0,0.3)";

    const tri = (a, b, c) => {
      const v = (field(a.x, a.y, t) + field(b.x, b.y, t) + field(c.x, c.y, t)) / 3;
      const [r, g, bl] = colour(v);
      ctx.fillStyle = `rgba(${r},${g},${bl},0.35)`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const n00 = nodes[j * cols + i];
        const n10 = nodes[j * cols + i + 1];
        const n01 = nodes[(j + 1) * cols + i];
        const n11 = nodes[(j + 1) * cols + i + 1];
        tri(n00, n10, n11);
        tri(n00, n11, n01);
      }
    }
  }

  function loop(ms) {
    draw(ms / 1000);
    if (running) raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reducedMotion) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  build();
  draw(0);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      draw(0);
    }, 150);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? start() : stop();
    }).observe(canvas);
  } else {
    start();
  }
})();
