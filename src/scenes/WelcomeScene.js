import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX } from "../ui/layout";
import { festiveBackground, pillButton, FONT } from "../ui/widgets";
import { Save } from "../managers/SaveManager";
import { Sfx } from "../managers/AudioManager";

/**
 * First-launch welcome. Friendly and non-blocking: the player can Continue as
 * Guest and play immediately (progress saved locally), or Sign in with Google
 * to sync across devices. Shown only until the player onboards once.
 *
 * Google sign-in needs a configured OAuth client + backend, which isn't wired
 * up yet, so that button explains it and offers guest play rather than faking
 * an account. Dropping a real client id into signInWithGoogle() later is all
 * it takes to enable it.
 */
export default class WelcomeScene extends Phaser.Scene {
    constructor() {
        super("Welcome");
    }

    create() {
        festiveBackground(this, { showVillage: true });
        const dim = this.add.graphics();
        dim.fillStyle(0x140a2a, 0.45);
        dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Title + subtitle
        this.add.text(GAME_WIDTH / 2, 96, "DIWALI DELIVERY DASH", {
            fontFamily: FONT, fontSize: "52px", color: HEX.gold, fontStyle: "bold",
            stroke: "#5a2400", strokeThickness: 9, align: "center"
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH / 2, 150, "Light Up Every Home!", {
            fontFamily: FONT, fontSize: "28px", color: HEX.saffron, fontStyle: "bold",
            stroke: "#5a2400", strokeThickness: 5
        }).setOrigin(0.5);

        // a couple of floating diyas for warmth
        for (let i = 0; i < 4; i++) {
            const c = this.add.container(Phaser.Math.Between(120, GAME_WIDTH - 120), Phaser.Math.Between(210, 300));
            const glow = this.add.image(0, 0, "diya_soft").setScale(0.5).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
            const lamp = this.add.image(0, 2, "diya").setScale(0.5);
            c.add([glow, lamp]);
            this.tweens.add({ targets: c, y: c.y - 16, duration: Phaser.Math.Between(1400, 2000), yoyo: true, repeat: -1, ease: "Sine.inOut" });
        }

        // Panel
        const px = GAME_WIDTH / 2, py = 420;
        const g = this.add.graphics();
        g.fillStyle(0x2a1550, 0.92); g.fillRoundedRect(px - 300, py - 130, 600, 280, 28);
        g.lineStyle(4, COLORS.gold, 0.8); g.strokeRoundedRect(px - 300, py - 130, 600, 280, 28);

        this.add.text(px, py - 96, "Sign in to save your festival journey", {
            fontFamily: FONT, fontSize: "22px", color: HEX.cream
        }).setOrigin(0.5).setAlpha(0.9);

        // Continue as Guest
        pillButton(this, px, py - 34, "CONTINUE AS GUEST", () => this.continueAsGuest(),
            { width: 420, height: 70, fontSize: 26 });
        this.add.text(px, py + 16, "You can sign in later to save your progress across devices.", {
            fontFamily: FONT, fontSize: "16px", color: HEX.cream, align: "center"
        }).setOrigin(0.5).setAlpha(0.75);

        // Sign in with Google
        this.googleButton(px, py + 92);

        this.cameras.main.fadeIn(300, 10, 6, 24);
        this.input.once("pointerdown", () => Sfx.unlock());
    }

    googleButton(x, y) {
        const w = 360, h = 60;
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, h / 2);
        g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        g.lineStyle(2, 0xdadce0, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        c.add(g);
        // a simple multicolour "G"
        c.add(this.add.text(-w / 2 + 40, 0, "G", { fontFamily: FONT, fontSize: "32px", color: "#4285F4", fontStyle: "bold" }).setOrigin(0.5));
        c.add(this.add.text(20, 0, "Sign in with Google", { fontFamily: FONT, fontSize: "24px", color: "#3c4043", fontStyle: "bold" }).setOrigin(0.5));
        c.setSize(w, h).setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
        c.on("pointerdown", () => c.setScale(0.97));
        c.on("pointerup", () => { c.setScale(1); Sfx.unlock(); Sfx.play("tap"); this.signInWithGoogle(); });
        c.on("pointerout", () => c.setScale(1));
        return c;
    }

    // --- actions ----------------------------------------------------------

    continueAsGuest() {
        Save.setSetting("onboarded", true);
        Save.setSetting("account", "guest");
        this.go();
    }

    signInWithGoogle() {
        // No OAuth client / backend is configured yet, so be honest rather than
        // fake an account. When one is added, start the real flow here.
        this.toast("Google Sign-In will be available in the published app. Playing as guest for now!");
        this.time.delayedCall(1600, () => this.continueAsGuest());
    }

    go() {
        this.cameras.main.fadeOut(240, 10, 6, 24);
        this.time.delayedCall(250, () => this.scene.start("Home"));
    }

    toast(msg) {
        if (this.toastObj) this.toastObj.destroy();
        const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 40).setDepth(200);
        const w = Math.min(GAME_WIDTH - 40, msg.length * 11 + 60);
        const g = this.add.graphics();
        g.fillStyle(0x2a1550, 0.96); g.fillRoundedRect(-w / 2, -30, w, 60, 20);
        g.lineStyle(3, COLORS.gold, 0.8); g.strokeRoundedRect(-w / 2, -30, w, 60, 20);
        const t = this.add.text(0, 0, msg, {
            fontFamily: FONT, fontSize: "18px", color: HEX.cream, fontStyle: "bold",
            align: "center", wordWrap: { width: w - 30 }
        }).setOrigin(0.5);
        c.add([g, t]);
        c.setScale(0.85); c.alpha = 0;
        this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: "Back.out" });
        this.toastObj = c;
    }
}
