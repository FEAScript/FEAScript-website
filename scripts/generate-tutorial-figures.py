"""Generate the mesh figures of the tutorials, and the schematic of the advection-diffusion tutorial.

The figures follow the style of the other figures in assets/: black line art, sans-serif 15 px labels, boundary
keys in grey 12 px, dashed dimension lines with arrows, and thin grey mesh edges. The 2D meshes use the layout of
gmsh_rect_quad.svg and gmsh_rhom_quad.svg (side names with their boundary keys, origin marker).

    python3 scripts/generate-tutorial-figures.py

The figures are written to assets/.
"""

import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "assets")

DEFS = """  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#000"/>
    </marker>
  </defs>"""

MESH_STYLE = 'fill="none" stroke="#000" stroke-width="0.8" stroke-opacity="0.55" stroke-linejoin="round"'


def fmt(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")


def svg(width, height, body, comment):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" '
        f'font-family="sans-serif" font-size="15" fill="#000">\n  <!-- {comment} -->\n{DEFS}\n'
        + "\n".join("  " + line for line in body)
        + "\n</svg>\n"
    )


def text(x, y, content, size=15, fill="#000", anchor="middle", rotate=None):
    attributes = f'x="{fmt(x)}" y="{fmt(y)}"'
    if size != 15:
        attributes += f' font-size="{size}"'
    if fill != "#000":
        attributes += f' fill="{fill}"'
    if anchor != "start":
        attributes += f' text-anchor="{anchor}"'
    if rotate is not None:
        attributes += f' transform="rotate({rotate} {fmt(x)} {fmt(y)})"'
    return f"<text {attributes}>{content}</text>"


def italic(symbol):
    return f'<tspan font-style="italic">{symbol}</tspan>'


def dimension(x1, y1, x2, y2, content, offset_y=20):
    return [
        f'<line x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}" stroke="#000" stroke-width="1" '
        'stroke-dasharray="4 3" marker-start="url(#arrow)" marker-end="url(#arrow)"/>',
        text((x1 + x2) / 2, (y1 + y2) / 2 + offset_y, content),
    ]


def node(x, y, radius=4, filled=False):
    fill = "#000" if filled else "#fff"
    return f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="{radius}" fill="{fill}" stroke="#000" stroke-width="1.5"/>'


def structured_mesh_2d(width, height, nx, ny, comment):
    """A width x height rectangle, scaled to 320 px wide, with nx x ny elements (layout of gmsh_rect_quad.svg)."""
    scale = 320 / width
    x0, y0 = 130, 80 + scale * height
    x1, y1 = x0 + scale * width, 80
    lines = []
    for i in range(1, nx):
        x = x0 + (x1 - x0) * i / nx
        lines.append(f'<line x1="{fmt(x)}" y1="{fmt(y0)}" x2="{fmt(x)}" y2="{fmt(y1)}"/>')
    for j in range(1, ny):
        y = y0 + (y1 - y0) * j / ny
        lines.append(f'<line x1="{fmt(x0)}" y1="{fmt(y)}" x2="{fmt(x1)}" y2="{fmt(y)}"/>')
    xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
    body = [f"<g {MESH_STYLE}>"] + ["  " + line for line in lines] + ["</g>"]
    body += [
        f'<rect x="{fmt(x0)}" y="{fmt(y1)}" width="{fmt(x1 - x0)}" height="{fmt(y0 - y1)}" fill="none" stroke="#000" stroke-width="2"/>'
    ]
    body += [text(xm, y0 + 28, "bottom"), text(xm, y0 + 44, 'boundary "0"', 12, "#666")]
    body += [text(x0 - 14, ym, "left", rotate=-90), text(x0 - 32, ym, 'boundary "1"', 12, "#666", rotate=-90)]
    body += [text(xm, y1 - 10, "top"), text(xm, y1 - 28, 'boundary "2"', 12, "#666")]
    body += [text(x1 + 20, ym, "right", rotate=90), text(x1 + 38, ym, 'boundary "3"', 12, "#666", rotate=90)]
    body += [f'<circle cx="{fmt(x0)}" cy="{fmt(y0)}" r="3"/>', text(x0 - 8, y0 + 20, "(0, 0)", 13, anchor="end")]
    return svg(580, int(y0 + 80), body, comment)


