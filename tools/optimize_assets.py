"""
Turns the 70 MB source art in Assets/ into a lean set under public/assets/.

The source pieces are 1024-2928 px - far larger than they ever appear on a
540x960 phone canvas. Each is resized to roughly twice its on-screen size
(enough for high-DPI screens) and re-saved as an optimised PNG. Sprite sheets
are resized to an exact multiple of their column count so the frame grid stays
clean.

Run:  python tools/optimize_assets.py
"""

import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = os.path.join(os.path.dirname(__file__), "..", "Assets")
DST = os.path.join(os.path.dirname(__file__), "..", "public", "assets")
os.makedirs(DST, exist_ok=True)

# The source art was exported over a checkerboard "transparency" pattern that
# is actually opaque grey pixels. These full-scene backdrops are meant to stay
# opaque - everything else gets the checkerboard keyed out.
KEEP_OPAQUE = {"village_festival_bg.png", "HomePage.png", "HomePage1.png"}


def dechecker(im, greytol=24, minval=74):
    """
    Make the baked-in checkerboard background transparent.

    The checkerboard is two pure-grey tones. We flood the grey background in
    from the image border, which protects interior greys/whites (eyes, gloss)
    that are not connected to the edge. Enclosed grey gaps (between the legs,
    under an arm) are removed too when they show the checker's two-tone texture
    or are mid-grey rather than a bright highlight. Finally the opaque edge is
    trimmed by one pixel to shave the anti-aliased grey fringe.
    """
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.int16)
    mx = rgb.max(2)
    mn = rgb.min(2)
    # The checker is pure grey, but a baked glow tints the checker around some
    # items; allow a little saturation so that faint tinted fringe keys out
    # too. Interior greys stay safe because removal only floods from the border.
    grey = (mx - mn) <= greytol
    bg_like = grey & (mx >= minval)    # exclude the near-black outlines

    lbl, n = ndimage.label(bg_like)
    if n == 0:
        return im

    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)

    labels = np.arange(1, n + 1)
    means = ndimage.mean(mx, lbl, labels)
    stds = ndimage.standard_deviation(mx, lbl, labels)

    rem = np.zeros(n + 1, dtype=bool)
    for b in border:
        rem[b] = True
    # interior grey blobs that show the checker's two-tone texture (high
    # variance) are enclosed background gaps; a uniform interior grey is a real
    # feature (a highlight or soft shadow) and is left alone.
    for i, lab in enumerate(labels):
        if rem[lab]:
            continue
        if stds[i] > 18:
            rem[lab] = True

    remove = rem[lbl]
    alpha = arr[:, :, 3].copy()
    alpha[remove] = 0

    # trim the 1px anti-aliased fringe left where sprite meets background
    opaque = alpha > 0
    trimmed = opaque & ~ndimage.binary_erosion(opaque, iterations=1)
    alpha[trimmed] = 0

    arr[:, :, 3] = alpha
    return Image.fromarray(arr, "RGBA")


def deglow(im):
    """
    For the diyas the checker shows *through* a baked semi-transparent glow, so
    plain grey-keying leaves an orange-tinted checker disc. Here the background
    is anything that is either pure grey or has the checker's high-frequency
    two-tone texture while staying desaturated - the glow over checker. Flooding
    that in from the border stops at the diya's dark rim, leaving a clean bowl
    and flame; the glow is re-added in the engine.
    """
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.float32)
    mx = rgb.max(2)

    # The diya has a thick near-black rim all around the bowl and flame. Treat
    # only that dark rim as a wall and flood everything brighter in from the
    # border: it eats the exterior and the whole glow disc but is stopped by
    # the rim, leaving a clean bowl and flame. A fresh glow is drawn behind the
    # diya in the engine.
    wall = mx < 80
    floodable = ~wall

    lbl, n = ndimage.label(floodable)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))

    alpha = arr[:, :, 3].copy()
    alpha[remove] = 0

    # tidy the anti-aliased fringe
    opaque = alpha > 0
    trimmed = opaque & ~ndimage.binary_erosion(opaque, iterations=1)
    alpha[trimmed] = 0

    arr[:, :, 3] = alpha
    return Image.fromarray(arr, "RGBA")

