import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX } from "../ui/layout";
import { festiveBackground, pillButton, drawStar, FONT } from "../ui/widgets";
import { levelsForWorld } from "../data/levels";
import { Save } from "../managers/SaveManager";
import { Sfx } from "../managers/AudioManager";

/**
 * The results screen for a finished level (landscape): a drawn medallion, the
 * animated three-star reveal, a stats panel, and the buttons to move on. Stars
 * and coins are saved by GameScene; this screen presents them and routes on.
 */
export default class LevelCompleteScene extends Phaser.Scene {
    constructor() {
        super("LevelComplete");
    }

    init(data) { this.d = data; }

    create() {
        const d = this.d;
        festiveBackground(this, { showVillage: false });

        if (d.mode === "endless") { this.buildEndless(d); this.cameras.main.fadeIn(280, 10, 6, 24); return; }

        this.buildMedallion(d.won, GAME_WIDTH / 2, 92);

        this.add.text(GAME_WIDTH / 2, 172, d.won ? "Level Complete!" : (d.failTitle || "Out of Time!"), {
            fontFamily: FONT, fontSize: "40px", color: d.won ? HEX.gold : HEX.red, fontStyle: "bold",
            stroke: "#5a2400", strokeThickness: 6
        }).setOrigin(0.5);

        if (d.won) this.revealStars(d.stars, 232);
        else this.add.text(GAME_WIDTH / 2, 238, `Delivered ${d.delivered} / ${d.required}`, {
            fontFamily: FONT, fontSize: "24px", color: HEX.cream
        }).setOrigin(0.5);

        this.statsPanel(d, GAME_WIDTH / 2, 374);
        this.buildButtons(d);

        this.cameras.main.fadeIn(280, 10, 6, 24);
    }

    // Endless "Run Over" screen: score, best, and a stat breakdown.
    buildEndless(d) {
        const cx = GAME_WIDTH / 2;
        this.buildMedallion(true, cx, 96);

        this.add.text(cx, 180, "Run Over!", {
            fontFamily: FONT, fontSize: "36px", color: HEX.saffron, fontStyle: "bold", stroke: "#5a2400", strokeThickness: 6
        }).setOrigin(0.5);

        // score (animated count-up)
        this.add.text(cx, 224, "SCORE", { fontFamily: FONT, fontSize: "19px", color: HEX.cream }).setOrigin(0.5).setAlpha(0.9);
        const scoreVal = this.add.text(cx, 260, "0", {
            fontFamily: FONT, fontSize: "52px", color: HEX.gold, fontStyle: "bold", stroke: "#5a2400", strokeThickness: 7
        }).setOrigin(0.5);
        const target = d.score || 0;
        this.tweens.addCounter({
            from: 0, to: target, duration: 700, ease: "Cubic.out",
            onUpdate: (t) => scoreVal.setText(Math.floor(t.getValue()).toLocaleString())
        });

        // best / new best
        if (d.newBest) {
            const nb = this.add.text(cx, 304, "🏆 NEW BEST!", { fontFamily: FONT, fontSize: "24px", color: HEX.gold, fontStyle: "bold" }).setOrigin(0.5);
            this.tweens.add({ targets: nb, scale: 1.12, duration: 500, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        } else {
            this.add.text(cx, 304, `Best: ${(d.best || 0).toLocaleString()}`, { fontFamily: FONT, fontSize: "21px", color: HEX.cream }).setOrigin(0.5).setAlpha(0.9);
        }

        // stat breakdown (4 rows)
        const w = 460, h = 138, y = 398;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.28); g.fillRoundedRect(cx - w / 2 + 3, y - h / 2 + 5, w, h, 22);
        g.fillStyle(0x3a1e5c, 0.92); g.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 22);
        g.lineStyle(3, COLORS.gold, 0.6); g.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 22);
        const row = (dy, label, val) => {
            this.add.text(cx - w / 2 + 28, y + dy, label, { fontFamily: FONT, fontSize: "21px", color: HEX.cream }).setOrigin(0, 0.5);
            this.add.text(cx + w / 2 - 28, y + dy, val, { fontFamily: FONT, fontSize: "21px", color: HEX.gold, fontStyle: "bold" }).setOrigin(1, 0.5);
        };
        row(-48, "🏠 Delivered", `${d.delivered}`);
        row(-16, "🔥 Best combo", `x${d.maxCombo}`);
        row(16, "🪙 Coins earned", `+${d.coins}`);
        row(48, "🚩 Distance", `${(d.distanceKm || 0).toFixed(2)} km`);

