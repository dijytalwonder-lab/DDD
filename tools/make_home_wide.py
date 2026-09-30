"""
Builds a full-width (2.1:1) home background so the title screen fills a modern
phone edge-to-edge instead of showing orange side frames.

The original home art is 3:2. We place it in the centre 960-px band of a
1344x640 canvas (unchanged, so every baked button/HUD stays put) and fill the
192-px panel on each side with an AMBIENT festive border built from the very
outermost sliver of the scene (sky + foliage + ground only - no characters or
buttons live that far out), stretched and heavily blurred into soft colour, then
darkened with an inward vignette and dressed with hanging lanterns + bunting so
it reads as a decorated frame that continues the village mood.

Writes public/assets/HomePage1_wide.png   (and HomePage_wide.png).
Run:  python tools/make_home_wide.py
"""

import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
PUB = os.path.join(ROOT, "public", "assets")
ASSETS = os.path.join(ROOT, "Assets")

CW, CH = 1344, 640            # logical canvas (matches layout.js)
BANDW = 960                   # 3:2 content band, full height
SIDE = (CW - BANDW) // 2      # 192 px each side
SLIVER = 24                   # outermost strip sampled for the ambient border


def ambient_panel(band, side):
    """A soft blurred colour panel derived from the band's outermost SLIVER,
    so the border echoes the scene's real colours without copying any object."""
    if side == "left":
        strip = band.crop((0, 0, SLIVER, CH))
    else:
        strip = band.crop((BANDW - SLIVER, 0, BANDW, CH))
    panel = strip.resize((SIDE, CH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(48))
    return panel


def build(src_name, out_name):
    src_path = os.path.join(ASSETS, src_name)
    if not os.path.exists(src_path):
        src_path = os.path.join(PUB, src_name)
    art = Image.open(src_path).convert("RGB")

    band = art.resize((BANDW, CH), Image.LANCZOS)
    canvas = Image.new("RGB", (CW, CH))
    canvas.paste(band, (SIDE, 0))
    canvas.paste(ambient_panel(band, "left"), (0, 0))
    canvas.paste(ambient_panel(band, "right"), (CW - SIDE, 0))

    # Darken + warm-tint the panels toward the edges with an inward vignette.
    a = np.asarray(canvas).astype(np.float32)
    xs = np.arange(CW)[None, :, None]
    left_t = np.clip((SIDE - xs) / SIDE, 0, 1)
    right_t = np.clip((xs - (CW - SIDE)) / SIDE, 0, 1)
    edge_t = np.maximum(left_t, right_t) ** 1.2
    a *= (1.0 - 0.30 * edge_t)
    warm = np.array([122, 40, 20], np.float32)
    a = a * (1 - 0.22 * edge_t) + warm * (0.22 * edge_t)
    canvas = Image.fromarray(np.clip(a, 0, 255).astype("uint8")).convert("RGBA")

    # Dress each panel: a top bunting swag + two hanging lanterns.
    def overlay(path, x, y, h):
        try:
            im = Image.open(os.path.join(PUB, path)).convert("RGBA")
            w = int(im.width * h / im.height)
            im = im.resize((w, h), Image.LANCZOS)
            canvas.alpha_composite(im, (int(x - w / 2), int(y)))
        except Exception as e:
            print("  (skip", path, e, ")")

    for cx in (SIDE * 0.5, CW - SIDE * 0.5):
        overlay("decor_lantern.png", cx, -6, 132)
        overlay("decor_lantern.png", cx, CH * 0.46, 108)

    # A short bunting swag pinned across the very top of each panel to tie it in.
    try:
        b = Image.open(os.path.join(PUB, "decor_festival_bunting.png")).convert("RGBA")
        bw = SIDE + 40
        b = b.resize((bw, int(b.height * bw / b.width)), Image.LANCZOS)
        canvas.alpha_composite(b, (-20, -8))
        canvas.alpha_composite(b, (CW - SIDE - 20, -8))
    except Exception as e:
        print("  (skip bunting", e, ")")

    out = os.path.join(PUB, out_name)
    canvas.convert("RGB").save(out, "PNG")
    print("wrote", os.path.relpath(out, ROOT), canvas.size)


if __name__ == "__main__":
    build("HomePage1.png", "HomePage1_wide.png")
    build("HomePage.png", "HomePage_wide.png")
