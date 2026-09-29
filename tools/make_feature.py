"""
Generates Google Play feature graphics (1024x500) from the game art.
Writes store/feature-1.png, feature-2.png, feature-3.png.
Run:  python tools/make_feature.py
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
PUB = os.path.join(ROOT, "public", "assets")
ASSETS = os.path.join(ROOT, "Assets")
OUT = os.path.join(ROOT, "store")
os.makedirs(OUT, exist_ok=True)
W, H = 1024, 500


def load(path, folder=PUB):
    return Image.open(os.path.join(folder, path)).convert("RGBA")


def font(sz):
    for p in ["C:/Windows/Fonts/trebucbd.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            pass
    return ImageFont.load_default()


def cover(img, w, h):
    s = max(w / img.width, h / img.height)
    im = img.resize((int(img.width * s), int(img.height * s)), Image.LANCZOS)
    x = (im.width - w) // 2
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def paste_h(base, img, cx, cy, h, alpha=255):
    s = h / img.height
    im = img.resize((int(img.width * s), h), Image.LANCZOS)
    if alpha < 255:
        a = im.split()[3].point(lambda p: int(p * alpha / 255))
        im.putalpha(a)
    base.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
    return im.width, im.height


def title(base, x, y, text, sz, fill, stroke=(90, 36, 0), sw=None, anchor="mm", glow=None):
    d = ImageDraw.Draw(base)
    f = font(sz)
    if sw is None:
        sw = max(3, sz // 10)
    if glow:
        g = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(g).text((x, y), text, font=f, fill=glow, anchor=anchor)
        base.alpha_composite(g.filter(ImageFilter.GaussianBlur(14)))
    d.text((x, y), text, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke, anchor=anchor)


def radial(w, h, c0, c1):
    yy, xx = np.ogrid[0:h, 0:w]
    r = np.sqrt((xx - w / 2) ** 2 + (yy - h * 0.42) ** 2) / (w * 0.62)
    r = np.clip(r, 0, 1)[..., None]
    img = np.array(c0) * (1 - r) + np.array(c1) * r
    a = np.full((h, w, 1), 255)
    return Image.fromarray(np.concatenate([img, a], 2).astype("uint8"), "RGBA")


def bunting(base):
    try:
        b = load("decor_festival_bunting.png")
        s = W / b.width
        b = b.resize((W, int(b.height * s)), Image.LANCZOS)
        base.alpha_composite(b, (0, -6))
    except Exception:
        pass


def scatter_diyas(base, spots):
    for (x, y, h) in spots:
        try:
            paste_h(base, load("golden_diya_bonus.png"), x, y, h)
        except Exception:
            pass


def title_block(base, cx, top):
    title(base, cx, top, "DIWALI", 96, (255, 209, 78), glow=(255, 150, 40, 160))
    title(base, cx, top + 88, "DELIVERY DASH", 62, (255, 255, 255), stroke=(120, 40, 0))
    # tagline banner
    d = ImageDraw.Draw(base)
    f = font(28)
    tw = d.textlength("Light Up Every Home!", font=f)
    bx0, bx1 = cx - tw / 2 - 22, cx + tw / 2 + 22
    by = top + 150
    d.rounded_rectangle([bx0, by - 24, bx1, by + 24], 22, fill=(233, 122, 30, 255), outline=(120, 40, 0, 255), width=4)
    d.text((cx, by), "Light Up Every Home!", font=f, fill=(255, 250, 230), anchor="mm")


# ---- Feature 1: hero (village + boy + title on right) -------------------
def feature1():
    base = cover(load("village_festival_bg.png"), W, H)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rectangle([0, 0, W, H], fill=(26, 15, 46, 70))
    base.alpha_composite(ov)
    bunting(base)
    # right-side dark panel for legibility
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(panel).rectangle([360, 0, W, H], fill=(30, 12, 40, 90))
    base.alpha_composite(panel.filter(ImageFilter.GaussianBlur(40)))
    try:
        paste_h(base, load("decor_lantern.png"), 60, 120, 150, 235)
        paste_h(base, load("decor_lantern.png"), W - 60, 120, 150, 235)
    except Exception:
        pass
    # boy
    paste_h(base, load("player_diwali_delivery.png"), 210, 300, 430)
    scatter_diyas(base, [(150, 430, 64), (330, 450, 54)])
    title_block(base, 690, 150)
    base.convert("RGB").save(os.path.join(OUT, "feature-1.png"), "PNG")


# ---- Feature 2: modes (gradient + title + mode pills) -------------------
def feature2():
    base = radial(W, H, (255, 205, 90), (120, 24, 14))
    vb = cover(load("village_festival_bg.png"), W, H)
    vb.putalpha(vb.split()[3].point(lambda p: 70))
    base.alpha_composite(vb)
    bunting(base)
    title(base, W / 2, 110, "DIWALI DELIVERY DASH", 66, (255, 239, 140), glow=(255, 150, 40, 170))
    # mode pills
    d = ImageDraw.Draw(base)

    def pill(cx, cy, label, fill):
        f = font(34)
        tw = d.textlength(label, font=f)
        w = tw + 70
        d.rounded_rectangle([cx - w / 2, cy - 40, cx + w / 2, cy + 40], 40, fill=fill, outline=(120, 40, 0), width=5)
        d.text((cx, cy), label, font=f, fill=(255, 255, 255), anchor="mm", stroke_width=2, stroke_fill=(90, 30, 0))
    pill(W / 2 - 175, 250, "STORY MODE", (233, 140, 24))
    pill(W / 2 + 175, 250, "ENDLESS MODE", (150, 60, 190))
    paste_h(base, load("player_diwali_delivery.png"), 120, 360, 300)
    scatter_diyas(base, [(W - 120, 300, 70), (W - 210, 400, 54), (W - 60, 400, 50)])
    d.text((W / 2, 430), "Deliver diyas • Light up every home!", font=font(28), fill=(255, 244, 214), anchor="mm", stroke_width=3, stroke_fill=(90, 30, 0))
    base.convert("RGB").save(os.path.join(OUT, "feature-2.png"), "PNG")


# ---- Feature 3: girl art panel + title ---------------------------------
def feature3():
    base = radial(W, H, (255, 200, 96), (110, 22, 12))
    bunting(base)
    # girl illustration as a left panel (square art), soft-edged on the right
    girl = Image.open(os.path.join(ASSETS, "icon.png")).convert("RGB")
    side = min(girl.size)
    top = int((girl.height - side) * 0.45)
    girl = girl.crop((0, top, girl.width, top + side)).resize((500, 500), Image.LANCZOS)
    mask = Image.new("L", (500, 500), 255)
    md = ImageDraw.Draw(mask)
    for i in range(110):
        md.line([(390 + i, 0), (390 + i, 500)], fill=int(255 * (1 - i / 110)))
    base.paste(girl, (0, 0), mask)
    title_block(base, 700, 150)
    base.convert("RGB").save(os.path.join(OUT, "feature-3.png"), "PNG")


if __name__ == "__main__":
    feature1()
    feature2()
    feature3()
    print("wrote store/feature-1.png, feature-2.png, feature-3.png")
