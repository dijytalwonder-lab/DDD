import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX } from "../ui/layout";
import { FONT, pillButton } from "../ui/widgets";
import { Save, MAX_HEARTS } from "../managers/SaveManager";
import { Sfx } from "../managers/AudioManager";

/**
 * The title screen. It IS the supplied HomePage artwork, shown full-screen;
 * this scene lays invisible hit zones over the buttons drawn into that image
 * and wires each to a real action, and paints the live coin total and heart
 * count over the baked-in numbers so they stay in sync with the save.
 *
 * Positions are given as fractions of the image (which fills the 960x640
 * canvas exactly, being the same 3:2 aspect), so they track the art at any
 * screen size.
 */
export default class HomeScene extends Phaser.Scene {
    constructor() {
        super("Home");
    }

    create() {
        this.add.image(0, 0, "home_bg").setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

        this.buildDynamicCounters();
        this.buildHotspots();

        // keep the heart timer ticking while the player lingers here
        this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshHearts() });

        this.cameras.main.fadeIn(300, 10, 6, 24);
        this.input.once("pointerdown", () => Sfx.unlock());
    }

    // fraction of the image -> canvas pixels
    nx(f) { return f * GAME_WIDTH; }
    ny(f) { return f * GAME_HEIGHT; }

    // --- live coin + heart counters --------------------------------------

    buildDynamicCounters() {
        // The coin and heart bars in the art are empty, so the live values are
        // simply drawn into them (no covering needed). Positions match the bar
        // centres measured from the art (coin bar ~0.19, heart bar ~0.83, both
        // vertically centred at 0.069).
        const cy = this.ny(0.069);

        // Coin total, centred in the coin bar.
        this.coinText = this.add.text(this.nx(0.190), cy, "" + Save.getCoins(), {
            fontFamily: FONT, fontSize: "28px", color: HEX.gold, fontStyle: "bold"
        }).setOrigin(0.5);

        // Heart count + status ("Full" or the regen countdown), in the heart bar.
        this.heartText = this.add.text(this.nx(0.800), cy, "" + Save.getHearts(), {
            fontFamily: FONT, fontSize: "28px", color: HEX.white, fontStyle: "bold"
        }).setOrigin(0.5);
        this.heartStatus = this.add.text(this.nx(0.862), cy, "Full", {
            fontFamily: FONT, fontSize: "23px", color: HEX.white, fontStyle: "bold"
        }).setOrigin(0.5);

        this.refreshHearts();
    }

    refreshHearts() {
        const h = Save.getHearts();
        this.heartText.setText("" + h);
        if (h >= MAX_HEARTS) {
            this.heartStatus.setText("Full");
        } else {
            const ms = Save.heartRegenRemaining();
            const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
            this.heartStatus.setText(`${m}:${s.toString().padStart(2, "0")}`);
        }
        this.coinText.setText("" + Save.getCoins());
    }

    // --- clickable regions over the artwork ------------------------------

    buildHotspots() {
        // [centreFracX, centreFracY, wFrac, hFrac, handler]
        const zones = [
            [0.400, 0.600, 0.19, 0.30, () => this.openLevels()],      // STORY MODE
            [0.655, 0.600, 0.20, 0.30, () => this.startEndless()],    // ENDLESS MODE
            [0.955, 0.065, 0.06, 0.10, () => this.openSettings()],    // Settings gear
            [0.038, 0.065, 0.06, 0.11, () => this.soon("Profile")],   // player avatar
            [0.265, 0.068, 0.05, 0.08, () => this.soon("Shop")],      // coin +
            [0.065, 0.830, 0.11, 0.17, () => this.soon("Shop")],      // Shop
            [0.190, 0.830, 0.12, 0.17, () => this.soon("Rewards")],   // Rewards
            [0.800, 0.830, 0.11, 0.17, () => this.openLevels()],      // Levels
            [0.930, 0.830, 0.12, 0.17, () => this.soon("Collection")] // Collection
        ];
        for (const [fx, fy, fw, fh, fn] of zones) {
            this.hotspot(this.nx(fx), this.ny(fy), this.nx(fw), this.ny(fh), fn);
        }
    }

    hotspot(x, y, w, h, onTap) {
        const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
        // a soft highlight so a tap gives feedback over the flat image
        const hi = this.add.graphics().setAlpha(0);
        hi.fillStyle(0xffffff, 0.28);
        hi.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
        zone.on("pointerdown", () => { hi.setAlpha(1); });
        const clear = () => this.tweens.add({ targets: hi, alpha: 0, duration: 160 });
        zone.on("pointerup", () => { clear(); Sfx.unlock(); Sfx.play("tap"); onTap(); });
        zone.on("pointerout", clear);
        zone.on("pointerupoutside", clear);
        return zone;
    }

    // --- actions ----------------------------------------------------------

    openLevels() {
        this.go("LevelSelect", { worldId: "village" });
    }

    startEndless() {
        this.go("Game", { worldId: "village", mode: "endless" });
    }

    go(scene, data) {
        this.cameras.main.fadeOut(220, 10, 6, 24);
        this.time.delayedCall(230, () => this.scene.start(scene, data));
    }

    soon(name) {
        this.toast(`${name} — coming soon!`);
    }

    toast(msg) {
        if (this.toastObj) this.toastObj.destroy();
        const y = GAME_HEIGHT - 60;
        const c = this.add.container(GAME_WIDTH / 2, y).setDepth(200);
        const w = Math.max(240, msg.length * 13 + 60);
        const g = this.add.graphics();
        g.fillStyle(0x2a1550, 0.95); g.fillRoundedRect(-w / 2, -28, w, 56, 20);
        g.lineStyle(3, COLORS.gold, 0.8); g.strokeRoundedRect(-w / 2, -28, w, 56, 20);
        const t = this.add.text(0, 0, msg, { fontFamily: FONT, fontSize: "22px", color: HEX.cream, fontStyle: "bold" }).setOrigin(0.5);
        c.add([g, t]);
        c.setScale(0.8); c.alpha = 0;
        this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: "Back.out" });
        this.tweens.add({ targets: c, alpha: 0, delay: 1400, duration: 300, onComplete: () => c.destroy() });
        this.toastObj = c;
    }

    // --- settings ---------------------------------------------------------

    openSettings() {
        const c = this.add.container(0, 0).setDepth(300);
        const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive();
        c.add(dim);
        const px = GAME_WIDTH / 2, py = GAME_HEIGHT / 2;
        const g = this.add.graphics();
        g.fillStyle(0x3a1e5c, 0.98); g.fillRoundedRect(px - 210, py - 150, 420, 300, 26);
        g.lineStyle(4, COLORS.gold, 0.8); g.strokeRoundedRect(px - 210, py - 150, 420, 300, 26);
        c.add(g);
        c.add(this.add.text(px, py - 108, "Settings", {
            fontFamily: FONT, fontSize: "34px", color: HEX.gold, fontStyle: "bold", stroke: "#5a2400", strokeThickness: 5
        }).setOrigin(0.5));

        const soundRow = (dy, label, key) => {
            c.add(this.add.text(px - 150, py + dy, label, { fontFamily: FONT, fontSize: "24px", color: HEX.cream }).setOrigin(0, 0.5));
            const val = () => Save.getSetting(key) !== false;
            const t = this.add.text(px + 150, py + dy, val() ? "ON" : "OFF", {
                fontFamily: FONT, fontSize: "24px", color: val() ? HEX.gold : "#a090c0", fontStyle: "bold"
            }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            t.on("pointerup", () => {
                Save.setSetting(key, !val());
                t.setText(val() ? "ON" : "OFF").setColor(val() ? HEX.gold : "#a090c0");
                Sfx.play("tap");
            });
            c.add(t);
        };
        soundRow(-40, "Sound", "sound");
        soundRow(10, "Music", "music");

        const close = this.add.text(px, py + 100, "Close", {
            fontFamily: FONT, fontSize: "26px", color: HEX.ink, fontStyle: "bold",
            backgroundColor: "#ffcf4d", padding: { x: 28, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on("pointerup", () => { Sfx.play("tap"); c.destroy(); });
        c.add(close);
    }
}
