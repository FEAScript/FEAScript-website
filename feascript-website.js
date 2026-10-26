/*
 * ════════════════════════════════════════════════════════════════
 *  FEAScript Website - home page behaviour
 *  Finite Element Simulation in JavaScript
 *  https://feascript.com
 *  CC BY 4.0 License © 2023–2026 FEAScript
 * ════════════════════════════════════════════════════════════════
 */

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

  // Copy the quick-start code
  const copyButton = document.getElementById("copy-qs-btn");
  const codeBlock = document.getElementById("quickstart-code");
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

  // GitHub stars
  const stars = document.getElementById("github-stars");
  if (stars) {
    fetch("https://api.github.com/repos/FEAScript/FEAScript-core")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.stargazers_count) stars.textContent = `★ ${d.stargazers_count}`;
      })
      .catch((error) => console.error("Error fetching GitHub stars:", error));
  }

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
