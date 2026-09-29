"""
Generates the Android launcher icon: a glowing diya on a warm radial gradient,
in the chibi/thick-outline festival style. Writes every density directly into
android/app/src/main/res:
  - ic_launcher_foreground.png  (adaptive foreground - diya in the safe zone)
  - ic_launcher_background.png   (adaptive background - warm gradient)
  - ic_launcher.png / ic_launcher_round.png  (legacy square, composited)

Run:  python tools/make_icon.py
Then rebuild the app so the new icon is packaged.
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RES = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res")
FG = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
LG = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
BASE = 512


def radial_bg(S):
    yy, xx = np.ogrid[0:S, 0:S]
    c = S / 2
    r = np.sqrt((xx - c) ** 2 + (yy - c) ** 2) / (S * 0.66)
    r = np.clip(r, 0, 1)
    c0 = np.array([255, 210, 90]);  c1 = np.array([233, 122, 30]);  c2 = np.array([120, 24, 14])
    t1 = np.clip(r / 0.5, 0, 1)[..., None]
    t2 = np.clip((r - 0.5) / 0.5, 0, 1)[..., None]
    img = c0 * (1 - t1) + c1 * t1
    img = img * (1 - t2) + c2 * t2
    a = np.full((S, S, 1), 255)
    return Image.fromarray(np.concatenate([img, a], 2).astype("uint8"), "RGBA")


def _teardrop(cx, top_y, bot_y, halfw):
    pts_l, pts_r = [], []
    N = 30
    H = bot_y - top_y
    for i in range(N + 1):
        t = i / N                      # 0 = pointed top, 1 = round bottom
        y = top_y + t * H
        wp = math.sin(min(t, 0.80) / 0.80 * math.pi * 0.5) ** 0.85
        if t > 0.9:
            wp *= 1 - (t - 0.9) / 0.1 * 0.18
        pts_l.append((cx - halfw * wp, y))
        pts_r.append((cx + halfw * wp, y))
    return pts_l + pts_r[::-1]


def draw_diya(S, scale):
    """A diya centred in the canvas; total height ~scale*S."""
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = S / 2
    h = scale * S
    w = h * 1.5
    bowlH = h * 0.34
    fh = h * 0.62
    outline = (58, 30, 12, 255)
    ow = max(3, int(S * 0.013))

    # centre the whole diya vertically at ~0.53*S
    bowlY = S * 0.53 + (fh - 0.85 * bowlH) / 2
    fbase = bowlY - bowlH * 0.10
    ftop = fbase - fh

    # --- glow behind the flame ---
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - h * 0.42, fbase - fh * 0.9, cx + h * 0.42, fbase + h * 0.05], fill=(255, 170, 55, 205))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S * 0.04)))

    # --- flame: outer orange, inner yellow, white core ---
    d.polygon(_teardrop(cx, ftop, fbase, w * 0.155), fill=(255, 120, 22, 255))
    d.polygon(_teardrop(cx, ftop + fh * 0.18, fbase - fh * 0.03, w * 0.098), fill=(255, 200, 66, 255))
    d.polygon(_teardrop(cx, ftop + fh * 0.42, fbase - fh * 0.06, w * 0.05), fill=(255, 250, 224, 255))

    # --- wick ---
    d.line([(cx, fbase - h * 0.02), (cx, bowlY - bowlH * 0.1)], fill=(58, 36, 16, 255), width=ow)

    # --- bowl body (clay) ---
    d.chord([cx - w / 2, bowlY - bowlH, cx + w / 2, bowlY + bowlH], 0, 180, fill=(190, 116, 58, 255), outline=outline, width=ow)
    # rim (oil top) + inner oil
    d.ellipse([cx - w / 2, bowlY - bowlH * 0.30, cx + w / 2, bowlY + bowlH * 0.30], fill=(232, 168, 102, 255), outline=outline, width=ow)
    d.ellipse([cx - w / 2 + ow * 1.8, bowlY - bowlH * 0.30 + ow * 1.5, cx + w / 2 - ow * 1.8, bowlY + bowlH * 0.30 - ow * 1.5], fill=(120, 56, 18, 255))
    # soft clay highlight
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse([cx - w * 0.34, bowlY + bowlH * 0.18, cx - w * 0.34 + w * 0.14, bowlY + bowlH * 0.66], fill=(255, 228, 184, 110))
    im.alpha_composite(hl.filter(ImageFilter.GaussianBlur(S * 0.01)))
    return im


def save(img, density, name):
    d = os.path.join(RES, f"mipmap-{density}")
    os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, name), "PNG")


def main():
    bg = radial_bg(BASE)
    fg = draw_diya(BASE, 0.56)                 # adaptive foreground (safe zone)
    legacy = bg.copy(); legacy.alpha_composite(draw_diya(BASE, 0.64))

    for dens, s in FG.items():
        save(bg.resize((s, s), Image.LANCZOS), dens, "ic_launcher_background.png")
        save(fg.resize((s, s), Image.LANCZOS), dens, "ic_launcher_foreground.png")
    for dens, s in LG.items():
        icon = legacy.resize((s, s), Image.LANCZOS)
        save(icon, dens, "ic_launcher.png")
        save(icon, dens, "ic_launcher_round.png")

    # a 512 store icon too
    out = os.path.join(os.path.dirname(__file__), "..", "store")
    os.makedirs(out, exist_ok=True)
    legacy.resize((512, 512), Image.LANCZOS).convert("RGB").save(os.path.join(out, "icon-512.png"))
    print("icons written to", os.path.abspath(RES))
    print("store icon: store/icon-512.png")


if __name__ == "__main__":
    main()
