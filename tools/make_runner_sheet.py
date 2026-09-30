"""
Prepares the dedicated running sprite sheet (a boy running WITH the diya tray,
already facing right and on a clean transparent background) for the game.

The source frames (4 x 1, 543x724) carry a lot of empty margin and the character
drifts frame to frame. We crop every frame to ONE common tight box - the union
of all four opaque bounds plus a small pad - so the stride stays aligned and the
feet rest on a consistent line, then downscale to a sensible in-game size.

Writes public/assets/runner_diwali.png and prints the frame size to use in
assets.js (SHEETS.runner).
Run:  python tools/make_runner_sheet.py
"""

import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "Assets", "DiwaliBoy RunningSpriteSheet.png")
OUT = os.path.join(ROOT, "public", "assets", "runner_diwali.png")

COLS, ROWS = 4, 1
PAD = 8
TARGET_H = 300     # downscaled frame height in px (crisp for a ~190px display)


def main():
    im = Image.open(SRC).convert("RGBA")
    W, H = im.size
    fw, fh = W // COLS, H // ROWS
    a = np.asarray(im)[..., 3]

    # union opaque box across all frames (in per-frame coords)
    x0 = y0 = 10 ** 9
    x1 = y1 = -1
    for i in range(COLS):
        fr = a[:, i * fw:(i + 1) * fw]
        ys, xs = np.where(fr > 20)
        x0, x1 = min(x0, xs.min()), max(x1, xs.max())
        y0, y1 = min(y0, ys.min()), max(y1, ys.max())
    x0 = max(0, x0 - PAD); y0 = max(0, y0 - PAD)
    x1 = min(fw - 1, x1 + PAD); y1 = min(fh - 1, y1 + PAD)
    cw, ch = x1 - x0 + 1, y1 - y0 + 1

    scale = TARGET_H / ch
    ow, oh = round(cw * scale), TARGET_H
    sheet = Image.new("RGBA", (ow * COLS, oh), (0, 0, 0, 0))
    for i in range(COLS):
        frame = im.crop((i * fw + x0, y0, i * fw + x1 + 1, y1 + 1))
        frame = frame.resize((ow, oh), Image.LANCZOS)
        sheet.paste(frame, (i * ow, 0))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sheet.save(OUT, "PNG")

    # feet line within the cropped frame (for the sprite origin in game)
    feet_frac = (y1 - y0) / ch  # bottom-most opaque row, as a fraction of height
    print(f"wrote {os.path.relpath(OUT, ROOT)}")
    print(f"  frameWidth {ow}  frameHeight {oh}  (cols {COLS})")
    print(f"  suggest origin y ~ {feet_frac:.3f} (feet line)")


if __name__ == "__main__":
    main()
