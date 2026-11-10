"""Generate the 1200 x 630 preview cards that LinkedIn, Bluesky and other sites show when a page is shared.

Each card has the FEAScript wordmark, a mono eyebrow, the page title (from its <title>) and a picture of the page:
a result figure for the tutorials, a screenshot for Studio. The cards are drawn by headless Chromium with the
website's own stylesheet and fonts, so they follow the site's look.

    python3 scripts/generate-social-cards.py            # every card
    python3 scripts/generate-social-cards.py studio     # only the cards whose name contains "studio"

The cards are written to assets/ as social-<name>.png. Each page names its card in its og:image tag. A new page
needs a row in PAGES, a run of this script and the same head tags as the other pages.
Needs Chromium (CHROMIUM_PATH, default "chromium") and the network, for the fonts.
"""

import html
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMIUM = os.environ.get("CHROMIUM_PATH", "chromium")

# name: (page, eyebrow, picture, title shown on the card or None for the page's <title>)
PAGES = {
    "home": ("index.html", "javascript finite element library", "tutorials/heat-conduction-2d-fin-results.png",
             "A JavaScript finite element library, for the web."),
    "studio": ("studio.html", "feascript studio", "assets/feascript-studio-app.png",
               "Simulation apps, built in the browser."),
    "tutorials": ("tutorials/index.html", "tutorials", "tutorials/solidification-front-2d-results.png",
                  "Learn by running, with step-by-step tutorials."),
    "advection-diffusion-1d": ("tutorials/advection-diffusion-1d.html", "tutorial",
                               "tutorials/advection-diffusion-1d-results.png", None),
    "cantilever-beam-1d": ("tutorials/cantilever-beam-1d.html", "tutorial",
                           "tutorials/cantilever-beam-1d-results.png", None),
    "creeping-flow-2d-pillar-array": ("tutorials/creeping-flow-2d-pillar-array.html", "tutorial",
                                      "tutorials/creeping-flow-2d-pillar-array-results.png", None),
    "heat-conduction-1d-wall": ("tutorials/heat-conduction-1d-wall.html", "tutorial",
                                "tutorials/heat-conduction-1d-wall-results.png", None),
    "heat-conduction-2d-fin": ("tutorials/heat-conduction-2d-fin.html", "tutorial",
                               "tutorials/heat-conduction-2d-fin-results.png", None),
    "heat-conduction-2d-fin-gmsh": ("tutorials/heat-conduction-2d-fin-gmsh.html", "tutorial",
                                    "tutorials/heat-conduction-2d-fin-results.png", None),
    "heat-conduction-2d-fin-performance-test": ("tutorials/heat-conduction-2d-fin-performance-test.html",
                                                "performance test", "tutorials/heat-conduction-2d-fin-results.png",
                                                None),
    "heat-conduction-2d-fin-vtk": ("tutorials/heat-conduction-2d-fin-vtk.html", "tutorial",
                                   "tutorials/heat-conduction-2d-fin-results.png", None),
    "heat-conduction-2d-fin-webgpu": ("tutorials/heat-conduction-2d-fin-webgpu.html", "tutorial",
                                      "tutorials/heat-conduction-2d-fin-results.png", None),
    "heat-conduction-2d-fin-worker": ("tutorials/heat-conduction-2d-fin-worker.html", "tutorial",
                                      "tutorials/heat-conduction-2d-fin-results.png", None),
    "heat-conduction-2d-rhom-fin-gmsh": ("tutorials/heat-conduction-2d-rhom-fin-gmsh.html", "tutorial",
                                         "tutorials/gmsh_rhom_quad.svg", None),
    "lid-driven-cavity-2d-creeping-flow": ("tutorials/lid-driven-cavity-2d-creeping-flow.html", "tutorial",
                                           "tutorials/lid-driven-cavity-2d-stokes-u-results.png", None),
    "lid-driven-cavity-2d-creeping-flow-worker": ("tutorials/lid-driven-cavity-2d-creeping-flow-worker.html",
                                                  "tutorial", "tutorials/lid-driven-cavity-2d-stokes-u-results.png",
                                                  None),
    "solidification-front-2d": ("tutorials/solidification-front-2d.html", "tutorial",
                                "tutorials/solidification-front-2d-results.png", None),
    "solidification-front-2d-worker": ("tutorials/solidification-front-2d-worker.html", "tutorial",
                                       "tutorials/solidification-front-2d-results.png", None),
}