        // buttons (kept within the safe bottom margin - see note in buildButtons)
        pillButton(this, cx, 498, "↻  RUN AGAIN", () => this.go("Game", { worldId: d.worldId, mode: "endless" }),
            { width: 280, height: 66, fontSize: 26, fill: COLORS.magenta, fill2: 0xe85a8a, color: HEX.white });
        this.iconLabel(cx, 566, "btn_home", 52, "Home", () => this.go("Home"));
    }

    buildMedallion(won, cx, cy) {
        const c = this.add.container(cx, cy).setDepth(5).setScale(0);
        if (won) {
            const glow = this.add.image(0, 0, "diya_soft").setScale(1.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
            c.add(glow);
            this.tweens.add({ targets: glow, scale: 1.65, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        }
        const g = this.add.graphics();
        const r = 56;
        g.fillStyle(won ? COLORS.gold : 0x6a5a80, 1);
        for (let i = 0; i < 16; i++) { const a = (Math.PI * 2 / 16) * i; g.fillCircle(Math.cos(a) * r, Math.sin(a) * r, 11); }
        g.fillStyle(won ? COLORS.saffron : 0x4a4270, 1); g.fillCircle(0, 0, r);
        g.lineStyle(5, won ? 0x7a3a00 : 0x2b2140, 1); g.strokeCircle(0, 0, r);
        g.fillStyle(won ? 0xffe6b0 : 0x5a5280, 1); g.fillCircle(0, 0, r - 11);
        c.add(g);
        if (won) c.add(this.add.image(0, 6, "diya").setScale(0.64));
        else c.add(this.add.text(0, 0, "⌛", { fontSize: "52px" }).setOrigin(0.5));
        this.tweens.add({ targets: c, scale: 1, duration: 460, ease: "Back.out" });
        return c;
    }

    revealStars(stars, y) {
        const gap = 96, cx = GAME_WIDTH / 2;
        for (let i = 0; i < 3; i++) {
            const filled = i < stars;
            const container = this.add.container(cx + (i - 1) * gap, y);
            container.add(drawStar(this, 0, 0, 38, filled ? COLORS.gold : 0x2a1550, filled ? 1 : 0.6));
            container.setScale(0);
            this.tweens.add({
                targets: container, scale: 1, duration: 360, ease: "Back.out", delay: 350 + i * 260,
                onComplete: () => { if (filled) { Sfx.play("star"); this.burst(container.x, y); } }
            });
        }
        const msgs = ["Keep delivering!", "Great speed!", "Perfect! All bonuses!"];
        this.time.delayedCall(350 + 3 * 260 + 200, () => {
            this.add.text(cx, y + 62, stars >= 1 ? msgs[stars - 1] : "", {
                fontFamily: FONT, fontSize: "20px", color: HEX.cream
            }).setOrigin(0.5);
        });
    }

    burst(x, y) {
        for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 30;
            const p = this.add.circle(x, y, 3, COLORS.gold).setDepth(20);
            this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, duration: 500, onComplete: () => p.destroy() });
        }
    }

    statsPanel(d, x, y) {
        const w = 460, h = 128;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.28); g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 5, w, h, 22);
        g.fillStyle(0x3a1e5c, 0.92); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
        g.lineStyle(3, COLORS.gold, 0.6); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 22);

        const row = (dy, label, val) => {
            this.add.text(x - w / 2 + 28, y + dy, label, { fontFamily: FONT, fontSize: "22px", color: HEX.cream }).setOrigin(0, 0.5);
            this.add.text(x + w / 2 - 28, y + dy, val, { fontFamily: FONT, fontSize: "22px", color: HEX.gold, fontStyle: "bold" }).setOrigin(1, 0.5);
        };
        row(-38, "🏠 Delivered", `${d.delivered}/${d.required}`);
        row(0, "🪙 Coins earned", `+${d.coins}`);
        row(38, "🌸 Bonus items", d.spawnedBonus > 0 ? `${d.collectedBonus}/${d.spawnedBonus}` : "—");
    }

    buildButtons(d) {
        const levels = levelsForWorld(d.worldId);
        const hasNext = d.levelIndex + 1 < levels.length;
        const cx = GAME_WIDTH / 2;

        // Buttons sit within a safe bottom margin: with viewport-fit=cover the
        // phone's gesture/nav bar overlays the very bottom of the canvas, so
        // anything below ~575 can swallow taps.
        if (d.won && hasNext) {
            pillButton(this, cx, 478, "NEXT  ▶", () => this.go("Game", { worldId: d.worldId, levelIndex: d.levelIndex + 1 }),
                { width: 250, height: 74, fontSize: 30 });
        } else if (d.won && !hasNext) {
            this.add.text(cx, 470, "🎉 World Complete! 🎉", { fontFamily: FONT, fontSize: "28px", color: HEX.gold, fontStyle: "bold" }).setOrigin(0.5);
            this.add.text(cx, 504, "More worlds coming soon", { fontFamily: FONT, fontSize: "18px", color: HEX.cream }).setOrigin(0.5).setAlpha(0.85);
        } else {
            pillButton(this, cx, 478, "↻  RETRY", () => this.go("Game", { worldId: d.worldId, levelIndex: d.levelIndex }),
                { width: 250, height: 74, fontSize: 30 });
        }

        const y = 560;
        if (d.won) {
            this.iconLabel(cx - 150, y, "btn_restart", 60, "Retry", () => this.go("Game", { worldId: d.worldId, levelIndex: d.levelIndex }));
            this.iconLabel(cx + 150, y, "btn_home", 58, "Levels", () => this.go("LevelSelect", { worldId: d.worldId }));
        } else {
            this.iconLabel(cx, y, "btn_home", 58, "Levels", () => this.go("LevelSelect", { worldId: d.worldId }));
        }
    }

    iconLabel(x, y, key, size, label, fn) {
        const img = this.add.image(x, y, key).setDisplaySize(size, size).setInteractive({ useHandCursor: true });
        img.on("pointerdown", () => img.setDisplaySize(size * 0.92, size * 0.92));
        img.on("pointerup", () => { img.setDisplaySize(size, size); Sfx.play("tap"); fn(); });
        img.on("pointerout", () => img.setDisplaySize(size, size));
        this.add.text(x, y + size / 2 + 14, label, { fontFamily: FONT, fontSize: "17px", color: HEX.cream }).setOrigin(0.5);
        return img;
    }

    go(scene, data) {
        this.cameras.main.fadeOut(200, 10, 6, 24);
        this.time.delayedCall(210, () => this.scene.start(scene, data));
    }
}
