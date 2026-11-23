"""Shared drawing helpers of the FEAScript figures (documentation and website tutorials).

The same file is in FEAScript-documentation/scripts and FEAScript-website/scripts; keep the two copies identical.

Style: line art in the FEAScript colors, Roboto Mono labels and a sunken fill for domains. A color always means its
physics, as in the rest of FEAScript (heat crimson, flow blue, structure green, front gold), so the boundaries are
colored by what they do:

    heat       a prescribed temperature in crimson on the hot side and blue on the cold side (compared with the
               other temperatures of the problem, fixed or ambient); convection in gold
    flow       moving walls and inlets in blue; no-slip walls in ink
    front      the initial front in gold
    beam       supports in ink, loads (force, moment, distributed load) in green, springs in gold
    any model  zero flux or no condition (symmetry, insulated, zero gradient, stress-free) as a dashed ink line;
               a given value of an abstract unknown (the u of the general form PDE) in ink

Every SVG carries a small stylesheet that maps the fixed colors to CSS variables: #000 ink, #666 muted text, #fff
background, #f6efd9 domain fill, #c8003f heat, #0086d4 flow, #00a86b structure, #d4aa00 gold, #8f7200 gold text. The
variables (--fig-ink, --fig-muted, --fig-bg, --fig-area, --fig-heat, --fig-flow, --fig-structure, --fig-gold,
--fig-gold-ink) are set by the page for its light and dark themes, and the pages inline the SVG so that it follows the
theme. Opened on its own, an SVG falls back to the light colors. Draw only with these fixed colors, so that every
figure stays in the scheme.

Series in plots: FEAScript results in flow blue, references and exact solutions in ink, dashed.
"""

import math

INK, MUTED, BG, AREA = "#000", "#666", "#fff", "#f6efd9"
HEAT, FLOW, STRUCTURE, GOLD, GOLD_TEXT = "#c8003f", "#0086d4", "#00a86b", "#d4aa00", "#8f7200"
HOT, COLD = HEAT, FLOW  # A prescribed temperature on the hot or the cold side
ZERO = "zero"  # Zero flux or no condition: drawn as a dashed ink line, not a color
SERIES = [FLOW, HEAT, GOLD]  # Colors of the first, second and third series of a plot

STYLE = """  <style>
    .fig { font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
    .fig[fill="#000"], .fig [fill="#000"] { fill: var(--fig-ink, #333333); }
    .fig [stroke="#000"] { stroke: var(--fig-ink, #333333); }
    .fig [fill="#666"] { fill: var(--fig-muted, #6b6960); }
    .fig [fill="#fff"] { fill: var(--fig-bg, #fdfaf2); }
    .fig [stroke="#fff"] { stroke: var(--fig-bg, #fdfaf2); }
    .fig [fill="#f6efd9"] { fill: var(--fig-area, #f6efd9); }
    .fig [stroke="#f6efd9"] { stroke: var(--fig-area, #f6efd9); }
    .fig [stroke="#c8003f"] { stroke: var(--fig-heat, #c8003f); }
    .fig [fill="#c8003f"] { fill: var(--fig-heat, #c8003f); }
    .fig [stroke="#d4aa00"] { stroke: var(--fig-gold, #d4aa00); }
    .fig [fill="#d4aa00"] { fill: var(--fig-gold, #d4aa00); }
    .fig [stroke="#0086d4"] { stroke: var(--fig-flow, #0086d4); }
    .fig [fill="#0086d4"] { fill: var(--fig-flow, #0086d4); }
    .fig [stroke="#00a86b"] { stroke: var(--fig-structure, #00a86b); }
    .fig [fill="#00a86b"] { fill: var(--fig-structure, #00a86b); }
    .fig [fill="#8f7200"] { fill: var(--fig-gold-ink, #8f7200); }
    .fig [font-size="11"] { font-size: 10px; }
    .fig [font-size="12"] { font-size: 11px; }
    .fig [font-size="13"] { font-size: 12px; }
    .fig [font-size="16"] { font-size: 14px; }
    .fig [font-size="18"] { font-size: 15px; }
  </style>"""

DEFS = """  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#000"/>
    </marker>
    <marker id="arrow-flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#0086d4"/>
    </marker>
    <marker id="arrow-structure" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#00a86b"/>
    </marker>
  </defs>"""

