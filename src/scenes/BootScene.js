import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX } from "../ui/layout";
import { ASSET_DIR, IMAGES, SHEETS, PLAYER_ROWS, PLAYER_COLS } from "../data/assets";
import { makeDiyaTextures } from "../art/diya";
import { FONT } from "../ui/widgets";
import { Save } from "../managers/SaveManager";

/**
 * Loads every texture, builds the shared animations, then hands off to the
 * home screen. A small diya-lit loading bar covers the download.
 */
export default class BootScene extends Phaser.Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        this.buildLoadingUI();

        for (const [key, file] of Object.entries(IMAGES)) {
            this.load.image(key, ASSET_DIR + file);
        }
        for (const [key, cfg] of Object.entries(SHEETS)) {
            this.load.spritesheet(key, ASSET_DIR + cfg.file, {
                frameWidth: cfg.frameWidth,
                frameHeight: cfg.frameHeight
            });
        }
    }

    buildLoadingUI() {
        this.cameras.main.setBackgroundColor(COLORS.nightDeep);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 130, "Diwali\nDelivery Dash", {
            fontFamily: FONT, fontSize: "46px", color: HEX.gold, fontStyle: "bold",
            align: "center", stroke: "#5a2400", strokeThickness: 8
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, "🪔", { fontSize: "64px" })
            .setOrigin(0.5);

        const barW = 320, barH = 26, x = (GAME_WIDTH - barW) / 2, y = GAME_HEIGHT / 2 + 60;
        const frame = this.add.graphics();
        frame.lineStyle(4, COLORS.gold, 1);
        frame.strokeRoundedRect(x, y, barW, barH, 13);
        const fill = this.add.graphics();

        const label = this.add.text(GAME_WIDTH / 2, y + 54, "Lighting the lamps…", {
            fontFamily: FONT, fontSize: "20px", color: HEX.cream
        }).setOrigin(0.5);

        this.load.on("progress", (p) => {
            fill.clear();
            fill.fillStyle(COLORS.saffron, 1);
            fill.fillRoundedRect(x + 3, y + 3, (barW - 6) * p, barH - 6, 10);
        });
        this.load.on("complete", () => label.setText("Ready!"));
    }

    create() {
        makeDiyaTextures(this);
        this.buildAnimations();
        // First launch shows the welcome/login screen; afterwards, straight home.
        this.scene.start(Save.getSetting("onboarded") ? "Home" : "Welcome");
    }

    // Slices the player sheet rows into named animations. Each row is 8 cols.
    buildAnimations() {
        const row = (r) => {
            const start = r * PLAYER_COLS;
            return this.anims.generateFrameNumbers("player", { start, end: start + PLAYER_COLS - 1 });
        };

        const make = (key, r, rate, repeat = -1) => {
            if (this.anims.exists(key)) return;
            this.anims.create({ key, frames: row(r), frameRate: rate, repeat });
        };

        make("p_idle", PLAYER_ROWS.idleTray, 8);
        make("p_walk", PLAYER_ROWS.walk, 12);
        make("p_run", PLAYER_ROWS.run, 16);
        // The gameplay pose: carrying the tray while moving. Run it fast so the
        // legs read as a run rather than a stroll.
        make("p_carry", PLAYER_ROWS.walkTray, 20);
        make("p_deliver", PLAYER_ROWS.deliver, 12, 0);
        make("p_cheer", PLAYER_ROWS.cheer, 10, 2);

        // Coin spin (single row of 8).
        if (!this.anims.exists("coin_spin")) {
            this.anims.create({
                key: "coin_spin",
                frames: this.anims.generateFrameNumbers("coin_spin", { start: 0, end: 7 }),
                frameRate: 14, repeat: -1
            });
        }
    }
}
