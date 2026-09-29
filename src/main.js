import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "./ui/layout";

import BootScene from "./scenes/BootScene";
import WelcomeScene from "./scenes/WelcomeScene";
import HomeScene from "./scenes/HomeScene";
import WorldSelectScene from "./scenes/WorldSelectScene";
import LevelSelectScene from "./scenes/LevelSelectScene";
import GameScene from "./scenes/GameScene";
import LevelCompleteScene from "./scenes/LevelCompleteScene";

const config = {
    type: Phaser.AUTO,

    width: GAME_WIDTH,
    height: GAME_HEIGHT,

    parent: "game-container",
    backgroundColor: COLORS.nightDeep,

    // The canvas is a fixed portrait size scaled to fit the phone, centred,
    // with letterboxing only on aspect ratios beyond phone range.
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    render: {
        antialias: true,
        roundPixels: false
    },

    physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false }
    },

    scene: [
        BootScene,
        WelcomeScene,
        HomeScene,
        WorldSelectScene,
        LevelSelectScene,
        GameScene,
        LevelCompleteScene
    ]
};

const game = new Phaser.Game(config);
window.__game = game;