HALO = 'stroke="#fff" stroke-width="4" stroke-linejoin="round" paint-order="stroke"'  # Background outline behind labels

MESH_STYLE = 'fill="none" stroke="#000" stroke-width="0.6" stroke-opacity="0.45" stroke-linejoin="round"'


def fmt(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")


def svg(width, height, body, comment):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" class="fig" viewBox="0 0 {width} {height}" width="{width}" '
        f'height="{height}" font-family="Roboto Mono, monospace" font-size="13" fill="#000">\n  <!-- {comment} -->\n'
        f"{STYLE}\n{DEFS}\n"
        + "\n".join("  " + line for line in body)
        + "\n</svg>\n"
    )


class Frame:
    """Maps model coordinates (y up) to SVG coordinates (y down)."""

    def __init__(self, x0, y0, scale):
        self.x0, self.y0, self.scale = x0, y0, scale

    def __call__(self, x, y):
        return self.x0 + self.scale * x, self.y0 - self.scale * y


def text(x, y, content, size=15, fill="#000", anchor="middle", rotate=None, weight=None):
    attributes = f'x="{fmt(x)}" y="{fmt(y)}"'
    if size != 15:
        attributes += f' font-size="{size}"'
    if fill != "#000":
        attributes += f' fill="{fill}"'
    if anchor != "start":
        attributes += f' text-anchor="{anchor}"'
    if weight:
        attributes += f' font-weight="{weight}"'
    if rotate is not None:
        attributes += f' transform="rotate({rotate} {fmt(x)} {fmt(y)})"'
    return f"<text {attributes}>{content}</text>"


def bname(boundary):
    """A boundary name as it is written in code, for the key line under a condition: "bottom"."""
    return f'"{boundary}"'


def kind(condition):
    """The color of a boundary from the wording of its condition (see the module docstring).

    A prescribed temperature is taken as the hot side; pass COLD explicitly where it is the cold side."""
    plain = condition.lower()
    for tag in ("<tspan", "</tspan>"):
        plain = plain.replace(tag, " ")
    if "convection" in plain or "spring" in plain or "initial front" in plain:
        return GOLD
    if any(word in plain for word in ("symmetry", "insulated", "zero gradient", "stress-free", "∂")) or ("/d" in plain and "= 0" in plain):
        return ZERO
    if any(word in plain for word in ("moving", "lid", "inlet")):
        return FLOW
    if any(word in plain for word in ("force", "load", "moment")):
        return STRUCTURE
    if "temperature" in plain or "°c" in plain:
        return HOT
    return INK  # No-slip walls, supports and the given values of an abstract unknown


def edge(points, color, width=4):
    """A boundary drawn over the outline in the color of its condition; ZERO is a dashed ink line."""
    path = " ".join(f"{fmt(x)},{fmt(y)}" for x, y in points)
    if color == ZERO:
        return (
            f'<polyline points="{path}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<polyline points="{path}" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="7 5" stroke-linejoin="round"/>'
        )
    return f'<polyline points="{path}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'


def end_dot(x, y, color):
    """The end node of a 1D domain in the color of its condition: open for zero flux or no condition."""
    return dot(x, y, 5, filled=False) if color == ZERO else dot(x, y, 5, color=color)


def label(x, y, condition, key, side):
    """Boundary condition and its key, placed outside a domain edge (side: bottom, top, left or right)."""
    if side == "bottom":
        return [text(x, y + 22, condition), text(x, y + 38, key, 12, "#666")]
    if side == "top":
        return [text(x, y - 12, condition), text(x, y - 30, key, 12, "#666")]
    if side == "left":
        return [text(x - 14, y, condition, rotate=-90), text(x - 30, y, key, 12, "#666", rotate=-90)]
    return [text(x + 20, y, condition, rotate=90), text(x + 36, y, key, 12, "#666", rotate=90)]


def dimension(x1, y1, x2, y2, content, offset_x=0, offset_y=0, rotate=None):
    line = (
        f'<line x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}" stroke="#000" stroke-width="1" '
        'stroke-dasharray="4 3" marker-start="url(#arrow)" marker-end="url(#arrow)"/>'
    )
    return [line, text((x1 + x2) / 2 + offset_x, (y1 + y2) / 2 + offset_y, content, rotate=rotate)]


