/**
 * Small reusable UI pieces shared by the menu scenes: the festive backdrop,
 * pill buttons, panels and a row of stars. Keeping them here means every
 * screen looks like the same game and a style tweak lands in one place.
 */

import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX } from "./layout";
import { Sfx } from "../managers/AudioManager";

export const FONT = "Trebuchet MS, Verdana, sans-serif";

// A full-screen festive background: night gradient, the village image faded
// behind, hanging bunting and a warm glow. Returns nothing - it just draws.
export function festiveBackground(scene, { showVillage = true } = {}) {
    const g = scene.add.graphics();
    g.fillGradientStyle(0x2a1550, 0x2a1550, 0x140a2a, 0x140a2a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (showVillage && scene.textures.exists("bg_village")) {
        const img = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg_village");
        const scale = Math.max(GAME_WIDTH / img.width, GAME_HEIGHT / img.height);
        img.setScale(scale).setAlpha(0.4).setTint(0xffe6c0);
    }

    // soft warm vignette glow near the top
    const glow = scene.add.graphics();
    glow.fillStyle(COLORS.saffron, 0.12);
    glow.fillEllipse(GAME_WIDTH / 2, 90, 620, 260);

    if (scene.textures.exists("bunting")) {
        const b = scene.add.image(GAME_WIDTH / 2, 2, "bunting");
        b.setScale(GAME_WIDTH / b.width * 1.02).setOrigin(0.5, 0);
    }
    return g;
}

// A rounded pill button with a label. onClick fires on tap.
export function pillButton(scene, x, y, label, onClick, opts = {}) {
    const w = opts.width || 300;
    const h = opts.height || 74;
    const fill = opts.fill ?? COLORS.saffron;
    const fill2 = opts.fill2 ?? COLORS.marigold;

    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const draw = (pressed) => {
        g.clear();
        // drop shadow
        g.fillStyle(0x000000, 0.28);
        g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, h / 2);
        // body
        g.fillStyle(pressed ? fill2 : fill, 1);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        // top gloss
        g.fillStyle(0xffffff, 0.20);
        g.fillRoundedRect(-w / 2 + 8, -h / 2 + 7, w - 16, h * 0.34, h * 0.22);
        // thick outline (the art's rounded-outline look)
        g.lineStyle(5, 0x7a3a00, 1);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    };
    draw(false);

    const txt = scene.add.text(0, 0, label, {
        fontFamily: FONT, fontSize: (opts.fontSize || 30) + "px",
        color: opts.color || HEX.ink, fontStyle: "bold"
    }).setOrigin(0.5);

    c.add([g, txt]);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

    c.on("pointerdown", () => { draw(true); c.setScale(0.96); });
    const release = () => { draw(false); c.setScale(1); };
    c.on("pointerup", () => {
        release();
        Sfx.unlock(); Sfx.play("tap");
        onClick && onClick();
    });
    c.on("pointerout", release);
    c.on("pointerupoutside", release);
    return c;
}

// A round icon button that uses one of the loaded button textures.
export function iconButton(scene, x, y, textureKey, onClick, size = 56) {
    const img = scene.add.image(x, y, textureKey).setOrigin(0.5);
    img.setDisplaySize(size, size);
    img.setInteractive({ useHandCursor: true });
    img.on("pointerdown", () => img.setScale(img.scaleX * 0.9));
    img.on("pointerup", () => {
        img.setDisplaySize(size, size);
        Sfx.unlock(); Sfx.play("tap");
        onClick && onClick();
    });
    img.on("pointerout", () => img.setDisplaySize(size, size));
    return img;
}

// Draw a row of up to `max` stars, `earned` of them filled. Returns the
// container so callers can animate it.
export function starRow(scene, x, y, earned, max = 3, scale = 1) {
    const c = scene.add.container(x, y);
    const gap = 46 * scale;
    for (let i = 0; i < max; i++) {
        const filled = i < earned;
        const s = drawStar(scene, (i - (max - 1) / 2) * gap, 0, 18 * scale,
            filled ? COLORS.gold : 0x000000,
            filled ? 1 : 0.28);
        c.add(s);
    }
    return c;
}

// A single five-point star as a graphics object.
export function drawStar(scene, x, y, r, color, alpha = 1) {
    const g = scene.add.graphics({ x, y });
    const spikes = 5, inner = r * 0.44;
    g.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const rad = (i % 2 === 0) ? r : inner;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle(color, alpha);
    g.fillPath();
    g.lineStyle(3, 0x7a3a00, alpha);
    g.strokePath();
    return g;
}

// Centered heading text with a warm outline.
export function heading(scene, x, y, text, size = 44) {
    return scene.add.text(x, y, text, {
        fontFamily: FONT, fontSize: size + "px", color: HEX.gold,
        fontStyle: "bold", stroke: "#5a2400", strokeThickness: 7,
        align: "center"
    }).setOrigin(0.5);
}

// A soft rounded panel to group content.
export function panel(scene, x, y, w, h, radius = 28) {
    const g = scene.add.graphics({ x, y });
    g.fillStyle(0x000000, 0.30);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, radius);
    g.fillStyle(0x3a1e5c, 0.92);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    g.lineStyle(4, COLORS.gold, 0.7);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    return g;
}
