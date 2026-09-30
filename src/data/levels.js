/**
 * The Village Festival's ten levels.
 *
 * Story flow (all ten levels share it): the boy RUNS and COLLECTS diyas while
 * dodging obstacles and grabbing bonuses - there are NO houses during the run.
 * When the run distance is done, a fixed row of houses appears at the END; each
 * house needs a fixed number of diyas, and the boy delivers the diyas he
 * collected. Light every house to win. Difficulty ramps level to level: more
 * houses, more diyas per house, faster streets and more obstacles.
 *
 * Field meanings
 *   houses       : how many houses wait at the end (all must be lit to win)
 *   diyasPerHouse: diyas each house needs
 *   runTime      : seconds of collecting before the houses appear
 *   time         : total seconds on the clock (run + delivery)
 *   star2Time    : finish with at least this many seconds left for the 2nd star
 *                  (the 3rd star also needs every bonus - golden diyas and
 *                   flowers - collected, handled in GameScene)
 *   lanes        : how many lanes the street has (2 = a narrow street)
 *   speed        : how fast the street scrolls, px/second
 *   spawnEvery   : seconds between collectible spawns during the run
 *   rain         : diyas you are carrying can be blown out - protect them
 *   obstacles    : which obstacle textures can appear during the run
 *   weights      : relative chance of each RUN spawn type (no houses here)
 *
 * diyaGoal (houses * diyasPerHouse) is computed in GameScene; the run always
 * spawns comfortably more diyas than the goal so a careful player can top up.
 */

// A gentle baseline every level starts from, then overrides what it changes.
const base = {
    lanes: 3,
    speed: 210,
    spawnEvery: 0.9,
    runTime: 26,
    rain: false,
    obstacles: [],
    weights: { diya: 48, coin: 16, flower: 6, golden: 3, obstacle: 0, star: 1, life: 0 }
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
        n: 1, name: "First Light", challenge: "Collect diyas, light 3 homes",
        houses: 3, diyasPerHouse: 2, runTime: 22, time: 45, star2Time: 16, speed: 190, spawnEvery: 0.95
    }),
    lvl({
        n: 2, name: "Four Happy Homes", challenge: "Light 4 homes",
        houses: 4, diyasPerHouse: 2, runTime: 24, time: 46, star2Time: 16, speed: 200, spawnEvery: 0.9
    }),
    lvl({
        n: 3, name: "The Friendly Dog", challenge: "One moving animal",
        houses: 4, diyasPerHouse: 2, runTime: 26, time: 48, star2Time: 16, speed: 210, spawnEvery: 0.88,
        obstacles: ["obs_dog"], weights: { obstacle: 8 }
    }),
    lvl({
        n: 4, name: "The Flower Lane", challenge: "Collect flowers too",
        houses: 5, diyasPerHouse: 2, runTime: 28, time: 50, star2Time: 18, speed: 215, spawnEvery: 0.86,
        obstacles: ["obs_dog"], weights: { obstacle: 6, flower: 16, golden: 4 }
    }),
    lvl({
        n: 5, name: "Busy Village", challenge: "Moving pedestrians",
        houses: 5, diyasPerHouse: 3, runTime: 32, time: 54, star2Time: 18, speed: 225, spawnEvery: 0.82,
        obstacles: ["obs_pedestrian", "obs_dog"], weights: { obstacle: 12, diya: 50 }
    }),
    lvl({
        n: 6, name: "The Narrow Path", challenge: "Narrow street",
        houses: 6, diyasPerHouse: 3, runTime: 34, time: 56, star2Time: 18, speed: 230, spawnEvery: 0.82, lanes: 2,
        obstacles: ["obs_pedestrian"], weights: { obstacle: 12, diya: 52 }
    }),
    lvl({
        n: 7, name: "The Cart Crossing", challenge: "Moving carts",
        houses: 6, diyasPerHouse: 3, runTime: 34, time: 57, star2Time: 18, speed: 235, spawnEvery: 0.8,
        obstacles: ["obs_cart", "obs_pedestrian"], weights: { obstacle: 13, diya: 52 }
    }),
    lvl({
        n: 8, name: "Save the Diyas", challenge: "Avoid puddles - they blow out diyas",
        houses: 7, diyasPerHouse: 3, runTime: 38, time: 62, star2Time: 20, speed: 235, spawnEvery: 0.78, rain: true,
        obstacles: ["obs_puddle", "obs_cart"], weights: { obstacle: 14, diya: 54 }
    }),
    lvl({
        n: 9, name: "Golden Diya Hunt", challenge: "Bonus collectibles",
        houses: 8, diyasPerHouse: 3, runTime: 40, time: 64, star2Time: 20, speed: 240, spawnEvery: 0.75,
        obstacles: ["obs_cart", "obs_dog"], weights: { obstacle: 8, golden: 12, flower: 12, coin: 20, diya: 54 }
    }),
    lvl({
        n: 10, name: "Village Grand Finale", challenge: "Light all 10 homes!",
        houses: 10, diyasPerHouse: 3, runTime: 46, time: 72, star2Time: 22, speed: 250, spawnEvery: 0.72, rain: true,
        obstacles: ["obs_cart", "obs_pedestrian", "obs_dog", "obs_puddle", "obs_pots"],
        weights: { obstacle: 16, golden: 6, flower: 10, diya: 56 }
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
