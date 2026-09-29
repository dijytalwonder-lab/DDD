/**
 * All persistent progress, kept in one localStorage blob.
 *
 * Stars are stored per world+level so replaying a level can only ever raise
 * its star count, never lower it. Coins accumulate across the whole game.
 * Everything is wrapped in try/catch: a private-mode browser that throws on
 * localStorage must not take the game down with it, so a failed read simply
 * behaves like a fresh save.
 */

const KEY = "diwali_delivery_dash_v1";

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 20 * 60 * 1000; // one heart every 20 minutes

const DEFAULTS = {
    coins: 0,
    stars: {},        // "world:level" -> 0..3
    hearts: MAX_HEARTS,
    heartsAt: 0,      // timestamp the regen clock last started from
    endlessBest: 0,   // best score in Endless mode
    sound: true,
    music: true
};

function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { ...DEFAULTS, stars: {} };
        const data = JSON.parse(raw);
        return { ...DEFAULTS, ...data, stars: { ...(data.stars || {}) } };
    } catch {
        return { ...DEFAULTS, stars: {} };
    }
}

function persist(data) {
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
        /* storage unavailable - progress just won't survive a reload */
    }
}

let state = load();

const slot = (world, level) => `${world}:${level}`;

export const Save = {

    getCoins() {
        return state.coins || 0;
    },

    addCoins(n) {
        state.coins = (state.coins || 0) + n;
        persist(state);
        return state.coins;
    },

    // Stars for a single level (0 if never played).
    starsFor(world, level) {
        return state.stars[slot(world, level)] || 0;
    },

    // Records a result, keeping the best star count seen.
    recordStars(world, level, stars) {
        const key = slot(world, level);
        if ((state.stars[key] || 0) < stars) {
            state.stars[key] = stars;
            persist(state);
        }
        return state.stars[key];
    },

    // Total stars in a world, for the world-select screen.
    worldStars(world, levelCount) {
        let sum = 0;
        for (let i = 1; i <= levelCount; i++) sum += this.starsFor(world, i);
        return sum;
    },

    // A level is unlocked once the one before it has at least one star. Level
    // 1 is always open.
    isLevelUnlocked(world, level) {
        if (level <= 1) return true;
        return this.starsFor(world, level - 1) > 0;
    },

    // --- hearts (lives) ---------------------------------------------------
    // Hearts regenerate one at a time. We store a base count and the time the
    // regen clock started; the live count is derived so it keeps ticking up
    // even while the game is closed.
    getHearts() {
        this._syncHearts();
        return state.hearts;
    },

    // Milliseconds until the next heart, or 0 when already full.
    heartRegenRemaining() {
        this._syncHearts();
        if (state.hearts >= MAX_HEARTS) return 0;
        const elapsed = Date.now() - state.heartsAt;
        return Math.max(0, HEART_REGEN_MS - (elapsed % HEART_REGEN_MS));
    },

    _syncHearts() {
        if (state.hearts >= MAX_HEARTS) return;
        if (!state.heartsAt) { state.heartsAt = Date.now(); persist(state); return; }
        const gained = Math.floor((Date.now() - state.heartsAt) / HEART_REGEN_MS);
        if (gained > 0) {
            state.hearts = Math.min(MAX_HEARTS, state.hearts + gained);
            state.heartsAt = state.hearts >= MAX_HEARTS ? 0 : state.heartsAt + gained * HEART_REGEN_MS;
            persist(state);
        }
    },

    loseHeart() {
        this._syncHearts();
        if (state.hearts >= MAX_HEARTS) state.heartsAt = Date.now(); // start clock
        state.hearts = Math.max(0, state.hearts - 1);
        persist(state);
        return state.hearts;
    },

    addHeart(n = 1) {
        this._syncHearts();
        state.hearts = Math.min(MAX_HEARTS, state.hearts + n);
        if (state.hearts >= MAX_HEARTS) state.heartsAt = 0;
        persist(state);
        return state.hearts;
    },

    // --- endless best score ----------------------------------------------
    getEndlessBest() {
        return state.endlessBest || 0;
    },

    // Records a run's score, keeping the best. Returns true if it's a new best.
    recordEndless(score) {
        if (score > (state.endlessBest || 0)) {
            state.endlessBest = score;
            persist(state);
            return true;
        }
        return false;
    },

    getSetting(name) {
        return state[name];
    },

    setSetting(name, value) {
        state[name] = value;
        persist(state);
    },

    // For a debug/reset control.
    wipe() {
        state = { ...DEFAULTS, stars: {} };
        persist(state);
    }
};
