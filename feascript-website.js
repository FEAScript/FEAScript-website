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

  // Copy text to the clipboard on click, then show "Copied" on the button for 2 s
  const copyOnClick = (button, getText) => {
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(getText()).then(() => {
        const label = button.querySelector("span");
        button.classList.add("copied");
        label.textContent = "Copied";
        setTimeout(() => {
          button.classList.remove("copied");
          label.textContent = "Copy";
        }, 2000);
      });
    });
  };
  const copyIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

  // Copy buttons that carry their text in data-copy
  document.querySelectorAll("[data-copy]").forEach((button) => {
    copyOnClick(button, () => button.dataset.copy);
  });

  // Copy buttons that copy the text of another element, named in data-copy-target
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (target) copyOnClick(button, () => target.innerText.trim());
  });

  // Tutorial code blocks without a bar get one with the language and a Copy button;
  // data-no-copy leaves a block (an excerpt that does not run alone) as it is
  document.querySelectorAll(".doc pre.prettyprint").forEach((pre) => {
    if (pre.closest(".code-block") || pre.hasAttribute("data-no-copy")) return;
    const block = document.createElement("div");
    block.className = "code-block";
    const lang = pre.dataset.lang || (pre.textContent.trim().startsWith("<") ? "HTML" : "JavaScript");
    block.innerHTML =
      '<div class="code-bar label"><span class="file"></span><div class="code-actions">' +
      `<button class="code-btn" type="button" title="Copy code">${copyIcon}<span>Copy</span></button>` +
      "</div></div>";
    block.querySelector(".file").textContent = lang;
    pre.replaceWith(block);
    block.appendChild(pre);
    copyOnClick(block.querySelector(".code-btn"), () => pre.innerText.trim());
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
    let worker = null; // Solves and samples the example off the main thread (qs-worker.js)
    let version = "";
    let meshLines = null; // Element edges as one polyline, with null gaps between edges
    let solution = null; // The latest result from the worker: field trace, plot layout and node coordinates
    const sent = []; // The values of each solve sent to the worker, in order, so the labels match the field they sit on
    let showMesh = false;
    let busy = false;
    let pending = false;
    let moving = false; // A slider is moving: draw a coarser field, which Plotly draws in about half the time
    let settleTimer;
    let coarse = null; // The points of the coarser plot grid

    // The grid is the same for every result: pick its coarse points once
    const coarseField = (field) => {
      if (!coarse || coarse.size !== field.z.length) {
        // Every second grid line, and the last one, so the field still reaches the edges
        const keep = (values) => {
          const lines = [...new Set(values)].sort((a, b) => a - b);
          return new Set(lines.filter((_, i) => i % 2 === 0 || i === lines.length - 1));
        };
        const keepX = keep(field.x);
        const keepY = keep(field.y);
        const points = [];
        field.x.forEach((x, i) => {
          if (keepX.has(x) && keepY.has(field.y[i])) points.push(i);
        });
        coarse = {
          size: field.z.length,
          points,
          x: points.map((i) => field.x[i]),
          y: points.map((i) => field.y[i]),
        };
      }
      return { ...field, x: coarse.x, y: coarse.y, z: coarse.points.map((i) => field.z[i]) };
    };

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
          .replace(/temperature: [-\d.]+/, `temperature: ${temp}`)
          .replace(/h: [-\d.]+, ambientTemperature: [-\d.]+/, `h: ${hk}, ambientTemperature: ${ext}`);
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
      for (const bc of text.matchAll(/type: "(?:constantTemperature|convection)", ([^}]+)\}/g)) {
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

    const meshColor = () => getComputedStyle(root).getPropertyValue("--ink-strong").trim();

    const showValues = ({ temp, hk, ext }) => {
      outputs.temp.textContent = `${temp} °C`;
      outputs.hk.textContent = `${hk} m⁻¹`;
      outputs.ext.textContent = `${ext} °C`;
    };

    // Draw the latest result in one go: Plotly draws with fixed colours, so take them from the site tokens, and add
    // the mesh on top when it is shown
    const render = () => {
      if (!solution) return;
      const css = getComputedStyle(root);
      const ink = css.getPropertyValue("--muted").trim();
      const line = css.getPropertyValue("--line").trim();
      const { nodesXCoordinates: xs, nodesYCoordinates: ys } = solution.nodes;
      const xRange = [Math.min(...xs), Math.max(...xs)];
      const yRange = [Math.min(...ys), Math.max(...ys)];
      const aspect = (yRange[1] - yRange[0]) / (xRange[1] - xRange[0]);
      // Keep the plot no taller than about 22rem, so the sliders stay in view
      const style = getComputedStyle(plotDiv);
      const room = plotDiv.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      // Fixed margins: the colour bar sits in the right one, so its tick labels (60 or 240, two ticks or five) never
      // change the size of the plot. 92 px fits three-digit labels and the title
      const margin = { l: 34, r: 92, t: 10, b: 30, autoexpand: false };
      const sides = margin.l + margin.r;
      const width = Math.round(Math.min(room, 300 / aspect + sides));
      const xMid = (xRange[0] + xRange[1]) / 2;
      const yMid = (yRange[0] + yRange[1]) / 2;
      // Name the boundary condition on each side, with the values the sliders set
      const { temp, hk, ext } = solution.values;
      // Small and see-through, so the labels do not hide the field underneath
      const label = (text, x, y, extra) => ({
        text,
        x,
        y,
        showarrow: false,
        font: { size: 9, color: css.getPropertyValue("--ink-strong").trim() },
        bgcolor: css.getPropertyValue("--bg").trim(),
        borderpad: 1,
        opacity: 0.6,
        ...extra,
      });
      // On a phone the sliders below show the values, so the label names the condition only
      const convection = width < 480 ? "Convection" : `Convection, h/k = ${hk} m⁻¹, T<sub>ext</sub> = ${ext} °C`;
      // A preview: fixed to the domain (so the mesh overlay does not pad the axes), with no zoom or pan
      const axis = (base, range) => ({
        ...base,
        title: { text: "" },
        gridcolor: line,
        zeroline: false,
        range,
        autorange: false,
        fixedrange: true,
      });
      const layout = {
        ...solution.layout,
        title: { text: "" },
        width,
        height: Math.round((width - sides) * aspect) + margin.t + margin.b,
        margin,
        annotations: [
          label(`T = ${temp} °C`, xMid, yRange[0], { yanchor: "bottom", yshift: 4 }),
          label(`T = ${temp} °C`, xRange[1], yMid, { xanchor: "right", xshift: -4, textangle: -90 }),
          label("Symmetry", xRange[0], yMid, { xanchor: "left", xshift: 4, textangle: -90 }),
          label(convection, xMid, yRange[1], { yanchor: "top", yshift: -4 }),
          label("Convection", 2, 1), // Hole centre
        ],
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "Roboto, sans-serif", size: 11, color: ink },
        xaxis: axis(solution.layout.xaxis, xRange),
        yaxis: axis(solution.layout.yaxis, yRange),
      };
      const traces = [
        {
          ...(moving ? coarseField(solution.field) : solution.field),
          colorbar: { ...solution.field.colorbar, title: { text: "T (°C)", side: "right" }, thickness: 12 },
        },
      ];
      if (showMesh && meshLines) {
        traces.push({
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
      }
      if (!plotDiv.data) plotDiv.textContent = ""; // Clear the loading message before the first plot
      window.Plotly.react(plotDiv, traces, layout, { responsive: true });
    };

    // Send the slider values to the worker; while it works, keep only the latest values for the next solve
    const solve = () => {
      if (busy) {
        pending = true;
        return;
      }
      busy = true;
      const current = values();
      sent.push(current);
      worker.postMessage({ type: "solve", values: current });
    };

    const onResult = ({ time, nodes, field, layout }, values) => {
      solution = { nodes, field, layout, values };
      render();
      status.textContent = `Solved in ${time < 10 ? time.toFixed(1) : Math.round(time)} ms · ${nodes.nodesXCoordinates.length} nodes · FEAScript ${version}`;
      // Let the browser paint before the next solve
      requestAnimationFrame(() => {
        busy = false;
        if (pending) {
          pending = false;
          solve();
        }
      });
    };

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

    const fail = (error) => {
      console.error("Live example:", error);
      worker?.terminate();
      live.classList.add("is-failed");
      plotDiv.innerHTML = '<p class="qs-wait">The live result could not be loaded. Run the code on CodePen.</p>';
      status.textContent = "";
    };

    const start = async () => {
      status.textContent = "Loading FEAScript…";
      try {
        const [meshText] = await Promise.all([
          fetch("tutorials/rect_with_hole_quad_quadratic.msh").then((response) => {
            if (!response.ok) throw new Error(`Mesh file: ${response.status}`);
            return response.text();
          }),
          window.Plotly
            ? null
            : loadScript("https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.35.3/plotly.min.js"),
        ]);
        worker = new Worker("qs-worker.js", { type: "module" });
        await new Promise((resolve, reject) => {
          // Before the worker is ready a failure stops the start; after it, it replaces the plot with the message
          let ready = false;
          const failed = (error) => (ready ? fail(error) : reject(error));
          worker.onerror = (event) => failed(new Error(event.message || "Worker error"));
          worker.onmessage = ({ data }) => {
            if (data.type === "ready") {
              ready = true;
              version = data.version;
              meshLines = data.meshLines;
              resolve();
            } else if (data.type === "result") onResult(data, sent.shift());
            else failed(new Error(data.message));
          };
          worker.postMessage({
            type: "init",
            coreUrl: "https://core.feascript.com/dist/feascript.esm.js",
            meshText,
            hkSteps,
          });
        });
        meshButton.disabled = false;
        meshButton.addEventListener("click", () => {
          showMesh = !showMesh;
          meshButton.setAttribute("aria-pressed", String(showMesh));
          meshButton.textContent = showMesh ? "Hide mesh" : "Show mesh";
          render();
        });
        Object.values(inputs).forEach((input) => {
          input.disabled = false;
          input.addEventListener("input", () => {
            const current = values();
            showValues(current);
            updateCode(current);
            // Draw the full field once the slider rests
            moving = true;
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
              moving = false;
              render();
            }, 150);
            solve();
          });
        });
        live.classList.add("is-live");
        solve();
      } catch (error) {
        fail(error);
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
    new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 150);
    });
  }

  if (copyButton && codeBlock) copyOnClick(copyButton, () => codeBlock.innerText.trim());

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
