/**
 * The Village Festival's ten levels.
 *
 * Each level adds exactly one new idea while the controls stay identical
 * (left / right between lanes, automatic pickup and delivery). The numbers
 * below are the only thing that changes between levels, so tuning difficulty
 * is editing this table - the GameScene reads it and needs to know nothing
 * about which level it is running.
 *
 * Field meanings
 *   deliveries : houses that must be lit to finish the level
 *   time       : seconds on the clock
 *   star2Time  : finish with at least this many seconds left for the 2nd star
 *                (the 3rd star also needs every bonus item - golden diyas and
 *                 flowers - collected, handled in GameScene)
 *   lanes      : how many lanes the street has (2 = a narrow street)
 *   speed      : how fast the street scrolls, px/second
 *   spawnEvery : seconds between spawns in a lane slot
 *   rain       : diyas in the tray can be blown out - protect them
 *   obstacles  : which obstacle textures can appear
 *   weights    : relative chance of each spawn type
 */

// A gentle baseline every level starts from, then overrides what it changes.
const base = {
    lanes: 3,
    speed: 210,
    spawnEvery: 0.9,
    rain: false,
    obstacles: [],
    weights: { diya: 34, house: 20, coin: 16, flower: 6, golden: 3, obstacle: 0, star: 1, life: 0 }
};

function lvl(over) {
    return {
        ...base,
        ...over,
        weights: { ...base.weights, ...(over.weights || {}) }
    };
}

export const VILLAGE_LEVELS = [
    lvl({
        n: 1, name: "First Light", challenge: "No obstacles",
        deliveries: 4, time: 45, star2Time: 18, speed: 190, spawnEvery: 1.0
    }),
    lvl({
        n: 2, name: "Five Happy Homes", challenge: "More houses",
        deliveries: 5, time: 45, star2Time: 16, speed: 200,
        weights: { house: 26 }
    }),
    lvl({
        n: 3, name: "The Friendly Cow", challenge: "One moving animal",
        deliveries: 5, time: 48, star2Time: 16, speed: 210,
        obstacles: ["obs_dog"], weights: { obstacle: 8 }
    }),
    lvl({
        n: 4, name: "The Flower Lane", challenge: "Collect flowers",
        deliveries: 6, time: 50, star2Time: 18, speed: 215,
        obstacles: ["obs_dog"], weights: { obstacle: 6, flower: 16, golden: 4 }
    }),
    lvl({
        n: 5, name: "Busy Village", challenge: "Moving pedestrians",
        deliveries: 6, time: 52, star2Time: 18, speed: 225,
        obstacles: ["obs_pedestrian", "obs_dog"], weights: { obstacle: 12 }
    }),
    lvl({
        n: 6, name: "The Narrow Path", challenge: "Narrow street",
        deliveries: 7, time: 54, star2Time: 18, speed: 230, lanes: 2,
        obstacles: ["obs_pedestrian"], weights: { obstacle: 12 }
    }),
    lvl({
        n: 7, name: "The Cart Crossing", challenge: "Moving cart",
        deliveries: 7, time: 55, star2Time: 18, speed: 235,
        obstacles: ["obs_cart", "obs_pedestrian"], weights: { obstacle: 13 }
    }),
    lvl({
        n: 8, name: "Save the Diyas", challenge: "Avoid puddles",
        deliveries: 8, time: 58, star2Time: 20, speed: 235, rain: true,
        obstacles: ["obs_puddle", "obs_cart"],
        weights: { obstacle: 14, diya: 40 }
    }),
    lvl({
        n: 9, name: "Golden Diya Hunt", challenge: "Bonus collectibles",
        deliveries: 8, time: 58, star2Time: 20, speed: 235,
        obstacles: ["obs_cart", "obs_dog"],
        weights: { obstacle: 8, golden: 12, flower: 12, coin: 20 }
    }),
    lvl({
        n: 10, name: "Village Grand Finale", challenge: "All challenges",
        deliveries: 10, time: 62, star2Time: 22, speed: 250, rain: true,
        obstacles: ["obs_cart", "obs_pedestrian", "obs_dog", "obs_puddle", "obs_pots"],
        weights: { obstacle: 16, golden: 6, flower: 10 }
    })
];

// Village is the only world with a real table for now. Others fall back to a
// scaled copy so the game never hard-crashes on an unbuilt world during
// testing (the world-select screen keeps them locked in normal play).
export function levelsForWorld(worldId) {
    return VILLAGE_LEVELS;
}

export function getLevel(worldId, index) {
    const list = levelsForWorld(worldId);
    const i = Math.max(0, Math.min(index, list.length - 1));
    return list[i];
}
