import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX } from "../ui/layout";
import { festiveBackground, heading, starRow, FONT } from "../ui/widgets";
import { worldById } from "../data/worlds";
import { levelsForWorld } from "../data/levels";
import { Save } from "../managers/SaveManager";
import { Sfx } from "../managers/AudioManager";

/**
 * The ten levels of a world, as a 5x2 grid across the wide screen. Each tile
 * shows its number, name and stars; a locked level shows a padlock.
 */
export default class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super("LevelSelect");
    }

    init(data) {
        this.worldId = data.worldId || "village";
    }

    create() {
        festiveBackground(this, { showVillage: false });
        const world = worldById(this.worldId);
        heading(this, GAME_WIDTH / 2, 34, world.name, 32);

        this.add.text(28, 34, "‹ Worlds", {
            fontFamily: FONT, fontSize: "24px", color: HEX.cream, fontStyle: "bold"
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
            .on("pointerup", () => { Sfx.play("tap"); this.scene.start("WorldSelect"); });

        const levels = levelsForWorld(this.worldId);
        const cols = 5, tw = 172, th = 186, gx = 12, gy = 16;
        const startX = (GAME_WIDTH - (cols * tw + (cols - 1) * gx)) / 2 + tw / 2;
        const startY = 162;

        levels.forEach((lv, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            this.levelTile(lv, i, startX + col * (tw + gx), startY + row * (th + gy), tw, th);
        });

        this.cameras.main.fadeIn(250, 10, 6, 24);
    }

    levelTile(lv, index, x, y, w, h) {
        const levelNo = index + 1;
        const unlocked = Save.isLevelUnlocked(this.worldId, levelNo);
        const stars = Save.starsFor(this.worldId, levelNo);
        const c = this.add.container(x, y);

        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.28); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 20);
        g.fillStyle(unlocked ? 0x5a2f14 : 0x2b2140, unlocked ? 0.96 : 0.8); g.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
        g.lineStyle(4, unlocked ? COLORS.gold : 0x6a5a90, unlocked ? 0.9 : 0.55); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
        c.add(g);

        const badge = this.add.circle(0, -h / 2 + 44, 30, unlocked ? COLORS.saffron : 0x4a4270).setStrokeStyle(4, unlocked ? 0x7a3a00 : 0x6a5a90);
        c.add(badge);
        c.add(this.add.text(0, -h / 2 + 44, "" + levelNo, {
            fontFamily: FONT, fontSize: "28px", color: HEX.white, fontStyle: "bold"
        }).setOrigin(0.5));

        c.add(this.add.text(0, 8, lv.name, {
            fontFamily: FONT, fontSize: "19px", color: unlocked ? HEX.gold : "#c7bce8",
            fontStyle: "bold", align: "center", wordWrap: { width: w - 18 }
        }).setOrigin(0.5));

        if (unlocked) c.add(starRow(this, 0, h / 2 - 28, stars, 3, 0.85));
        else c.add(this.add.text(0, h / 2 - 28, "🔒", { fontSize: "28px" }).setOrigin(0.5));

        const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: unlocked });
        c.add(hit);
        hit.on("pointerdown", () => { if (unlocked) c.setScale(0.96); });
        hit.on("pointerup", () => {
            c.setScale(1);
            if (!unlocked) { Sfx.play("bump"); this.tweens.add({ targets: c, x: x + 6, duration: 55, yoyo: true, repeat: 2 }); return; }
            Sfx.play("tap");
            this.cameras.main.fadeOut(200, 10, 6, 24);
            this.time.delayedCall(210, () => this.scene.start("Game", { worldId: this.worldId, levelIndex: index }));
        });
        hit.on("pointerout", () => c.setScale(1));
        return c;
    }
}