def outline(points, width=2, filled=False):
    path = " ".join(f"{fmt(x)},{fmt(y)}" for x, y in points)
    fill = AREA if filled else "none"
    return f'<polygon points="{path}" fill="{fill}" stroke="#000" stroke-width="{width}" stroke-linejoin="round"/>'


def dot(x, y, radius=3, filled=True, color="#000"):
    fill = color if filled else "#fff"
    return f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="{radius}" fill="{fill}" stroke="{color}" stroke-width="1.2"/>'


def origin(frame):
    x, y = frame(0, 0)
    return [dot(x, y), text(x - 6, y + 20, "(0, 0)", 13)]


def italic(symbol):
    return f'<tspan font-style="italic">{symbol}</tspan>'


def sub(content):
    return f'<tspan dy="4" font-size="11">{content}</tspan><tspan dy="-4"></tspan>'


def structured_mesh(frame, width, height, nx, ny):
    """Grid lines of an nx x ny mesh on a filled rectangle; draw the outline after it."""
    x0, y0 = frame(0, 0)
    x1, y1 = frame(width, height)
    lines = [f'<rect x="{fmt(min(x0, x1))}" y="{fmt(min(y0, y1))}" width="{fmt(abs(x1 - x0))}" height="{fmt(abs(y1 - y0))}" fill="{AREA}"/>']
    grid = []
    for i in range(1, nx):
        xa, ya = frame(width * i / nx, 0)
        xb, yb = frame(width * i / nx, height)
        grid.append(f'<line x1="{fmt(xa)}" y1="{fmt(ya)}" x2="{fmt(xb)}" y2="{fmt(yb)}"/>')
    for j in range(1, ny):
        xa, ya = frame(0, height * j / ny)
        xb, yb = frame(width, height * j / ny)
        grid.append(f'<line x1="{fmt(xa)}" y1="{fmt(ya)}" x2="{fmt(xb)}" y2="{fmt(yb)}"/>')
    return lines + [f"<g {MESH_STYLE}>"] + ["  " + line for line in grid] + ["</g>"]


def read_gmsh(path):
    """Nodes and 2D elements of a Gmsh 4.1 ASCII mesh, as polygons through all element edge nodes."""
    with open(path) as handle:
        lines = [line.strip() for line in handle]
    nodes, polygons = {}, []
    index = lines.index("$Nodes") + 1
    blocks = int(lines[index].split()[0])
    index += 1
    for _ in range(blocks):
        count = int(lines[index].split()[3])
        tags = [int(lines[index + 1 + k]) for k in range(count)]
        for k, tag in enumerate(tags):
            x, y, _ = map(float, lines[index + 1 + count + k].split())
            nodes[tag] = (x, y)
        index += 1 + 2 * count
    # Node order around each element: corners interleaved with edge nodes (Gmsh numbering)
    orders = {2: [0, 1, 2], 3: [0, 1, 2, 3], 9: [0, 3, 1, 4, 2, 5], 10: [0, 4, 1, 5, 2, 6, 3, 7]}
    index = lines.index("$Elements") + 1
    blocks = int(lines[index].split()[0])
    index += 1
    for _ in range(blocks):
        dim, _, element_type, count = map(int, lines[index].split())
        for k in range(count):
            if dim == 2 and element_type in orders:
                element = list(map(int, lines[index + 1 + k].split()))[1:]
                polygons.append([nodes[element[i]] for i in orders[element_type]])
        index += 1 + count
    return polygons


def gmsh_mesh(frame, polygons):
    body = [f'<g fill="{AREA}" stroke="#000" stroke-width="0.6" stroke-opacity="0.45" stroke-linejoin="round">']
    for polygon in polygons:
        points = " ".join(f"{fmt(px)},{fmt(py)}" for px, py in (frame(x, y) for x, y in polygon))
        body.append(f'  <polygon points="{points}"/>')
    return body + ["</g>"]


def rectangle(frame, width, height, filled=True):
    return outline([frame(0, 0), frame(width, 0), frame(width, height), frame(0, height)], filled=filled)


def rectangle_edges(frame, width, height, colors):
    """The four sides of a rectangle in the colors of their conditions: colors = (bottom, left, top, right)."""
    corners = {"bottom": ((0, 0), (width, 0)), "left": ((0, 0), (0, height)), "top": ((0, height), (width, height)), "right": ((width, 0), (width, height))}
    return [edge([frame(*a), frame(*b)], color) for (a, b), color in zip(corners.values(), colors) if color]


