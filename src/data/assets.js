/**
 * Every texture the game loads, in one table.
 *
 * Files live under public/assets (optimised from the source art by
 * tools/optimize_assets.py). Simple images are listed in IMAGES as
 * key -> filename; the three sprite sheets carry their frame grid.
 *
 * Keeping the list here means a scene preloads with a couple of loops and
 * never repeats a path, and swapping the art for a later world is editing
 * one table rather than hunting through scenes.
 */

export const ASSET_DIR = "assets/";

export const IMAGES = {
    // Scenery
    bg_village: "village_festival_bg.png",
    street_fg: "village_street_foreground.png",
    home_bg: "HomePage1.png",

    // Player (single-pose fallback)
    player_static: "player_diwali_delivery.png",

    // Tray the player carries (the diya lamps themselves are drawn in code -
    // see src/art/diya.js - because the supplied diya art bakes its glow onto
    // an un-keyable checkerboard).
    tray: "diya_tray.png",
    tray_empty: "diya_tray_empty.png",

    // Houses
    house_basic: "house_basic.png",
    house_small: "house_small.png",
    house_large: "house_large.png",
    house_glow: "house_delivery_glow.png",

    // Obstacles
    obs_cart: "obstacle_cart.png",
    obs_pedestrian: "obstacle_pedestrian.png",
    obs_dog: "obstacle_sleeping_dog.png",
    obs_pots: "obstacle_clay_pots.png",
    obs_basket: "obstacle_flower_basket.png",
    obs_puddle: "obstacle_puddle.png",

    // Collectibles
    coin: "coin.png",
    golden_diya: "golden_diya_bonus.png",
    flower: "flower_collectible.png",
    flower_combo: "flower_combo_effect.png",
    festival_star: "festival_star.png",
    extra_life: "extra_life_diya.png",

    // Decor
    garland: "decor_marigold_garland.png",
    bunting: "decor_festival_bunting.png",
    lantern: "decor_lantern.png",
    rangoli: "decor_rangoli.png",

    // HUD
    hud_top: "hud_top_bar.png",
    hud_progress: "hud_delivery_progress.png",
    hud_stars: "hud_star_rating.png",
    hud_coin: "hud_coin.png",
    hud_diya: "hud_diya_count.png",
    hud_timer: "hud_timer.png",

    // Buttons
    btn_home: "button_home.png",
    btn_pause: "button_pause.png",
    btn_resume: "button_resume.png",
    btn_restart: "button_restart.png",
    btn_settings: "button_settings.png"
    // (button_continue / button_retry and the level_complete/failed badges are
    //  not loaded - the results screen draws its own medallion and buttons.)
};

export const SHEETS = {
    player: {
        file: "player_diwali_delivery_sheet.png",
        frameWidth: 120,
        frameHeight: 165
    },
    coin_spin: {
        file: "coin_sheet.png",
        frameWidth: 84,
        frameHeight: 81
    }
};

// Player sheet is an 8-column x 6-row grid. These name the rows so the
// animation setup reads clearly.  (col 0..7 within each row)
export const PLAYER_ROWS = {
    idleTray: 0,   // standing, holding the tray of diyas
    walk: 1,       // walking, empty-handed
    run: 2,        // running, empty-handed
    walkTray: 3,   // moving while carrying the tray  <- main gameplay pose
    deliver: 4,    // reaching a doorway, handing over
    cheer: 5       // arms up, celebrating
};

export const PLAYER_COLS = 8;