def mesh_1d(length, elements, quadratic, left, right, length_label, comment):
    """A 1D mesh: element end nodes as open circles, midside nodes of quadratic elements as small dots."""
    x0, x1, y = 80, 500, 120
    body = [f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="#000" stroke-width="2"/>']
    for i in range(elements):
        if quadratic:
            xm = x0 + (x1 - x0) * (i + 0.5) / elements
            body.append(f'<circle cx="{fmt(xm)}" cy="{y}" r="2"/>')
    body += [node(x0 + (x1 - x0) * i / elements, y) for i in range(elements + 1)]
    body += [text(x0, y - 26, left), text(x0, y - 44, 'boundary "0"', 12, "#666")]
    body += [text(x1, y - 26, right), text(x1, y - 44, 'boundary "1"', 12, "#666")]
    body += dimension(x0, y + 35, x1, y + 35, length_label)
    body += [f'<circle cx="{x0}" cy="{y + 95}" r="3"/>']
    body += [f'<line x1="{x0}" y1="{y + 95}" x2="{x0 + 50}" y2="{y + 95}" stroke="#000" stroke-width="1" marker-end="url(#arrow)"/>']
    body += [text(x0 + 58, y + 100, italic("x"), anchor="start"), text(x0, y + 113, f"{italic('x')} = 0", 12)]
    return svg(580, 240, body, comment)


def advection_diffusion_schematic():
    """1D domain [0, 1] with the boundary conditions, the Gaussian source and the advection direction."""
    x0, x1, y = 80, 500, 190

    def px(x):
        return x0 + (x1 - x0) * x

    body = [f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="#000" stroke-width="2"/>', node(x0, y), node(x1, y)]
    curve = " ".join(
        f"{fmt(px(k / 200))},{fmt(y - 12 - 90 * math.exp(-200 * (k / 200 - 0.5) ** 2))}" for k in range(201)
    )
    body += [f'<polyline points="{curve}" fill="none" stroke="#000" stroke-width="1.5"/>']
    body += [text(px(0.5) + 34, y - 90, f"Source {italic('D')}({italic('x')})", anchor="start")]
    body += [f'<line x1="{fmt(px(0.15))}" y1="{y - 40}" x2="{fmt(px(0.32))}" y2="{y - 40}" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)"/>']
    body += [text(px(0.235), y - 50, "Advection", 13, "#666")]
    body += [text(x0, y + 28, f"{italic('u')}(0) = 1"), text(x0, y + 44, 'boundary "0"', 12, "#666")]
    body += [text(x1, y + 28, f"d{italic('u')}/d{italic('x')} = 0"), text(x1, y + 44, 'boundary "1"', 12, "#666")]
    body += dimension(x0, y + 75, x1, y + 75, "1")
    body += [
        text(
            px(0.5),
            40,
            f"d<tspan dy=\"-6\" font-size=\"11\">2</tspan><tspan dy=\"6\">{italic('u')}/d{italic('x')}</tspan>"
            f"<tspan dy=\"-6\" font-size=\"11\">2</tspan><tspan dy=\"6\">&#160;− 10 d{italic('u')}/d{italic('x')} = {italic('D')}({italic('x')})</tspan>",
            18,
        )
    ]
    return svg(580, 310, body, "Advection-diffusion in 1D: domain [0, 1], Gaussian source centered at x = 0.5")


FIGURES = {
    "heat-conduction-1d-wall-mesh.svg": lambda: mesh_1d(
        0.15, 10, False, "Convection", f"{italic('T')} = 5 °C", "0.15 m", "1D wall: 10 linear elements, 11 nodes"
    ),
    "heat-conduction-2d-fin-mesh.svg": lambda: structured_mesh_2d(
        4, 2, 8, 4, "2D fin: 8 x 4 quadratic quadrilaterals (17 x 9 nodes), internally generated"
    ),
    "stokes-2d-lid-driven-mesh.svg": lambda: structured_mesh_2d(
        4, 2, 12, 6, "Lid-driven cavity: 12 x 6 quadratic quadrilaterals (25 x 13 nodes), internally generated"
    ),
    "solidification-front-2d-mesh.svg": lambda: structured_mesh_2d(
        4, 2, 12, 8, "Solidification front: 12 x 8 quadratic quadrilaterals (25 x 17 nodes), internally generated"
    ),
    "advection-diffusion-1d.svg": advection_diffusion_schematic,
    "advection-diffusion-1d-mesh.svg": lambda: mesh_1d(
        1, 20, True, f"{italic('u')}(0) = 1", f"d{italic('u')}/d{italic('x')} = 0", "1",
        "Advection-diffusion in 1D: 20 quadratic elements, 41 nodes",
    ),
}

if __name__ == "__main__":
    for file_name, draw in FIGURES.items():
        with open(os.path.join(OUTPUT, file_name), "w") as handle:
            handle.write(draw())
        print(f"Wrote assets/{file_name}")