def series_style(k):
    """Color and dash pattern of the k-th series of a plot."""
    return SERIES[k % len(SERIES)], ["", ' stroke-dasharray="5 4"', ' stroke-dasharray="1.5 3"'][k % 3]


def log_plot(series, x_label, y_label, comment, width=640, height=360, padding=0.25):
    """Log-log plot with a legend in the top left corner.

    Gridlines and ticks are at the decades, labelled as powers of ten; an axis that spans less than two decades
    gets ticks at 1, 2 and 5 times the decades instead, labelled as plain numbers.

    series: list of (name, points), at most three, in flow blue, crimson and gold; the first is a solid line with
    open circles, the second a dashed line with filled circles and the third a dotted line with open squares.
    """
    left, right, top, bottom = 90, width - 40, 30, height - 60
    xs = [math.log10(x) for _, points in series for x, _ in points]
    ys = [math.log10(y) for _, points in series for _, y in points]
    x_min, x_max = min(xs) - padding, max(xs) + padding
    y_min, y_max = min(ys) - padding, max(ys) + padding

    def px(x):
        return left + (math.log10(x) - x_min) / (x_max - x_min) * (right - left)

    def py(y):
        return bottom - (math.log10(y) - y_min) / (y_max - y_min) * (bottom - top)

    def power(value):
        e = round(math.log10(value))
        if e == 0:
            return "1"
        if e == 1:
            return "10"
        return f'10<tspan dy="-6" font-size="10">{str(e).replace("-", "−")}</tspan>'

    def ticks(low, high):
        """Tick values and their labels between 10**low and 10**high."""
        decades = range(math.floor(low), math.ceil(high) + 1)
        if sum(1 for e in decades if low <= e <= high) >= 2:
            return [(10**e, power(10**e)) for e in decades if low <= e <= high]
        values = [m * 10**e for e in decades for m in (1, 2, 5)]
        return [(v, f"{v:g}") for v in values if low <= math.log10(v) <= high]

    x_ticks, y_ticks = ticks(x_min, x_max), ticks(y_min, y_max)
    body = ['<g stroke="#000" stroke-width="0.6" stroke-opacity="0.2">']
    body += [f'  <line x1="{fmt(px(v))}" y1="{top}" x2="{fmt(px(v))}" y2="{bottom}"/>' for v, _ in x_ticks]
    body += [f'  <line x1="{left}" y1="{fmt(py(v))}" x2="{right}" y2="{fmt(py(v))}"/>' for v, _ in y_ticks]
    body += ["</g>"]
    body += [f'<line x1="{left}" y1="{bottom}" x2="{right}" y2="{bottom}" stroke="#000" stroke-width="1"/>']
    body += [f'<line x1="{left}" y1="{top}" x2="{left}" y2="{bottom}" stroke="#000" stroke-width="1"/>']
    body += [text(px(v), bottom + 20, label, 13) for v, label in x_ticks]
    body += [text(left - 8, py(v) + 4, label, 13, anchor="end") for v, label in y_ticks]
    body += [text((left + right) / 2, height - 14, x_label)]
    body += [text(24, (top + bottom) / 2, y_label, rotate=-90)]

    def marker(k, x, y):
        color, _ = series_style(k)
        if k == 2:  # Open square
            return f'<rect x="{fmt(x - 3.5)}" y="{fmt(y - 3.5)}" width="7" height="7" fill="#fff" stroke="{color}" stroke-width="1.2"/>'
        return dot(x, y, 3.5, filled=k == 1, color=color)

    for k, (name_, points) in enumerate(series):
        color, dash = series_style(k)
        path = " ".join(f"{fmt(px(x))},{fmt(py(y))}" for x, y in points)
        body.append(f'<polyline points="{path}" fill="none" stroke="{color}" stroke-width="2"{dash}/>')
        body += [marker(k, px(x), py(y)) for x, y in points]
        ly = top + 18 + 22 * k
        body.append(f'<line x1="{left + 18}" y1="{ly}" x2="{left + 50}" y2="{ly}" stroke="{color}" stroke-width="2"{dash}/>')
        body.append(marker(k, left + 34, ly))
        body.append(f'<text x="{left + 60}" y="{ly + 4}" font-size="13" {HALO}>{name_}</text>')
    return svg(width, height, body, comment)