# Sprite sheets: (columns, rows, target frame width in px).
SHEETS = {
    "coin_sheet.png":               (8, 1, 84),
    "diya_pickup_sheet.png":        (6, 1, 150),
    "player_diwali_delivery_sheet.png": (8, 6, 120),
}

# Everything else: longest side is capped at this many px.
MAXSIDE = {
    "village_festival_bg.png":      900,
    "village_street_foreground.png":900,
    "HomePage.png":                 1280,
    "HomePage1.png":                1280,
    "player_diwali_delivery.png":   300,
    "diya_pickup.png":              170,
    "diya_tray.png":                340,
    "diya_tray_empty.png":          340,
    "house_basic.png":              340,
    "house_small.png":              340,
    "house_large.png":              360,
    "house_delivery_glow.png":      340,
    "obstacle_cart.png":            320,
    "obstacle_pedestrian.png":      340,
    "obstacle_sleeping_dog.png":    300,
    "obstacle_clay_pots.png":       260,
    "obstacle_flower_basket.png":   260,
    "obstacle_puddle.png":          360,
    "decor_marigold_garland.png":   760,
    "decor_festival_bunting.png":   760,
    "decor_lantern.png":            240,
    "decor_rangoli.png":            320,
    "golden_diya_bonus.png":        170,
    "flower_collectible.png":       150,
    "flower_combo_effect.png":      220,
    "festival_star.png":            160,
    "extra_life_diya.png":          150,
    "coin.png":                     150,
    "hud_coin.png":                 110,
    "hud_diya_count.png":           110,
    "hud_timer.png":                110,
    "hud_star_rating.png":          420,
    "hud_top_bar.png":              820,
    "hud_delivery_progress.png":    760,
    "button_home.png":              150,
    "button_pause.png":             140,
    "button_restart.png":           150,
    "button_resume.png":            150,
    "button_settings.png":          150,
    "button_continue.png":          420,
    "button_retry.png":             420,
    "level_complete_badge.png":     540,
    "level_failed_badge.png":       540,
}
DEFAULT = 200


def save(im, name):
    out = os.path.join(DST, name)
    im.save(out, "PNG", optimize=True)
    return os.path.getsize(out)


def main():
    total_in = total_out = 0
    for name in sorted(os.listdir(SRC)):
        if not name.lower().endswith(".png"):
            continue
        path = os.path.join(SRC, name)
        total_in += os.path.getsize(path)
        im = Image.open(path).convert("RGBA")

        if name not in KEEP_OPAQUE:
            # The diya glow fades into the (dark) checker, so it needs a wider
            # grey tolerance and a lower brightness floor to key its ring out.
            if name.startswith("diya_pickup"):
                im = deglow(im)
            elif name in ("decor_festival_bunting.png", "decor_lantern.png"):
                # these two use a high-contrast checker whose dark squares fall
                # below the usual brightness floor; lower it so they key out
                im = dechecker(im, minval=20)
            else:
                im = dechecker(im)

        if name in SHEETS:
            cols, rows, fw = SHEETS[name]
            new_w = cols * fw
            new_h = round(im.height * new_w / im.width)
            # keep rows dividing evenly
            new_h = round(new_h / rows) * rows
            im = im.resize((new_w, new_h), Image.LANCZOS)
        else:
            cap = MAXSIDE.get(name, DEFAULT)
            longest = max(im.width, im.height)
            if longest > cap:
                s = cap / longest
                im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)

        size = save(im, name)
        total_out += size
        print(f"{name:34s} -> {im.width:4d}x{im.height:<4d}  {size/1024:6.1f} KB")

    print("-" * 60)
    print(f"total: {total_in/1024/1024:.1f} MB  ->  {total_out/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