WORDMARK = """<svg viewBox="14 79 242 242" aria-hidden="true"><polygon points="17,254 190,82 253,317" fill="#d4aa00" /></svg>
<span>FEAScrip<svg class="wm-t" viewBox="0 0 30 115" fill="none" stroke="currentColor">
<path stroke-width="5.9" d="M15 0V100A11.4 11.4 0 0 0 26.4 111.4H29.5" />
<path stroke-width="5.4" d="M0.4 16.9H29.6" /></svg></span>"""

TEMPLATE = """<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="{root}/feascript-website.css" rel="stylesheet">
<style>
  html, body {{ margin: 0; width: 1200px; height: 630px; overflow: hidden; }}
  body {{ display: grid; grid-template-columns: 560px 1fr; gap: 48px; align-items: center; padding: 56px 64px;
         box-sizing: border-box; background-color: var(--bg); }}
  .card-text {{ display: flex; flex-direction: column; height: 100%; justify-content: space-between; }}
  .card-text .nav-brand {{ font-size: 2.25rem; }}
  .card-text .eyebrow {{ margin: 0 0 1.25rem; }}
  .card-title .accent {{ color: var(--gold-ink); font-weight: 400; }}
  .card-title {{ margin: 0; font-size: {title_size}px; font-weight: 300; line-height: 1.12; letter-spacing: -0.01em;
                color: var(--ink-strong); }}
  .card-url {{ font-family: var(--font-mono); font-size: 18px; color: var(--muted); }}
  .card-picture {{ display: flex; align-items: center; justify-content: center; height: 100%; }}
  .card-picture img {{ max-width: 100%; max-height: 100%; border: 1px solid var(--line); border-radius: 6px;
                      background: #fff; padding: {pad}px; box-sizing: border-box; }}
</style>
</head>
<body>
  <div class="card-text">
    <a class="nav-brand">{wordmark}</a>
    <div>
      <div class="eyebrow label"><p>{eyebrow}</p></div>
      <h1 class="card-title">{title}</h1>
    </div>
    <div class="card-url">feascript.com</div>
  </div>
  <div class="card-picture"><img src="{root}/{picture}" alt=""></div>
</body>
</html>
"""


def page_title(page):
    """The page's <title>, without its " · FEAScript ..." suffix."""
    with open(os.path.join(ROOT, page), encoding="utf-8") as f:
        title = html.unescape(re.search(r"<title>(.*?)</title>", f.read(), re.S).group(1).strip())
    return re.sub(r" · FEAScript.*$", "", title)


def accented(title):
    """The title with its second part in gold, as on the site's headings: a variant in parentheses, or the words
    after the first comma."""
    escaped = html.escape(title)
    if " (" in escaped:
        head, tail = escaped.split(" (", 1)
        return f'{head} <span class="accent">({tail}</span>'
    if ", " in escaped:
        head, tail = escaped.split(", ", 1)
        return f'{head}, <span class="accent">{tail}</span>'
    return escaped


def render(name, page, eyebrow, picture, title):
    title = title or page_title(page)
    card = TEMPLATE.format(
        root="file://" + ROOT,
        wordmark=WORDMARK,
        eyebrow=html.escape(eyebrow),
        title=accented(title),
        title_size=52 if len(title) < 45 else 44,
        picture=picture,
        pad=0 if picture.startswith("assets/") else 12,
    )
    output = os.path.join(ROOT, "assets", f"social-{name}.png")
    with tempfile.TemporaryDirectory() as tmp:
        source = os.path.join(tmp, "card.html")
        with open(source, "w", encoding="utf-8") as f:
            f.write(card)
        subprocess.run(
            [CHROMIUM, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
             "--allow-file-access-from-files", "--virtual-time-budget=5000", "--window-size=1200,630",
             f"--screenshot={output}", "file://" + source],
            check=True, capture_output=True, timeout=120,
        )
    print(f"assets/social-{name}.png  {title}")


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else ""
    for name, row in PAGES.items():
        if only in name:
            render(name, *row)
