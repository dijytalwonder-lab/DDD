import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX } from "../ui/layout";
import { festiveBackground, heading, FONT } from "../ui/widgets";
import { WORLDS } from "../data/worlds";
import { VILLAGE_LEVELS } from "../data/levels";
import { Save } from "../managers/SaveManager";
import { Sfx } from "../managers/AudioManager";

/**
 * The journey of ten worlds, as a 5x2 grid of tiles across the wide screen.
 * Village Festival is playable; the rest are locked "coming soon".
 */
export default class WorldSelectScene extends Phaser.Scene {
    constructor() {
        super("WorldSelect");
    }

    create() {
        festiveBackground(this, { showVillage: false });
        heading(this, GAME_WIDTH / 2, 34, "Choose a World", 34);

        this.add.text(28, 34, "‹ Home", {
            fontFamily: FONT, fontSize: "24px", color: HEX.cream, fontStyle: "bold"
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
            .on("pointerup", () => { Sfx.play("tap"); this.scene.start("Home"); });

        const cols = 5, rows = 2;
        const tw = 172, th = 196, gx = 12, gy = 14;
        const startX = (GAME_WIDTH - (cols * tw + (cols - 1) * gx)) / 2 + tw / 2;
        const startY = 158;

        WORLDS.forEach((world, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            this.worldTile(world, i, startX + col * (tw + gx), startY + row * (th + gy), tw, th);
        });

        this.cameras.main.fadeIn(250, 10, 6, 24);
    }

    worldTile(world, index, x, y, w, h) {
        const c = this.add.container(x, y);
        const ready = world.ready;
        const levelCount = VILLAGE_LEVELS.length;
        const stars = ready ? Save.worldStars(world.id, levelCount) : 0;

        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.28); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 20);
        g.fillStyle(ready ? 0x4a2a12 : 0x2b2140, ready ? 0.96 : 0.85); g.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
        g.lineStyle(4, ready ? COLORS.gold : 0x6a5a90, ready ? 0.9 : 0.6); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
        c.add(g);

        const badge = this.add.circle(0, -h / 2 + 52, 40, ready ? COLORS.saffron : 0x4a4270).setStrokeStyle(4, ready ? 0x7a3a00 : 0x6a5a90);
        c.add(badge);
        c.add(this.add.text(0, -h / 2 + 52, world.icon, { fontSize: "38px" }).setOrigin(0.5));
        c.add(this.add.text(-w / 2 + 16, -h / 2 + 18, "" + (index + 1), {
            fontFamily: FONT, fontSize: "18px", color: HEX.white, fontStyle: "bold"
        }).setOrigin(0.5));

        c.add(this.add.text(0, 6, world.name, {
            fontFamily: FONT, fontSize: "20px", color: ready ? HEX.gold : "#c7bce8", fontStyle: "bold",
            align: "center", wordWrap: { width: w - 18 }
        }).setOrigin(0.5));

        if (ready) {
            c.add(this.add.text(0, h / 2 - 26, `⭐ ${stars}/${levelCount * 3}`, {
                fontFamily: FONT, fontSize: "18px", color: HEX.gold, fontStyle: "bold"
            }).setOrigin(0.5));
        } else {
            c.add(this.add.text(0, h / 2 - 44, "🔒", { fontSize: "26px" }).setOrigin(0.5));
            c.add(this.add.text(0, h / 2 - 18, "Coming soon", { fontFamily: FONT, fontSize: "14px", color: "#c7bce8" }).setOrigin(0.5));
        }

        const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: ready });
        c.add(hit);
        hit.on("pointerdown", () => { if (ready) c.setScale(0.96); });
        hit.on("pointerup", () => {
            c.setScale(1);
            if (!ready) { Sfx.play("bump"); this.tweens.add({ targets: c, x: x + 6, duration: 55, yoyo: true, repeat: 2 }); return; }
            Sfx.play("tap");
            this.scene.start("LevelSelect", { worldId: world.id });
        });
        hit.on("pointerout", () => c.setScale(1));
        return c;
    }
}
