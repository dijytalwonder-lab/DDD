"""
Cleanly keys the checkerboard background out of the master player sprite sheet
(Assets/player_sheet.png) without touching the interior whites - the eyes'
sclera and the tray's diyas - which an earlier global optimise pass blew out
into white blobs (the "googly eyes").

Method: the checker background is desaturated AND bright; the character is
saturated or dark. We mark bright-desaturated pixels as background CANDIDATES,
then keep only the candidate region that is connected to the image border as
true background. Interior sclera/tray whites are enclosed by the character's
silhouette, so they are never reached and stay opaque.

Writes public/assets/player_diwali_delivery_sheet.png  (1024x1056, 8x6 @128x176).
Run:  python tools/key_player_sheet.py
"""

import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "Assets", "player_sheet.png")
OUT = os.path.join(ROOT, "public", "assets", "player_diwali_delivery_sheet.png")

SAT_MAX = 22      # checker is near-grey; character skin/cloth is well above this
VAL_MIN = 185     # checker tones are ~207 and ~253; character darks fall below


def main():
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im).astype(int)
    mx = a.max(2)
    mn = a.min(2)
    sat = mx - mn
    val = mx
    bg_candidate = (sat <= SAT_MAX) & (val >= VAL_MIN)

    # Keep only candidate pixels connected to the border = the real background.
    lbl, n = ndimage.label(bg_candidate)
    border_labels = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border_labels.discard(0)
    background = np.isin(lbl, list(border_labels))

    # Eat the 1px antialiased checker halo hugging the character, so no grey
    # fringe remains, then build a soft alpha.
    background = ndimage.binary_dilation(background, iterations=1)
    alpha = np.where(background, 0, 255).astype("uint8")
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6))

    out = im.convert("RGBA")
    out.putalpha(alpha_img)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out.save(OUT, "PNG")

    kept = (np.asarray(out)[..., 3] > 10).mean() * 100
    print(f"wrote {os.path.relpath(OUT, ROOT)}  opaque area {kept:.1f}%")


if __name__ == "__main__":
    main()
