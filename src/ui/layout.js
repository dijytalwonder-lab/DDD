/**
 * One place for the game's logical size and the handful of layout numbers
 * every scene shares.
 *
 * The game is LANDSCAPE (wide): a fixed 960x640 canvas FIT-scaled to whatever
 * phone it runs on (see main.js). 960x640 is 3:2, the aspect of the home art,
 * so that image fills the screen exactly. Working in fixed logical pixels lets
 * a scene place things by absolute coordinates and trust they land the same
 * everywhere.
 */

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const CENTER_X = GAME_WIDTH / 2;
export const CENTER_Y = GAME_HEIGHT / 2;

// The street is played across three lanes that are horizontal ROWS in
// landscape - the player runs to the right and moves UP / DOWN between rows.
export const LANES = 3;

// Vertical band the lanes occupy (below the HUD, above the bottom scenery).
export const STREET_TOP = 250;
export const STREET_BOTTOM = 500;

export function laneY(lane) {
    const step = (STREET_BOTTOM - STREET_TOP) / (LANES - 1);
    return STREET_TOP + step * lane;
}

// The player runs on the spot near the left; the world scrolls past to the
// left so he appears to run up the street to the right.
export const PLAYER_X = 235;

// Warm festival palette, shared so scenes and art agree on the mood.
export const COLORS = {
    night: 0x1a0f2e,
    nightDeep: 0x0f0820,
    saffron: 0xff8a1e,
    gold: 0xffcf4d,
    marigold: 0xffb03a,
    deepRed: 0xc0392b,
    magenta: 0xd6336c,
    teal: 0x2aa5a0,
    cream: 0xfff4d6,
    ink: 0x3a2410,
    green: 0x4caf50
};

// Handy hex strings for text styles.
export const HEX = {
    gold: "#ffcf4d",
    cream: "#fff4d6",
    saffron: "#ff8a1e",
    ink: "#3a2410",
    white: "#ffffff",
    red: "#ff6b5e"
};
