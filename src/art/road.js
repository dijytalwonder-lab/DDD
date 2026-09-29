/**
 * Builds a tileable "street" texture at runtime so the road can scroll
 * seamlessly under the gameplay. In landscape the street is a horizontal band
 * that scrolls to the LEFT while the player runs to the right, so the tile is
 * framed with cobbled top and bottom edges and repeats along its width.
 *
 * Drawing it in code keeps the download small and lets each world recolour the
 * street by passing different dirt colours.
 */

export function makeRoadTexture(scene, key = "road_tile", opts = {}) {
    if (scene.textures.exists(key)) return key;

    const w = 512;            // tiles horizontally
    const h = opts.height || 340;
    const dirtTop = opts.dirtTop || "#c98a4a";
    const dirtBot = opts.dirtBot || "#b6753a";
    const edge = opts.edge || "#8a6a52";
    const edgeStone = opts.edgeStone || "#a89078";

    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();

    // dirt gradient (lighter near the middle of the road)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, dirtBot);
    grad.addColorStop(0.5, dirtTop);
    grad.addColorStop(1, dirtBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // speckles
    for (let i = 0; i < 220; i++) {
        const x = (i * 71) % w;
        const y = (i * 53) % h;
        const r = 1 + (i % 3);
        ctx.fillStyle = i % 2 ? "rgba(120,80,40,0.18)" : "rgba(255,220,160,0.14)";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // cobbled top & bottom borders
    const borderH = 40;
    const drawBorder = (y0) => {
        ctx.fillStyle = edge;
        ctx.fillRect(0, y0, w, borderH);
        ctx.fillStyle = edgeStone;
        for (let x = -8; x < w; x += 34) {
            for (let by = 0; by < borderH - 8; by += 24) {
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(x + 4, y0 + by + 4, 26, 16, 5);
                    ctx.fill();
                } else {
                    ctx.fillRect(x + 4, y0 + by + 4, 26, 16);
                }
            }
        }
    };
    drawBorder(0);
    drawBorder(h - borderH);

    // faint dashed centre line down the middle of the road
    ctx.fillStyle = "rgba(255,240,200,0.10)";
    for (let x = 0; x < w; x += 64) {
        ctx.fillRect(x, h / 2 - 4, 34, 8);
    }

    tex.refresh();
    return key;
}
