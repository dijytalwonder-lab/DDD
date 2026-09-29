/**
 * The diya art that ships with the game bakes its glow onto an opaque
 * checkerboard, which cannot be keyed out cleanly (the glow is a saturated
 * disc with no closed outline). So the diya - the single most repeated object
 * in the game - is drawn here instead: a warm clay lamp with a teardrop flame
 * and a real soft glow, in the same thick-outline chibi style as the rest of
 * the art. Everything else uses the supplied textures.
 *
 * Creates three textures:
 *   diya       - the lamp itself (bowl + flame), ~104x120
 *   diya_soft  - a radial glow to sit behind it (also used for boosts)
 *   diya_small - a tiny lamp for tray pips / HUD counts
 */

export function makeDiyaTextures(scene) {
    if (!scene.textures.exists("diya")) drawDiya(scene, "diya", 104, 120, 1);
    if (!scene.textures.exists("diya_small")) drawDiya(scene, "diya_small", 48, 56, 0.46);
    if (!scene.textures.exists("diya_soft")) drawGlow(scene, "diya_soft", 200);
}

function drawDiya(scene, key, w, h, s) {
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const cx = w / 2;
    const bowlY = h * 0.72;
    const bowlW = w * 0.86;
    const bowlH = h * 0.34;
    const outline = "#4a2410";

    // --- flame ---------------------------------------------------------
    const fx = cx, fBase = bowlY - bowlH * 0.32, fTop = h * 0.10;
    const flameH = fBase - fTop, flameW = w * 0.20;
    const flame = (scaleW, colOuter, colInner) => {
        ctx.beginPath();
        ctx.moveTo(fx, fBase);
        ctx.bezierCurveTo(fx - flameW * scaleW, fBase - flameH * 0.35,
            fx - flameW * scaleW * 0.7, fTop + flameH * 0.28, fx, fTop);
        ctx.bezierCurveTo(fx + flameW * scaleW * 0.7, fTop + flameH * 0.28,
            fx + flameW * scaleW, fBase - flameH * 0.35, fx, fBase);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, fTop, 0, fBase);
        g.addColorStop(0, colInner);
        g.addColorStop(1, colOuter);
        ctx.fillStyle = g;
        ctx.fill();
    };
    // outer glow of the flame
    ctx.save();
    ctx.shadowColor = "rgba(255,170,40,0.9)";
    ctx.shadowBlur = 22 * s;
    flame(1.0, "#ff7a18", "#ffd24a");
    ctx.restore();
    // inner bright core
    flame(0.5, "#ffd24a", "#fff6d0");

    // --- wick ----------------------------------------------------------
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(fx, fBase - 2 * s);
    ctx.lineTo(fx, bowlY - bowlH * 0.1);
    ctx.stroke();

    // --- bowl ----------------------------------------------------------
    // body (rounded clay bowl - a half ellipse)
    ctx.beginPath();
    ctx.moveTo(cx - bowlW / 2, bowlY);
    ctx.bezierCurveTo(cx - bowlW / 2, bowlY + bowlH,
        cx + bowlW / 2, bowlY + bowlH, cx + bowlW / 2, bowlY);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, bowlY, 0, bowlY + bowlH);
    bg.addColorStop(0, "#d98a4e");
    bg.addColorStop(1, "#a5622e");
    ctx.fillStyle = bg;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5 * s;
    ctx.fill();
    ctx.stroke();

    // rim (the oil top) - an ellipse across the bowl mouth
    ctx.beginPath();
    ctx.ellipse(cx, bowlY, bowlW / 2, bowlH * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#e8a866";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4 * s;
    ctx.fill();
    ctx.stroke();
    // oil sheen
    ctx.beginPath();
    ctx.ellipse(cx, bowlY, bowlW / 2 - 6 * s, bowlH * 0.28 - 5 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#7a3a12";
    ctx.fill();

    // side highlight on the clay
    ctx.beginPath();
    ctx.ellipse(cx - bowlW * 0.24, bowlY + bowlH * 0.4, bowlW * 0.10, bowlH * 0.34, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,225,180,0.5)";
    ctx.fill();

    tex.refresh();
    return key;
}

function drawGlow(scene, key, size) {
    const tex = scene.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, "rgba(255,205,110,0.95)");
    g.addColorStop(0.35, "rgba(255,160,50,0.55)");
    g.addColorStop(1, "rgba(255,140,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
    return key;
}
