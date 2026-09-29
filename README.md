# Diwali Delivery Dash 🪔

A short-session, level-based 2D festival delivery game. Carry a tray of glowing
diyas up a village street, collect diyas, deliver them to houses to light them
up, grab bonus items, dodge obstacles, and finish before the timer runs out.

Built with **Phaser 3 + Vite**, portrait mobile (540×960), ready to wrap as an
Android app with **Capacitor**.

## Play it

```bash
npm install
npm run dev
```

Open the printed URL (http://localhost:5173) on a phone or in a browser at
phone size.

Controls are **left / right only**:

- Tap the left or right half of the screen, **or** swipe left/right, **or** use
  the on-screen arrow buttons (arrow keys / A,D on desktop).
- Pickup and delivery are **automatic** — walk over a diya to grab it, pass a
  house while carrying a diya to light it.

## The game

- **World 1 — Village Festival**, 10 levels, each introducing one new challenge
  (from `First Light` with no obstacles to the `Village Grand Finale`).
- **3-star scoring** per level: ⭐ deliver all diyas · ⭐⭐ beat the time target ·
  ⭐⭐⭐ also collect every bonus item (golden diyas + flowers).
- **Collectibles:** 🪙 coins (currency) · 🪔 golden diya (bonus) · 🌸 flowers ·
  ✨ festival star (speed boost) · ❤️ extra life (one-hit shield).
- **Obstacles:** friendly dog, pedestrians, moving cart, clay pots, and — on the
  rain levels — puddles that put out your diyas.
- 9 more festival worlds are laid out on the world map, locked as "coming soon";
  each just needs a level table + art (gameplay is identical).

Progress (stars + coins) is saved in `localStorage`.

## Project layout

```
src/
  main.js                 Phaser bootstrap + scene list
  data/
    assets.js             texture manifest (files + sprite-sheet grids)
    worlds.js             the 10 festival worlds
    levels.js             the Village Festival's 10 levels (all tuning lives here)
  managers/
    SaveManager.js        stars / coins / settings in localStorage
    AudioManager.js       synthesised sound effects (no audio files needed)
  art/
    road.js               builds the tileable scrolling street texture
    diya.js               draws the diya lamp + glow in code
  ui/
    layout.js             logical size, lanes, palette
    widgets.js            shared buttons / panels / stars / background
  scenes/
    BootScene.js          preload + build animations
    HomeScene.js          title screen
    WorldSelectScene.js   the 10-world map
    LevelSelectScene.js   the level grid with stars
    GameScene.js          the actual gameplay
    LevelCompleteScene.js results / star reveal
tools/
  optimize_assets.py      turns the raw art in Assets/ into public/assets/
```

## Art pipeline

The source art in `Assets/` is large (~70 MB) and was exported over an opaque
**checkerboard** "transparency" background. `tools/optimize_assets.py`:

1. keys the checkerboard out to real transparency (border flood-fill so interior
   whites like eyes survive),
2. resizes every piece to roughly twice its on-screen size, and
3. writes optimised PNGs to `public/assets/` (~70 MB → ~4.7 MB).

Re-run it whenever the source art changes:

```bash
python tools/optimize_assets.py
```

The diya lamps are **drawn in code** (`src/art/diya.js`) because the supplied
diya art bakes its glow onto the checkerboard and can't be keyed cleanly.

## Android build (later)

```bash
npm run build
npx cap add android
npx cap sync
# then open android/ in Android Studio (or gradlew assembleRelease)
```

`capacitor.config.json` is already set up (`com.dijytal.diwalideliverydash`).
