import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HEX, PLAYER_X, STREET_TOP, STREET_BOTTOM, laneY } from "../ui/layout";
import { getLevel, levelsForWorld } from "../data/levels";
import { worldById } from "../data/worlds";
import { makeRoadTexture } from "../art/road";
import { FONT } from "../ui/widgets";
import { Save } from "../managers/SaveManager";
import { Sfx } from "../managers/AudioManager";

const TRAY_MAX = 5;           // diyas the tray can hold
const HIT_X = 74;             // how close (px) along the street to interact
const HUD_H = 84;             // top HUD band height
const ROAD_TOP = 200;
const ROAD_H = 360;

// Endless mode tuning
const PX_PER_M = 20;          // pixels of scroll that count as one in-game metre
const COMBO_MAX = 10;         // delivery combo multiplier cap
const GRACE_SECONDS = 3;      // diya-shortage grace window before RUN OVER
const STUN_SECONDS = 0.5;     // slow-down after an obstacle hit

/**
 * The level itself, in landscape: a warm village street scrolling to the left
 * while the player runs to the right, moving up/down between three lane rows to
 * collect diyas, deliver them to houses lining the street, grab bonuses and
 * dodge obstacles before the clock runs out. One new challenge per level comes
 * entirely from the level table.
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super("Game");
    }

    init(data) {
        this.worldId = data.worldId || "village";
        this.mode = data.mode || "story";
        this.endless = this.mode === "endless";
        this.levelIndex = data.levelIndex || 0;
        this.level = this.endless ? this.endlessConfig() : getLevel(this.worldId, this.levelIndex);
    }

    // Endless mode isn't a level from the table - it's a survival run with
    // three lives, a ramping speed and a score. This synthesises a "level" the
    // rest of the scene can drive unchanged.
    endlessConfig() {
        return {
            n: 0, name: "Endless", challenge: "Deliver as many as you can!",
            deliveries: Infinity, time: 0, star2Time: 0,
            lanes: 3, speed: 205, spawnEvery: 0.82, rain: false,
            obstacles: ["obs_cart", "obs_pedestrian", "obs_dog", "obs_pots"],
            weights: { diya: 34, house: 22, coin: 16, flower: 6, golden: 4, obstacle: 12, star: 2, life: 1 }
        };
    }

    create() {
        const lv = this.level;
        this.elapsed = 0;
        this.timeLeft = lv.time;
        this.running = false;
        this.paused = false;
        this.finished = false;

        this.tray = 0;
        this.delivered = 0;
        this.coins = 0;
        this.spawnedBonus = 0;
        this.collectedBonus = 0;

        // Story mode: run & collect, then light a fixed row of houses at the end.
        this.houses = lv.houses || 0;
        this.diyasPerHouse = lv.diyasPerHouse || 1;
        this.diyaGoal = this.houses * this.diyasPerHouse;
        this.required = this.endless ? Infinity : this.houses;  // houses to light
        this.housesLit = 0;
        this.deliveryPhase = false;
        this.spawnedHouses = 0;
        this.housesResolved = 0;   // lit or missed
        this.runTime = lv.runTime || 26;
        // Carry cap: endless keeps the small tray; story lets you stock the goal
        // (plus a little buffer so an unlucky puddle isn't an instant fail).
        this.trayMax = this.endless ? TRAY_MAX : this.diyaGoal + 4;

        this.speed = lv.speed;
        this.baseSpeed = lv.speed;
        this.boostUntil = 0;
        this.invulnUntil = 0;
        this.shield = false;

        // endless-mode run state
        this.score = 0;
        this.distance = 0;      // px scrolled
        this.combo = 1;
        this.maxCombo = 1;
        this.stage = 1;
        this.stunUntil = 0;
        this.graceActive = false;
        this.graceLeft = 0;

        this.laneRows = this.computeLanes(lv.lanes);
        this.currentLane = Math.floor(this.laneRows.length / 2);
        this.playerBaseY = this.laneRows[this.currentLane];

        this.buildScenery();
        this.buildRoad();
        this.buildPlayer();
        this.objects = this.add.group();
        this.spawnAcc = 0;

        this.buildHUD();
        this.updateHUD();
        this.buildControls();
        if (lv.rain) this.buildRain();

        this.showCountdown(() => { this.running = true; });

        this.events.on("shutdown", () => this.cleanup());
    }

    // --- setup -------------------------------------------------------------

    computeLanes(n) {
        const rows = [];
        for (let i = 0; i < n; i++) {
            rows.push(n === 1 ? (STREET_TOP + STREET_BOTTOM) / 2
                : STREET_TOP + (STREET_BOTTOM - STREET_TOP) * i / (n - 1));
        }
        return rows;
    }

    buildScenery() {
        const world = worldById(this.worldId);
        this.cameras.main.setBackgroundColor(COLORS.nightDeep);

        // Village backdrop fills the screen (the art is landscape).
        const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, world.bg || "bg_village");
        const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
        bg.setScale(scale).setDepth(-20);
        if (world.tint && world.tint !== 0xffffff) bg.setTint(world.tint);
        else bg.setTint(0xffe0b0);
        const shade = this.add.graphics().setDepth(-19);
        shade.fillStyle(COLORS.night, 0.30);
        shade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // bunting along the top, behind the HUD
        if (this.textures.exists("bunting")) {
            const b = this.add.image(GAME_WIDTH / 2, 2, "bunting").setOrigin(0.5, 0).setDepth(-18);
            b.setScale(GAME_WIDTH / b.width * 1.02);
        }
        // lanterns hanging at the sides
        this.add.image(40, 150, "lantern").setDisplaySize(56, 82).setDepth(38).setAlpha(0.95);
        this.add.image(GAME_WIDTH - 40, 150, "lantern").setDisplaySize(56, 82).setDepth(38).setAlpha(0.95);
    }

    buildRoad() {
        makeRoadTexture(this, "road_tile", { height: ROAD_H });
        this.road = this.add.tileSprite(0, ROAD_TOP, GAME_WIDTH, ROAD_H, "road_tile")
            .setOrigin(0, 0).setDepth(-10);
        const glow = this.add.graphics().setDepth(-9);
        glow.fillStyle(COLORS.saffron, 0.10);
        glow.fillEllipse(PLAYER_X, this.laneRows[this.currentLane] + 20, 200, 150);
    }

    buildPlayer() {
        // Main pose: the dedicated run-with-tray sheet. It already faces right
        // (his direction of travel) and has its own running lean, so no flip and
        // no extra tilt. Feet sit at the bottom of the frame -> origin near 1.
        // Scale so the character stands ~192 px tall on the road.
        this.player = this.add.sprite(PLAYER_X, this.playerBaseY, "runner")
            .setDepth(20).setOrigin(0.5, 0.97);
        this.player.setScale(192 / this.player.frame.height);
        this.runLean = 0;
        this.player.play("p_run_tray");
        this.dustAcc = 0;
        this.playerShadow = this.add.ellipse(PLAYER_X, this.playerBaseY + 8, 72, 22, 0x000000, 0.28).setDepth(19);
        this.trayPips = this.add.container(0, 0).setDepth(21);
    }

    // --- HUD ---------------------------------------------------------------

    buildHUD() {
        const bar = this.add.graphics().setDepth(50);
        bar.fillStyle(0x2a1550, 0.82);
        bar.fillRoundedRect(8, 6, GAME_WIDTH - 16, HUD_H - 10, 20);
        bar.lineStyle(3, COLORS.gold, 0.6);
        bar.strokeRoundedRect(8, 6, GAME_WIDTH - 16, HUD_H - 10, 20);

        const cy = 40;
        const mkIcon = (x, key, size = 36) => this.add.image(x, cy, key).setDisplaySize(size, size).setDepth(51);
        const mkText = (x, val) => this.add.text(x, cy, val, {
            fontFamily: FONT, fontSize: "28px", color: HEX.cream, fontStyle: "bold"
        }).setOrigin(0, 0.5).setDepth(51);

        mkIcon(38, "hud_timer");
        this.timerText = mkText(62, "0:00");

        if (this.endless) {
            // distance / combo / score instead of deliveries + a countdown
            this.timerText.setText("0.00 km");    // timer slot shows distance
            this.add.text(250, cy, "🔥", { fontSize: "26px" }).setOrigin(0, 0.5).setDepth(51);
            this.comboText = this.add.text(284, cy, "x1", { fontFamily: FONT, fontSize: "28px", color: HEX.gold, fontStyle: "bold" }).setOrigin(0, 0.5).setDepth(51);
            this.add.text(420, cy, "🏆", { fontSize: "26px" }).setOrigin(0, 0.5).setDepth(51);
            this.scoreText = mkText(456, "0");
        } else {
            this.add.text(220, cy, "🏠", { fontSize: "28px" }).setOrigin(0, 0.5).setDepth(51);
            this.deliverText = mkText(258, `0/${this.required}`);
        }
        mkIcon(this.endless ? 660 : 420, "hud_diya");
        this.trayText = mkText(this.endless ? 686 : 446, "0");
        mkIcon(this.endless ? 790 : 560, "hud_coin");
        this.coinText = mkText(this.endless ? 816 : 586, "0");

        this.add.image(GAME_WIDTH - 44, cy, "btn_pause").setDisplaySize(52, 52).setDepth(52)
            .setInteractive({ useHandCursor: true })
            .on("pointerup", () => this.togglePause(true));

        // delivery progress bar under the HUD (story only)
        this.progBar = this.add.graphics().setDepth(50);
        if (!this.endless) this.drawProgress();

        const banner = this.add.text(GAME_WIDTH / 2, 128, this.level.challenge, {
            fontFamily: FONT, fontSize: "26px", color: HEX.gold, fontStyle: "bold",
            stroke: "#5a2400", strokeThickness: 5
        }).setOrigin(0.5).setDepth(60);
        this.tweens.add({ targets: banner, alpha: 0, y: 104, delay: 1800, duration: 700, onComplete: () => banner.destroy() });
    }

    drawProgress() {
        const g = this.progBar;
        g.clear();
        const x = 700, y = 30, w = 210, h = 12;
        g.fillStyle(0x000000, 0.35);
        g.fillRoundedRect(x, y, w, h, 6);
        // run phase tracks diyas collected toward the goal; delivery tracks homes lit
        const p = this.deliveryPhase
            ? Phaser.Math.Clamp(this.housesLit / this.houses, 0, 1)
            : Phaser.Math.Clamp(this.diyaGoal ? this.tray / this.diyaGoal : 0, 0, 1);
        g.fillStyle(this.deliveryPhase ? COLORS.saffron : COLORS.gold, 1);
        g.fillRoundedRect(x, y, Math.max(6, w * p), h, 6);
    }

    updateHUD() {
        if (this.endless) {
            const km = this.distance / PX_PER_M / 1000;
            this.timerText.setText(km.toFixed(2) + " km").setColor(HEX.cream);
            this.comboText.setText("x" + this.combo).setColor(this.combo >= 5 ? HEX.saffron : HEX.gold);
            this.scoreText.setText("" + this.score);
            this.trayText.setText("" + this.tray);
            this.coinText.setText("" + this.coins);
            return;
        }
        const m = Math.floor(this.timeLeft / 60);
        const s = Math.floor(this.timeLeft % 60);
        this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);
        this.timerText.setColor(this.timeLeft <= 10 ? HEX.red : HEX.cream);
        this.deliverText.setText(`${this.housesLit}/${this.houses}`);
        // during the run show progress toward the diya goal; during delivery just the stock
        this.trayText.setText(this.deliveryPhase ? `${this.tray}` : `${this.tray}/${this.diyaGoal}`);
        this.trayText.setColor(!this.deliveryPhase && this.tray >= this.diyaGoal ? HEX.gold : HEX.cream);
        this.coinText.setText(`${this.coins}`);
        this.drawProgress();
    }

    // --- controls (up / down between lane rows) ---------------------------

    buildControls() {
        const zone = this.add.zone(0, HUD_H, GAME_WIDTH, GAME_HEIGHT - HUD_H).setOrigin(0, 0).setInteractive();
        let downX = 0, downY = 0;
        zone.on("pointerdown", (p) => { downX = p.x; downY = p.y; Sfx.unlock(); });
        zone.on("pointerup", (p) => {
            const dx = p.x - downX, dy = p.y - downY;
            if (Math.abs(dy) > 34 && Math.abs(dy) > Math.abs(dx)) {
                dy < 0 ? this.moveLane(-1) : this.moveLane(1);      // swipe up/down
            } else if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
                p.y < GAME_HEIGHT / 2 ? this.moveLane(-1) : this.moveLane(1); // tap upper/lower
            }
        });

        // on-screen up / down buttons, stacked bottom-right
        this.arrow(GAME_WIDTH - 66, GAME_HEIGHT - 148, "▲", () => this.moveLane(-1));
        this.arrow(GAME_WIDTH - 66, GAME_HEIGHT - 56, "▼", () => this.moveLane(1));

        this.input.keyboard.on("keydown-UP", () => this.moveLane(-1));
        this.input.keyboard.on("keydown-DOWN", () => this.moveLane(1));
        this.input.keyboard.on("keydown-W", () => this.moveLane(-1));
        this.input.keyboard.on("keydown-S", () => this.moveLane(1));
        this.input.keyboard.on("keydown-P", () => this.togglePause());
    }

    arrow(x, y, glyph, fn) {
        const c = this.add.container(x, y).setDepth(55);
        const circle = this.add.circle(0, 0, 40, COLORS.saffron, 0.85).setStrokeStyle(4, 0x7a3a00);
        const t = this.add.text(0, 0, glyph, { fontFamily: FONT, fontSize: "34px", color: HEX.ink, fontStyle: "bold" }).setOrigin(0.5);
        c.add([circle, t]);
        c.setSize(80, 80).setInteractive(new Phaser.Geom.Rectangle(-40, -40, 80, 80), Phaser.Geom.Rectangle.Contains);
        c.on("pointerdown", () => c.setScale(0.9));
        c.on("pointerup", () => { c.setScale(1); fn(); });
        c.on("pointerout", () => c.setScale(1));
        return c;
    }

    moveLane(dir) {
        if (!this.running || this.paused || this.finished) return;
        const next = Phaser.Math.Clamp(this.currentLane + dir, 0, this.laneRows.length - 1);
        if (next === this.currentLane) return;
        this.currentLane = next;
        Sfx.play("tap");
        this.tweens.add({ targets: this, playerBaseY: this.laneRows[next], duration: 110, ease: "Quad.out" });
        // Bank into the lane change, then settle back to the running lean.
        this.player.setAngle(this.runLean + (dir < 0 ? -11 : 11));
        this.tweens.add({ targets: this.player, angle: this.runLean, duration: 180, delay: 60 });
    }

    // --- rain --------------------------------------------------------------

    buildRain() {
        if (!this.textures.exists("rain_tile")) {
            const w = 300, h = 300;
            const tex = this.textures.createCanvas("rain_tile", w, h);
            const ctx = tex.getContext();
            ctx.strokeStyle = "rgba(200,225,255,0.5)";
            ctx.lineWidth = 2;
            for (let i = 0; i < 70; i++) {
                const x = Math.random() * w, y = Math.random() * h;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 16); ctx.stroke();
            }
            tex.refresh();
        }
        this.rain = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "rain_tile").setOrigin(0, 0).setDepth(45).setAlpha(0.5);
        const dark = this.add.graphics().setDepth(44);
        dark.fillStyle(0x102040, 0.18);
        dark.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // --- countdown ---------------------------------------------------------

    showCountdown(done) {
        const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "", {
            fontFamily: FONT, fontSize: "120px", color: HEX.gold, fontStyle: "bold",
            stroke: "#5a2400", strokeThickness: 12
        }).setOrigin(0.5).setDepth(80);
        const seq = ["3", "2", "1", "GO!"];
        let i = 0;
        const step = () => {
            if (i >= seq.length) { label.destroy(); done(); return; }
            label.setText(seq[i]).setScale(0.4).setAlpha(1);
            Sfx.play(i === seq.length - 1 ? "deliver" : "tap");
            this.tweens.add({ targets: label, scale: 1, duration: 260, ease: "Back.out" });
            this.tweens.add({ targets: label, alpha: 0, delay: 500, duration: 240 });
            i++;
            this.time.delayedCall(560, step);
        };
        step();
    }

    // --- main loop ---------------------------------------------------------

    update(time, delta) {
        if (!this.running || this.paused || this.finished) return;
        const dt = delta / 1000;
        this.elapsed += dt;

        if (this.endless) {
            if (this.updateEndless(dt)) return;   // run ended
        } else {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) { this.timeLeft = 0; this.updateHUD(); return this.endLevel(false); }
        }

        const stunned = this.elapsed < this.stunUntil;
        const boosting = this.elapsed < this.boostUntil;
        const speed = stunned ? this.speed * 0.4 : this.speed * (boosting ? 1.7 : 1);
        this.road.tilePositionX += speed * dt;
        if (this.rain) { this.rain.tilePositionX += 500 * dt; this.rain.tilePositionY += 700 * dt; }
        if (this.endless) this.distance += this.speed * dt;

        // running bounce - two strides per cycle, a touch higher so the legs read
        const stride = this.elapsed * 15;
        const lift = Math.abs(Math.sin(stride)) * 11;
        this.player.y = this.playerBaseY - lift;
        this.playerShadow.y = this.playerBaseY + 8;
        this.playerShadow.setScale(1 - lift / 48, 1 - lift / 80);
        this.player.setTint(this.elapsed < this.invulnUntil && Math.floor(this.elapsed * 12) % 2 ? 0x88ccff : 0xffffff);
        this.drawTrayPips();

        // kick up a little dust each time a foot lands (bottom of the bounce)
        this.dustAcc += dt;
        if (this.running && !this.paused && this.dustAcc > 0.18) {
            this.dustAcc = 0;
            this.spawnDust();
        }

        // Story: once the collecting run is done, bring on the houses to light.
        if (!this.endless && !this.deliveryPhase && this.elapsed >= this.runTime) {
            this.startDelivery();
        }

        // spawns - collectibles/obstacles only during the run (endless: always)
        if (this.endless || !this.deliveryPhase) {
            this.spawnAcc += dt;
            const interval = this.level.spawnEvery / (boosting ? 1.4 : 1);
            while (this.spawnAcc >= interval) { this.spawnAcc -= interval; this.spawnOne(); }
        }

        // move + interact
        const kill = -110;
        this.objects.getChildren().forEach((o) => {
            o.x -= speed * dt;
            if (o.needLabel) o.needLabel.x = o.x;
            if (o.bob) o.y = o.baseY + Math.sin((this.elapsed + o.phase) * 2) * o.bob;
            if (!o.consumed && o.lane === this.currentLane && Math.abs(o.x - PLAYER_X) < HIT_X) {
                this.interact(o);
            }
            // endless: a house you were lined up for but had no diya for starts
            // the shortage grace clock
            if (this.endless && o.type === "house" && o.needsDiya && !o.passed && o.x < PLAYER_X - HIT_X) {
                o.passed = true;
                if (o.lane === this.currentLane && this.tray === 0) this.triggerGrace();
            }
            // story: a house that slips past unlit is a missed delivery
            if (!this.endless && o.type === "house" && !o.lit && !o.passed && o.x < PLAYER_X - HIT_X) {
                o.passed = true;
                this.housesResolved++;
                this.checkDeliveryEnd();
            }
            if (o.x < kill) this.removeObject(o);
        });

        this.updateHUD();
    }

    // Advances endless difficulty/score/grace. Returns true if the run ended.
    updateEndless(dt) {
        const m = this.distance / PX_PER_M;
        const km = m / 1000;

        // distance-based difficulty stages
        let stage, spawnEvery, obstacles, diyaW;
        if (km < 1)        { stage = 1; spawnEvery = 1.00; obstacles = ["obs_puddle", "obs_dog"]; diyaW = 42; }
        else if (km < 2.5) { stage = 2; spawnEvery = 0.85; obstacles = ["obs_pedestrian", "obs_dog"]; diyaW = 34; }
        else if (km < 5)   { stage = 3; spawnEvery = 0.70; obstacles = ["obs_cart", "obs_pedestrian", "obs_pots"]; diyaW = 28; }
        else               { stage = 4; spawnEvery = Math.max(0.52, 0.64 - (km - 5) * 0.01); obstacles = ["obs_cart", "obs_pedestrian", "obs_pots", "obs_puddle", "obs_dog"]; diyaW = 22; }

        if (stage !== this.stage) { this.stage = stage; this.announceStage(stage); }
        this.level.spawnEvery = spawnEvery;
        this.level.obstacles = obstacles;
        this.level.weights = { diya: diyaW, house: 22, coin: 16, flower: 6, golden: 4, obstacle: 10 + stage * 2, star: 2, life: km > 2 ? 1 : 0 };
        this.speed = this.baseSpeed + Math.min(km * 28, 150) + stage * 8;

        // score = houses*100 + diyas*50 + coins*10 + floor(dist*5) * maxCombo
        this.score = this.delivered * 150 + this.coins * 10 + Math.floor(m * 5) * this.maxCombo;

        // grace clock (diya depletion)
        if (this.graceActive) {
            if (this.tray > 0) { this.cancelGrace(); }
            else {
                this.graceLeft -= dt;
                if (this.graceLeft <= 0) { this.endLevel(false); return true; }
                this.updateGraceUI();
            }
        }
        return false;
    }

    triggerGrace() {
        if (this.graceActive || this.finished) return;
        this.graceActive = true;
        this.graceLeft = GRACE_SECONDS;
        this.combo = 1;               // a shortage breaks the combo
        Sfx.play("bump");
        if (!this.graceLabel) {
            this.graceLabel = this.add.text(GAME_WIDTH / 2, 150, "", {
                fontFamily: FONT, fontSize: "34px", color: HEX.red, fontStyle: "bold",
                stroke: "#3a0000", strokeThickness: 6
            }).setOrigin(0.5).setDepth(65);
        }
        this.graceLabel.setVisible(true);
    }

    updateGraceUI() {
        if (this.graceLabel) {
            this.graceLabel.setText(`⚠ Get a diya!  ${Math.ceil(this.graceLeft)}`);
            const pulse = 1 + Math.sin(this.elapsed * 16) * 0.08;
            this.graceLabel.setScale(pulse);
        }
    }

    cancelGrace() {
        this.graceActive = false;
        if (this.graceLabel) this.graceLabel.setVisible(false);
    }

    announceStage(stage) {
        const names = { 1: "Peaceful Village", 2: "Busy Village", 3: "Festival Market", 4: "Grand Festival" };
        const t = this.add.text(GAME_WIDTH / 2, 172, `Stage ${stage}: ${names[stage] || ""}`, {
            fontFamily: FONT, fontSize: "30px", color: HEX.gold, fontStyle: "bold", stroke: "#5a2400", strokeThickness: 5
        }).setOrigin(0.5).setDepth(64);
        this.tweens.add({ targets: t, alpha: 0, y: 150, delay: 1500, duration: 700, onComplete: () => t.destroy() });
        Sfx.play("boost");
    }

    drawTrayPips() {
        this.trayPips.removeAll(true);
        const shown = Math.min(this.tray, 6);   // cap the floating dots; HUD has the number
        const y = this.player.y - this.player.displayHeight * 0.82 - 12;
        for (let i = 0; i < shown; i++) {
            const dot = this.add.circle(PLAYER_X - (shown - 1) * 7 + i * 14, y, 5, COLORS.gold).setStrokeStyle(2, 0x7a3a00);
            this.trayPips.add(dot);
        }
    }

    // --- spawning ----------------------------------------------------------

    spawnOne() {
        const type = this.pickType();
        if (!type) return;
        let lane = Phaser.Math.Between(0, this.laneRows.length - 1);
        let y = this.laneRows[lane];
        const x = GAME_WIDTH + 60;

        let sprite;
        switch (type) {
            case "diya": {
                const c = this.add.container(x, y);
                const glow = this.add.image(0, 0, "diya_soft").setScale(0.55).setBlendMode(Phaser.BlendModes.ADD);
                const lamp = this.add.image(0, 2, "diya").setScale(0.58);
                c.add([glow, lamp]);
                this.tweens.add({ targets: glow, scale: 0.72, alpha: 0.75, duration: 620, yoyo: true, repeat: -1, ease: "Sine.inOut" });
                sprite = c;
                break;
            }
            case "house": {
                // Houses line the street: top-edge house delivered from the top
                // lane, bottom-edge house from the bottom lane.
                const side = Phaser.Math.Between(0, 1);
                lane = side === 0 ? 0 : this.laneRows.length - 1;
                y = side === 0 ? STREET_TOP - 80 : STREET_BOTTOM + 76;
                sprite = this.add.image(x, y, this.houseTexture()).setDisplaySize(150, 134);
                sprite.needsDiya = true;
                break;
            }
            case "coin":
                sprite = this.add.sprite(x, y, "coin_spin").setDisplaySize(46, 44);
                sprite.play("coin_spin");
                break;
            case "flower":
                sprite = this.add.image(x, y, "flower").setDisplaySize(52, 52);
                break;
            case "golden":
                sprite = this.add.image(x, y, "golden_diya").setDisplaySize(60, 60);
                this.tweens.add({ targets: sprite, angle: 360, duration: 2600, repeat: -1 });
                break;
            case "star":
                sprite = this.add.image(x, y, "festival_star").setDisplaySize(56, 56);
                this.tweens.add({ targets: sprite, scale: sprite.scale * 1.12, duration: 500, yoyo: true, repeat: -1 });
                break;
            case "life":
                sprite = this.add.image(x, y, "extra_life").setDisplaySize(54, 54);
                break;
            case "obstacle": {
                const key = Phaser.Utils.Array.GetRandom(this.level.obstacles);
                sprite = this.add.image(x, y, key);
                this.sizeObstacle(sprite, key);
                sprite.obstacleKey = key;
                break;
            }
        }
        sprite.setDepth(type === "house" ? 8 : 10);
        sprite.type = type;
        sprite.lane = lane;
        sprite.consumed = false;
        sprite.baseY = y;
        if (type === "golden" || type === "flower") this.spawnedBonus++;
        if (type === "obstacle" && (sprite.obstacleKey === "obs_pedestrian" || sprite.obstacleKey === "obs_dog")) {
            sprite.bob = 12; sprite.phase = Math.random() * 6;
        }
        this.objects.add(sprite);
    }

    sizeObstacle(sprite, key) {
        const sizes = {
            obs_cart: [140, 104], obs_pedestrian: [80, 138], obs_dog: [122, 76],
            obs_pots: [98, 88], obs_basket: [94, 78], obs_puddle: [150, 58]
        };
        const [w, h] = sizes[key] || [100, 100];
        sprite.setDisplaySize(w, h);
    }

    houseTexture() {
        return Phaser.Utils.Array.GetRandom(["house_basic", "house_small", "house_large"]);
    }

    pickType() {
        const w = this.level.weights;
        const entries = Object.entries(w).filter(([k, v]) => v > 0 &&
            !(k === "obstacle" && (!this.level.obstacles || this.level.obstacles.length === 0)));
        const total = entries.reduce((s, [, v]) => s + v, 0);
        let r = Math.random() * total;
        for (const [k, v] of entries) { if ((r -= v) <= 0) return k; }
        return entries.length ? entries[0][0] : null;
    }

    // --- interactions ------------------------------------------------------

    interact(o) {
        switch (o.type) {
            case "diya":
                if (this.tray >= this.trayMax) return;
                o.consumed = true; this.tray++;
                if (this.endless) this.cancelGrace();   // a pickup saves the run
                Sfx.play("pickup"); this.popText(o.x, o.y, "+🪔", HEX.gold); this.collectFx(o);
                break;
            case "house":
                if (this.endless) { this.deliverEndlessHouse(o); }
                else { this.deliverStoryHouse(o); }
                break;
            case "coin":
                o.consumed = true; this.coins++; Sfx.play("coin");
                this.popText(o.x, o.y, "+1", HEX.gold); this.collectFx(o);
                break;
            case "flower":
                o.consumed = true; this.collectedBonus++; this.coins += 2;
                Sfx.play("flower"); this.popText(o.x, o.y, "🌸", "#ff9ecb"); this.collectFx(o);
                break;
            case "golden":
                o.consumed = true; this.collectedBonus++; this.coins += 5;
                Sfx.play("golden"); this.popText(o.x, o.y, "+5", HEX.gold); this.collectFx(o, "golden_diya");
                break;
            case "star":
                o.consumed = true; this.boostUntil = this.elapsed + 4; this.invulnUntil = this.elapsed + 4;
                Sfx.play("boost"); this.popText(o.x, o.y, "BOOST!", HEX.saffron); this.collectFx(o);
                break;
            case "life":
                o.consumed = true; this.shield = true;
                Sfx.play("life"); this.popText(o.x, o.y, "+❤", HEX.red); this.collectFx(o);
                break;
            case "obstacle":
                this.hitObstacle(o);
                break;
        }
    }

    // Endless delivery: one diya per house, builds the combo (unchanged).
    deliverEndlessHouse(o) {
        if (!o.needsDiya || this.tray <= 0) return;
        o.consumed = true; o.needsDiya = false;
        this.tray--; this.delivered++;
        Sfx.play("deliver"); this.deliverFx(o);
        this.tweens.add({ targets: this.player, scaleY: this.player.scaleY * 0.92, duration: 90, yoyo: true, ease: "Quad.out" });
        this.combo = Math.min(COMBO_MAX, this.combo + 1);
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.cancelGrace();
        this.popText(o.x, o.y, `x${this.combo}`, HEX.saffron);
    }

    // Story delivery: a house needs diyasPerHouse to light. Deliver them all in
    // one pass if the boy is carrying enough; otherwise nudge him to collect more.
    deliverStoryHouse(o) {
        if (o.lit || o.consumed) return;
        if (this.tray < o.perHouse) {
            if (!o.warned) { o.warned = true; this.popText(o.x, o.y - 90, `Need ${o.perHouse} 🪔`, HEX.red); }
            return;
        }
        o.lit = true; o.consumed = true;
        this.tray -= o.perHouse;
        this.housesLit++; this.delivered = this.housesLit;
        this.housesResolved++;
        Sfx.play("deliver"); this.deliverFx(o);
        this.tweens.add({ targets: this.player, scaleY: this.player.scaleY * 0.92, duration: 90, yoyo: true, ease: "Quad.out" });
        this.popText(o.x, o.y - 90, "Lit!", HEX.gold);
        if (o.needLabel) { o.needLabel.destroy(); o.needLabel = null; }
        // swap to the lit/glowing house art for a warm payoff
        if (this.textures.exists("house_glow")) o.setTexture("house_glow");
        this.tweens.add({ targets: o, scale: o.scale * 1.08, duration: 140, yoyo: true });
        if (this.housesLit >= this.houses) this.time.delayedCall(350, () => this.endLevel(true));
    }

    // Kick off the end-of-level delivery: stop the run spawns, announce it, and
    // schedule the fixed row of houses to arrive one after another.
    startDelivery() {
        this.deliveryPhase = true;
        this.announceDelivery();
        const gap = 1500;   // ms between houses arriving
        for (let i = 0; i < this.houses; i++) {
            this.time.delayedCall(600 + i * gap, () => {
                if (!this.finished) this.spawnDeliveryHouse(i);
            });
        }
    }

    announceDelivery() {
        const t = this.add.text(GAME_WIDTH / 2, 150, "🏠 Deliver the diyas!", {
            fontFamily: FONT, fontSize: "34px", color: HEX.gold, fontStyle: "bold",
            stroke: "#5a2400", strokeThickness: 6
        }).setOrigin(0.5).setDepth(64);
        this.tweens.add({ targets: t, alpha: 0, y: 128, delay: 1400, duration: 700, onComplete: () => t.destroy() });
        Sfx.play("boost");
    }

    // A house waiting at the end, on an edge lane, needing perHouse diyas.
    spawnDeliveryHouse(index) {
        const topLane = 0, botLane = this.laneRows.length - 1;
        const lane = index % 2 === 0 ? topLane : botLane;   // alternate top/bottom
        const y = lane === topLane ? STREET_TOP - 80 : STREET_BOTTOM + 76;
        const x = GAME_WIDTH + 80;
        const house = this.add.image(x, y, this.houseTexture()).setDisplaySize(150, 134).setDepth(8);
        house.type = "house";
        house.lane = lane;
        house.lit = false;
        house.consumed = false;
        house.perHouse = this.diyasPerHouse;
        house.baseY = y;
        // a small "needs N" tag above the house
        house.needLabel = this.add.text(x, y - 84, `${this.diyasPerHouse}🪔`, {
            fontFamily: FONT, fontSize: "24px", color: HEX.cream, fontStyle: "bold",
            stroke: "#5a2400", strokeThickness: 4
        }).setOrigin(0.5).setDepth(12);
        this.objects.add(house);
        this.spawnedHouses++;
    }

    // If every house has been resolved (lit or missed) and some stayed dark,
    // the delivery is over and the level is lost.
    checkDeliveryEnd() {
        if (this.finished) return;
        if (this.spawnedHouses >= this.houses && this.housesResolved >= this.houses && this.housesLit < this.houses) {
            this.time.delayedCall(300, () => this.endLevel(false));
        }
    }

    hitObstacle(o) {
        if (this.elapsed < this.invulnUntil) return;
        o.consumed = true;

        if (this.shield) {
            this.shield = false;
            Sfx.play("tap"); this.popText(o.x, o.y, "SAVED!", "#9fe0ff"); this.flashPlayer(0x9fe0ff);
            this.tweens.add({ targets: o, alpha: 0, scale: o.scale * 1.3, duration: 250, onComplete: () => this.removeObject(o) });
            this.invulnUntil = this.elapsed + 1;
            return;
        }

        const puddle = o.obstacleKey === "obs_puddle";
        if (puddle && this.tray > 0) {
            const lost = Math.min(this.tray, 2); this.tray -= lost;
            Sfx.play("extinguish"); this.popText(PLAYER_X, this.player.y - 40, `-${lost}🪔`, HEX.red);
            this.cameras.main.flash(150, 60, 90, 160);
        } else {
            // story loses time; endless never does (failure is diya depletion)
            if (!this.endless) this.timeLeft = Math.max(0, this.timeLeft - 2.5);
            if (this.tray > 0) { this.tray--; this.popText(PLAYER_X, this.player.y - 40, "-1🪔", HEX.red); }
            Sfx.play("bump"); this.cameras.main.shake(160, 0.01);
        }
        // endless: an obstacle is a penalty, not a kill - drop a combo level and
        // a short stun; the run only ends via diya depletion
        if (this.endless) {
            this.combo = Math.max(1, this.combo - 1);
            this.stunUntil = this.elapsed + STUN_SECONDS;
        }
        this.flashPlayer(0xff6b5e);
        this.invulnUntil = this.elapsed + 1.1;
        this.tweens.add({ targets: o, alpha: 0.2, duration: 250, onComplete: () => this.removeObject(o) });
    }

    flashPlayer(color) {
        this.player.setTint(color);
        this.tweens.add({ targets: this.player, angle: { from: this.runLean - 12, to: this.runLean + 12 }, duration: 80, yoyo: true, repeat: 2, onComplete: () => this.player.setAngle(this.runLean) });
    }

    // A small puff of dust kicked up behind the running feet.
    spawnDust() {
        const y = this.playerBaseY + 6;
        const puff = this.add.ellipse(PLAYER_X - 26, y, 16, 9, 0xffe6b0, 0.5).setDepth(18);
        this.tweens.add({
            targets: puff,
            x: PLAYER_X - 70,
            y: y - 6,
            scaleX: 2.2, scaleY: 2.2,
            alpha: 0,
            duration: 420,
            ease: "Quad.out",
            onComplete: () => puff.destroy()
        });
    }

    // --- little effects ----------------------------------------------------

    popText(x, y, msg, color) {
        const t = this.add.text(x, y, msg, {
            fontFamily: FONT, fontSize: "26px", color, fontStyle: "bold", stroke: "#5a2400", strokeThickness: 4
        }).setOrigin(0.5).setDepth(70);
        this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 720, ease: "Quad.out", onComplete: () => t.destroy() });
    }

    collectFx(o, burstKey) {
        this.tweens.add({ targets: o, y: o.y - 24, scale: (o.scale || 1) * 1.4, alpha: 0, duration: 240, onComplete: () => this.removeObject(o) });
        if (burstKey) {
            const s = this.add.image(o.x, o.y, burstKey).setDisplaySize(60, 60).setDepth(69).setAlpha(0.8);
            this.tweens.add({ targets: s, scale: 2.2, alpha: 0, duration: 380, onComplete: () => s.destroy() });
        }
    }

    deliverFx(o) {
        const dw = o.displayWidth, dh = o.displayHeight;
        if (this.textures.exists("house_glow")) o.setTexture("house_glow");
        o.setDisplaySize(dw, dh);
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i;
            const spark = this.add.circle(o.x, o.y, 4, COLORS.gold).setDepth(69);
            this.tweens.add({ targets: spark, x: o.x + Math.cos(a) * 60, y: o.y + Math.sin(a) * 60, alpha: 0, duration: 480, onComplete: () => spark.destroy() });
        }
    }

    removeObject(o) {
        if (!o || !o.active) return;
        if (o.needLabel) { o.needLabel.destroy(); o.needLabel = null; }
        this.objects.remove(o, true, true);
    }

    // --- pause -------------------------------------------------------------

    togglePause(force) {
        if (this.finished) return;
        const next = force !== undefined ? force : !this.paused;
        if (next === this.paused) return;
        this.paused = next;
        if (this.paused) { this.tweens.pauseAll(); this.showPauseMenu(); }
        else { this.tweens.resumeAll(); this.hidePauseMenu(); }
    }

    showPauseMenu() {
        const c = this.add.container(0, 0).setDepth(100);
        const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive();
        c.add(dim);
        const px = GAME_WIDTH / 2, py = GAME_HEIGHT / 2;
        const g = this.add.graphics();
        g.fillStyle(0x3a1e5c, 0.98); g.fillRoundedRect(px - 180, py - 150, 360, 300, 26);
        g.lineStyle(4, COLORS.gold, 0.8); g.strokeRoundedRect(px - 180, py - 150, 360, 300, 26);
        c.add(g);
        c.add(this.add.text(px, py - 108, "Paused", {
            fontFamily: FONT, fontSize: "38px", color: HEX.gold, fontStyle: "bold", stroke: "#5a2400", strokeThickness: 6
        }).setOrigin(0.5));

        const btn = (dx, key, size, label, fn) => {
            const img = this.add.image(px + dx, py + 4, key).setDisplaySize(size, size).setInteractive({ useHandCursor: true });
            img.on("pointerup", () => { Sfx.play("tap"); fn(); });
            c.add(img);
            c.add(this.add.text(px + dx, py + 4 + size / 2 + 16, label, { fontFamily: FONT, fontSize: "18px", color: HEX.cream }).setOrigin(0.5));
        };
        btn(-110, "btn_resume", 86, "Resume", () => this.togglePause(false));
        btn(0, "btn_restart", 74, "Restart", () => this.scene.restart({ worldId: this.worldId, levelIndex: this.levelIndex }));
        btn(110, "btn_home", 66, "Levels", () => this.scene.start("LevelSelect", { worldId: this.worldId }));

        this.pauseMenu = c;
    }

    hidePauseMenu() {
        if (this.pauseMenu) { this.pauseMenu.destroy(); this.pauseMenu = null; }
    }

    // --- end ---------------------------------------------------------------

    endLevel(won) {
        if (this.finished) return;
        this.finished = true;
        this.running = false;

        if (this.endless) return this.endEndless();

        let stars = 0;
        if (won) {
            stars = 1;
            if (this.timeLeft >= this.level.star2Time) stars = 2;
            if (stars === 2 && this.collectedBonus >= this.spawnedBonus) stars = 3;
            // A happy hop on the run sheet (the win screen carries the rest).
            this.tweens.add({ targets: this.player, y: this.player.y - 40, duration: 260, yoyo: true, ease: "Quad.out" });
            Sfx.play("win");
        } else {
            Save.loseHeart();
            Sfx.play("lose");
        }

        Save.addCoins(this.coins);
        if (won) Save.recordStars(this.worldId, this.levelIndex + 1, stars);

        // accurate fail message: ran the clock down, or homes were left dark
        let failTitle = "Out of Time!";
        if (!won && this.timeLeft > 0 && this.housesLit < this.houses) failTitle = "Some homes stayed dark!";

        const levelCount = levelsForWorld(this.worldId).length;
        this.time.delayedCall(won ? 900 : 500, () => {
            this.scene.start("LevelComplete", {
                worldId: this.worldId,
                levelIndex: this.levelIndex,
                levelCount,
                won,
                stars,
                failTitle,
                coins: this.coins,
                delivered: this.delivered,
                required: this.required,
                timeLeft: Math.ceil(this.timeLeft),
                collectedBonus: this.collectedBonus,
                spawnedBonus: this.spawnedBonus
            });
        });
    }

    endEndless() {
        if (this.graceLabel) this.graceLabel.setVisible(false);
        Sfx.play("lose");
        this.cameras.main.shake(250, 0.012);
        Save.addCoins(this.coins);
        const newBest = Save.recordEndless(this.score);
        this.time.delayedCall(750, () => {
            this.scene.start("LevelComplete", {
                mode: "endless",
                worldId: this.worldId,
                score: this.score,
                best: Save.getEndlessBest(),
                newBest,
                delivered: this.delivered,
                coins: this.coins,
                maxCombo: this.maxCombo,
                distanceKm: this.distance / PX_PER_M / 1000
            });
        });
    }

    cleanup() {
        this.input.keyboard.removeAllListeners();
    }
}
