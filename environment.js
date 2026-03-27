// MARE NOSTRUM — Sky Birds, Ocean, Seasons, Night Market
// ─── SKY BIRDS ───────────────────────────────────────────────────────────
let skyBirds = null;
function drawSkyBirds() {
  let bright = getSkyBrightness();
  if (bright < 0.2) return;
  // Hide birds during storms, fade them back in during storm_out transition
  if (stormActive) return;
  let birdAlpha = 1;
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_out') {
    birdAlpha = weatherTransition.progress; // birds gradually reappear
  }
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_in') {
    birdAlpha = 1 - weatherTransition.progress; // birds flee
    if (birdAlpha < 0.05) return;
  }
  if (!skyBirds) {
    skyBirds = [];
    for (let i = 0; i < 5; i++) {
      skyBirds.push({
        x: random(width), y: random(height * 0.08, height * 0.35),
        speed: random(0.3, 0.8), wingPhase: random(TWO_PI),
        size: random(3, 6),
      });
    }
  }
  noFill();
  stroke(40, 35, 30, 120 * bright * birdAlpha);
  strokeWeight(1.2);
  skyBirds.forEach(b => {
    b.x += b.speed;
    if (b.x > width + 20) { b.x = -20; b.y = random(height * 0.08, height * 0.35); }
    let wing = sin(frameCount * 0.12 + b.wingPhase) * b.size;
    // V-shaped bird
    line(b.x - b.size, b.y - wing, b.x, b.y);
    line(b.x, b.y, b.x + b.size, b.y - wing);
  });
  noStroke();
}

const _stormCloudData = [
  { x: 0.0, y: 0.06, r: 140, drift: 0.0012 }, { x: 0.12, y: 0.10, r: 130, drift: 0.0008 },
  { x: 0.25, y: 0.05, r: 150, drift: 0.0015 }, { x: 0.35, y: 0.12, r: 120, drift: 0.0010 },
  { x: 0.45, y: 0.07, r: 160, drift: 0.0013 }, { x: 0.55, y: 0.14, r: 135, drift: 0.0009 },
  { x: 0.65, y: 0.06, r: 145, drift: 0.0014 }, { x: 0.75, y: 0.11, r: 130, drift: 0.0011 },
  { x: 0.85, y: 0.08, r: 155, drift: 0.0007 }, { x: 0.95, y: 0.13, r: 125, drift: 0.0016 },
  { x: 0.20, y: 0.20, r: 140, drift: 0.0010 }, { x: 0.50, y: 0.22, r: 150, drift: 0.0012 },
  // Larger foreground clouds that push cloud base down
  { x: 0.10, y: 0.28, r: 200, drift: 0.0006 }, { x: 0.40, y: 0.30, r: 180, drift: 0.0008 },
  { x: 0.70, y: 0.26, r: 210, drift: 0.0005 }, { x: 0.90, y: 0.28, r: 170, drift: 0.0009 },
];
function drawStormClouds() {
  let intensity = stormActive ? 1 : map(stormTimer, 0, 600, 0, 0.5);
  if (intensity < 0.01) return;
  noStroke();
  let t = frameCount;
  _stormCloudData.forEach((c, i) => {
    let drift = c.drift || 0.001;
    let cx = floor(((c.x + t * drift) % 1.3 - 0.15) * width + sin(t * 0.003 + i * 0.8) * 20);
    let cy = floor(c.y * height + sin(t * 0.002 + i * 1.2) * 4);
    let r = c.r;
    let isBig = r >= 170; // foreground clouds
    let baseAlpha = isBig ? 0.85 : 0.7;
    // Dark base shadow (bottom of cloud)
    fill(12, 16, 28, floor(130 * intensity * baseAlpha));
    ellipse(cx, cy + r * 0.12, r * 2.0, r * 0.5);
    // Main cloud body
    fill(30, 38, 58, floor(150 * intensity * baseAlpha));
    ellipse(cx, cy, r * 2.2, r * 0.7);
    // Billowing sub-clouds (left + right lumps)
    fill(35, 42, 62, floor(130 * intensity * baseAlpha));
    ellipse(cx - r * 0.45, cy - r * 0.08, r * 1.3, r * 0.5);
    ellipse(cx + r * 0.4, cy + r * 0.04, r * 1.2, r * 0.45);
    // Highlight on top (lighter gray — volumetric feel)
    fill(55, 62, 82, floor(80 * intensity * baseAlpha));
    ellipse(cx - r * 0.1, cy - r * 0.15, r * 1.4, r * 0.3);
    // Dark underbelly wisp
    fill(15, 20, 35, floor(100 * intensity * baseAlpha));
    ellipse(cx + r * 0.15, cy + r * 0.2, r * 1.6, r * 0.25);
  });
  // Global storm darkening overlay
  if (intensity > 0.3) {
    fill(10, 12, 20, floor(40 * (intensity - 0.3)));
    rect(0, 0, width, height * 0.35);
  }
}

// ─── OCEAN ────────────────────────────────────────────────────────────────
// Full ocean background — the sea surrounds the island on all sides
// Shore fish state
let _shoreFish = null;
function _initShoreFish() {
  _shoreFish = [];
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let srx = getSurfaceRX(), sry = getSurfaceRY();
  let fishColors = [
    { r: 180, g: 195, b: 210 }, // silver
    { r: 210, g: 140, b: 60 },  // orange
    { r: 50, g: 70, b: 120 },   // dark blue
    { r: 140, g: 180, b: 160 }, // pale green
    { r: 195, g: 170, b: 120 }, // sandy gold
  ];
  for (let i = 0; i < 5; i++) {
    let angle = random(0, TWO_PI);
    let dist = 1.08 + random(0, 0.08);
    _shoreFish.push({
      x: cx + cos(angle) * srx * dist,
      y: cy + sin(angle) * sry * dist,
      angle: angle,
      baseAngle: angle,
      swimPhase: random(0, TWO_PI),
      speed: 0.3 + random(0, 0.3),
      col: fishColors[i % fishColors.length],
      scatterTimer: 0,
    });
  }
}

function drawOcean() {
  let bright = getSkyBrightness();
  let dayMix = bright;
  let t = frameCount * 0.012;
  let h = state.time / 60;
  noStroke();
  // Viewport expansion for zoom-out
  let _zpad = (typeof camZoom !== 'undefined' && camZoom < 1) ? 1/camZoom : 1;
  let _vx = width/2 - width*_zpad/2;
  let _vw = width * _zpad;
  let _vr = _vx + _vw;
  let _vb = height/2 + height*_zpad/2;

  let oceanTop = max(height * 0.06, height * 0.25 - horizonOffset);
  let oceanH = max(height, _vb) - oceanTop;

  // Deep ocean gradient — time-of-day tinted
  let tintR = 0, tintG = 0, tintB = 0;
  if (h >= 5 && h < 7) { tintR = 20; tintG = 5; tintB = -10; }
  else if (h >= 16 && h < 19) { tintR = 25; tintG = 8; tintB = -15; }
  else if (h >= 21 || h < 5) { tintR = -5; tintG = -5; tintB = 8; }

  // Biome water tinting — shift ocean color near faction islands
  let _waterTint = null;
  if (typeof FACTION_BIOMES !== 'undefined' && state._activeNation && FACTION_BIOMES[state._activeNation]) {
    _waterTint = FACTION_BIOMES[state._activeNation].waterTint;
  } else if (state.rowing && state.rowing.active && typeof state.nations !== 'undefined') {
    // Find nearest nation for water tint while sailing
    let _nearDist = 999999;
    for (let k in state.nations) {
      let rv = state.nations[k];
      if (!rv || !rv.isleX) continue;
      let dx = state.player.x - rv.isleX, dy = state.player.y - rv.isleY;
      let d = dx*dx + dy*dy;
      if (d < _nearDist && d < 4000*4000) {
        _nearDist = d;
        if (typeof FACTION_BIOMES !== 'undefined' && FACTION_BIOMES[k]) _waterTint = FACTION_BIOMES[k].waterTint;
      }
    }
  }

  // 10-band gradient for smoother deep ocean
  for (let band = 0; band < 10; band++) {
    let y0 = oceanTop + band * oceanH / 10;
    let d = band / 9;
    let r = lerp(lerp(18, 50, dayMix), lerp(8, 22, dayMix), d) + tintR * (1 - d);
    let g = lerp(lerp(40, 140, dayMix), lerp(20, 65, dayMix), d) + tintG * (1 - d);
    let b = lerp(lerp(60, 175, dayMix), lerp(40, 100, dayMix), d) + tintB * (1 - d);
    if (_waterTint) {
      let tintStrength = 0.3;
      r = r * (1-tintStrength) + _waterTint[0] * tintStrength;
      g = g * (1-tintStrength) + _waterTint[1] * tintStrength;
      b = b * (1-tintStrength) + _waterTint[2] * tintStrength;
    }
    fill(max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)));
    rect(_vx, y0, _vw, oceanH / 10 + 2);
  }

  // Subtle horizon line where sea meets sky
  {
    let hLineY = floor(oceanTop);
    let hBright = dayMix;
    fill(lerp(80, 180, hBright), lerp(110, 210, hBright), lerp(140, 235, hBright), 35 + 25 * hBright);
    rect(_vx, hLineY - 1, _vw, 3);
    fill(lerp(120, 220, hBright), lerp(150, 230, hBright), lerp(170, 245, hBright), 20 + 15 * hBright);
    rect(_vx, hLineY, _vw, 1);
    fill(lerp(100, 200, hBright), lerp(130, 215, hBright), lerp(160, 235, hBright), 10 + 8 * hBright);
    rect(_vx, hLineY - 4, _vw, 4);
  }

  // ── DEEP OCEAN WAVES — multi-frequency rolling swells ──
  let _waveRowStep = _fpsSmooth < 40 ? 40 : 22;
  let windStr = (typeof state.weather !== 'undefined' && state.weather.wind) ? state.weather.wind : 0.5;
  for (let wy = oceanTop + 4; wy < _vb; wy += _waveRowStep) {
    let depthNorm = (wy - oceanTop) / oceanH;
    let depthFade = 1 - depthNorm * 0.55;
    let waveAlpha = (30 + 26 * dayMix) * depthFade;

    // Multi-frequency swell — large slow + medium + small fast
    let swell1 = sin(t * 0.3 + wy * 0.018 + depthNorm * 2.5) * (18 + depthNorm * 8); // big slow swell
    let swell2 = sin(t * 0.55 + wy * 0.032 + 1.7) * (8 + depthNorm * 4); // medium
    let swell3 = sin(t * 0.9 + wy * 0.05 + 3.1) * 4; // small chop
    let offsetX = floor(swell1 + swell2 + swell3);

    // Wave crest height affects visual thickness
    let crestPhase = sin(t * 0.35 + wy * 0.025);
    let crestH = 2 + floor(max(0, crestPhase) * 2); // 2-4px tall at crests

    // Primary wave crest — highlight
    let crR = 115 + 75 * dayMix, crG = 170 + 55 * dayMix, crB = 208 + 32 * dayMix;
    fill(crR, crG, crB, waveAlpha);
    let spacing = 55 + floor(depthNorm * 22);
    for (let wx = ((offsetX % spacing) + spacing) % spacing; wx < _vr; wx += spacing) {
      let segW = 22 + floor(sin(wy * 0.065 + wx * 0.035 + t * 0.7) * 12);
      rect(wx, wy, segW, crestH);
    }

    // Wave trough — darker band just below crest
    let trAlpha = waveAlpha * 0.4;
    fill(10 + 22 * dayMix, 28 + 52 * dayMix, 55 + 68 * dayMix, trAlpha);
    for (let wx = ((offsetX + spacing * 0.4) % spacing + spacing) % spacing; wx < _vr; wx += spacing) {
      let tw = 16 + floor(sin(wy * 0.05 + wx * 0.04 + t * 0.5) * 6);
      rect(wx, wy + crestH + 2, tw, 2);
    }

    // Foam caps — white dashes on rising wave faces
    if (depthNorm < 0.55 && dayMix > 0.15) {
      let foamCapAlpha = waveAlpha * 0.65 * (1 - depthNorm * 1.8);
      fill(232, 244, 252, foamCapAlpha);
      for (let wx = ((offsetX + 20) % spacing + spacing) % spacing; wx < _vr; wx += spacing) {
        let capPhase = sin(t * 1.3 + wx * 0.055 + wy * 0.035);
        if (capPhase > 0.25) {
          let cw = 5 + floor(capPhase * 8);
          rect(wx, wy - 1, cw, 1);
          // Spray dots above foam
          if (capPhase > 0.6 && windStr > 0.4) {
            fill(240, 250, 255, foamCapAlpha * 0.5);
            rect(wx + cw + 2, wy - 2, 2, 1);
            if (capPhase > 0.75) rect(wx + cw + 5, wy - 1, 1, 1);
          }
          fill(232, 244, 252, foamCapAlpha); // restore
        }
      }
    }

    // Secondary counter-swell — cross-wave pattern for realism
    if (frameCount % 2 === 0) {
      let off2 = floor(sin(t * 0.4 + wy * 0.042 + 2.2) * 10);
      fill(95 + 52 * dayMix, 155 + 42 * dayMix, 198 + 28 * dayMix, waveAlpha * 0.45);
      let sp2 = 85 + floor(depthNorm * 15);
      for (let wx = ((off2 % sp2) + sp2) % sp2; wx < _vr; wx += sp2) {
        let sw2 = 16 + floor(sin(wy * 0.045 + wx * 0.028 + t * 0.6) * 7);
        rect(wx, wy + 4, sw2, 2);
      }
    }
  }

  // ── ROLLING SWELL BANDS — large visible ocean undulations ──
  if (dayMix > 0.1 && _fpsSmooth > 30) {
    let swellBandCount = 5;
    for (let si = 0; si < swellBandCount; si++) {
      let bandY = oceanTop + oceanH * (0.08 + si * 0.16);
      let swellX = sin(t * 0.2 + si * 1.8) * 30;
      let swellW = 80 + sin(t * 0.15 + si * 2.5) * 30;
      let swellA = 8 * dayMix * (1 - abs(si - 2) / 3);
      // Lighter band (crest of large swell)
      fill(130 + 80 * dayMix, 185 + 45 * dayMix, 220 + 20 * dayMix, swellA);
      for (let wx = 0; wx < _vr; wx += swellW + 40) {
        let bx = wx + swellX + sin(wx * 0.01 + t * 0.3) * 15;
        rect(floor(bx), floor(bandY), floor(swellW), 3);
      }
      // Darker band (trough)
      fill(15 + 18 * dayMix, 35 + 45 * dayMix, 60 + 60 * dayMix, swellA * 0.7);
      for (let wx = swellW * 0.5; wx < _vr; wx += swellW + 40) {
        let bx = wx + swellX + sin(wx * 0.012 + t * 0.35 + 1) * 12;
        rect(floor(bx), floor(bandY + 6), floor(swellW * 0.6), 2);
      }
    }
  }

  // ── MID OCEAN — lighter waves closer to island center ──
  {
    let midTop = oceanTop + oceanH * 0.25;
    let midBot = oceanTop + oceanH * 0.65;
    let midStep = _fpsSmooth < 40 ? 32 : 20;
    for (let wy = midTop; wy < midBot; wy += midStep) {
      let midNorm = (wy - midTop) / (midBot - midTop);
      let midAlpha = 12 * dayMix * (1 - abs(midNorm - 0.5) * 2);
      let midOff = floor(sin(t * 0.7 + wy * 0.04) * 10);
      // Reflection highlight — lighter blue-white bands
      fill(150 + 80 * dayMix, 200 + 40 * dayMix, 230 + 20 * dayMix, midAlpha);
      for (let wx = ((midOff % 80) + 80) % 80; wx < _vr; wx += 80) {
        let sw = 16 + floor(sin(wy * 0.06 + wx * 0.05 + t) * 6);
        rect(wx, wy, sw, 2);
      }
    }
  }

  // Caustic light patterns on shallow water (near island)
  if (dayMix > 0.3) {
    let causticA = (dayMix - 0.3) * 25;
    for (let ci = 0; ci < 5; ci++) {
      let cx = floor(noise(ci * 7.3 + frameCount * 0.004) * width);
      let cy = floor(oceanTop + noise(ci * 11.1 + frameCount * 0.003) * oceanH * 0.4);
      let cSize = 4 + floor(sin(frameCount * 0.06 + ci * 2.1) * 3);
      let cAlpha = causticA * (sin(frameCount * 0.05 + ci * 1.7) * 0.5 + 0.5);
      fill(180 + 60 * dayMix, 220 + 20 * dayMix, 240, cAlpha);
      rect(cx, cy - 1, cSize, 1);
      rect(cx - 1, cy, cSize + 2, 1);
      rect(cx, cy + 1, cSize, 1);
    }
  }

  // ── FOAM WHITECAPS — pixel art foam on wave peaks ──
  if (frameCount % 2 === 0) {
    for (let fy = oceanTop + 12; fy < height; fy += 34) {
      let depthFade = 1 - (fy - oceanTop) / oceanH * 0.5;
      for (let fx = 0; fx < width; fx += 58) {
        let foamPhase = sin(t * 1.2 + fx * 0.05 + fy * 0.06);
        if (foamPhase > 0.4) {
          let foamAlpha = (foamPhase - 0.4) * 70 * depthFade * max(0.3, dayMix);
          fill(225, 238, 248, foamAlpha);
          let fw = floor(6 + foamPhase * 7);
          let foamX = floor(fx + sin(t * 0.8 + fx * 0.03) * 5);
          rect(foamX, fy, fw, 2);
          // Trailing foam spray
          if (foamPhase > 0.55) {
            fill(235, 245, 252, foamAlpha * 0.6);
            rect(foamX + fw + 2, fy + 1, floor(fw * 0.4), 1);
            rect(foamX - 3, fy + 1, 2, 1);
          }
        }
      }
    }
  }

  // Shore foam ring near islands
  if (state.rowing && state.rowing.active && typeof state.nations !== 'undefined') {
    for (let k in state.nations) {
      let rv = state.nations[k];
      if (!rv || !rv.isleX) continue;
      let sx = typeof w2sX === 'function' ? w2sX(rv.isleX) : rv.isleX;
      let sy = typeof w2sY === 'function' ? w2sY(rv.isleY) : rv.isleY;
      let srx = (rv.isleRX || 400) * (typeof camZoom !== 'undefined' ? camZoom : 1);
      let sry = (rv.isleRY || 280) * (typeof camZoom !== 'undefined' ? camZoom : 1);
      if (sx < -srx*2 || sx > width+srx*2 || sy < -sry*2 || sy > height+sry*2) continue;
      // Draw foam dots along ellipse edge
      fill(240, 245, 250, 40 + 20 * dayMix);
      for (let a = 0; a < TWO_PI; a += 0.15) {
        let fx = sx + cos(a + t * 0.3) * srx * 1.15;
        let fy = sy + sin(a + t * 0.3) * sry * 1.15;
        let foamW = 3 + sin(a * 3 + t * 2) * 2;
        if (sin(a * 5 + t * 1.5 + rv.isleX * 0.01) > 0.2) {
          rect(fx, fy, foamW, 2);
        }
      }
    }
  }

  // ── SUN SPARKLES — glittering diamonds on water surface ──
  // More sparkles at midday, fewer at dawn/dusk, none at night
  if (dayMix > 0.35 && _fpsSmooth > 30) {
    let isMidDay = h >= 10 && h <= 14;
    let sparkleCount = isMidDay ? 10 : 6;
    let sparkleAlpha = (dayMix - 0.35) * 2.5;
    if (isMidDay) sparkleAlpha *= 1.4;
    for (let i = 0; i < sparkleCount; i++) {
      let sx2 = floor(noise(i * 10 + frameCount * 0.003) * width);
      let sy2 = floor(oceanTop + noise(i * 20 + frameCount * 0.002) * oceanH * 0.65);
      let sparkle = sin(frameCount * 0.12 + i * 2.3);
      if (sparkle > 0.6) {
        let sa = (sparkle - 0.6) * 450 * sparkleAlpha;
        fill(255, 250, 225, sa);
        // Cross sparkle shape
        rect(sx2, sy2 - 1, 2, 4);
        rect(sx2 - 1, sy2, 4, 2);
        // Extra glint at midday
        if (isMidDay && sparkle > 0.8) {
          fill(255, 255, 240, sa * 0.4);
          rect(sx2 - 1, sy2 - 2, 4, 6);
          rect(sx2 - 2, sy2 - 1, 6, 4);
        }
      }
    }
  }

  // Sun reflection column — stepped horizontal bars
  if (dayMix > 0.3) {
    let sunH = state.time / 60;
    let sunX = floor(map(sunH, 5, 20, width * 0.1, width * 0.9));
    for (let ry = oceanTop + 5; ry < oceanTop + 65; ry += 8) {
      let reflAlpha = 14 * dayMix * (1 - (ry - oceanTop) / 65);
      let rw = floor(18 + sin(ry * 0.12 + t) * 8);
      let rx = sunX + floor(sin(t * 1.5 + ry * 0.04) * 8) - rw / 2;
      fill(255, 225, 130, reflAlpha);
      rect(rx, ry, rw, 2);
      fill(255, 210, 110, reflAlpha * 0.5);
      rect(rx + rw + 2, ry + 1, 3, 1);
      rect(rx - 4, ry + 1, 3, 1);
    }
  }

  // Bioluminescence at night — glowing plankton sparkles
  if (dayMix < 0.3) {
    let bioAlpha = map(dayMix, 0, 0.3, 1, 0);
    for (let bi = 0; bi < 6; bi++) {
      let bx = floor(noise(bi * 13.7 + frameCount * 0.002) * width);
      let by = floor(oceanTop + 15 + noise(bi * 9.3 + frameCount * 0.0015) * (oceanH - 30));
      let pulse = sin(frameCount * 0.04 + bi * 2.3) * 0.5 + 0.5;
      if (pulse > 0.4) {
        let ba = (pulse - 0.4) * 150 * bioAlpha;
        fill(60, 200, 220, ba * 0.3);
        rect(bx - 2, by - 2, 5, 5);
        fill(100, 240, 255, ba);
        rect(bx, by, 2, 2);
        fill(60, 200, 220, ba * 0.15);
        rect(bx - 3, by, 2, 1);
      }
    }
  }

  // ── SHORE FISH — visible colored fish swimming near the coastline ──
  if (dayMix > 0.2 && _fpsSmooth > 25) {
    if (!_shoreFish) _initShoreFish();
    let cx = WORLD.islandCX, cy = WORLD.islandCY;
    let srx = getSurfaceRX(), sry = getSurfaceRY();
    let px = state.player.x, py = state.player.y;
    for (let i = 0; i < _shoreFish.length; i++) {
      let f = _shoreFish[i];
      f.swimPhase += 0.03;
      // Scatter away from player if within 80px
      let dpx = f.x - px, dpy = f.y - py;
      let playerDist = sqrt(dpx * dpx + dpy * dpy);
      if (playerDist < 80 && f.scatterTimer <= 0) {
        f.scatterTimer = 60;
        f.angle += (dpx > 0 ? 0.5 : -0.5);
      }
      if (f.scatterTimer > 0) {
        f.scatterTimer--;
        f.x += cos(f.angle) * f.speed * 2;
        f.y += sin(f.angle) * f.speed * 1.2;
      } else {
        // Gentle circular swimming near base angle
        f.angle = f.baseAngle + sin(f.swimPhase * 0.5) * 0.8;
        let orbitDist = 1.08 + sin(f.swimPhase * 0.3 + i * 1.7) * 0.04;
        let targetX = cx + cos(f.angle) * srx * orbitDist;
        let targetY = cy + sin(f.angle) * sry * orbitDist;
        f.x = lerp(f.x, targetX, 0.04);
        f.y = lerp(f.y, targetY, 0.04);
      }
      // Draw fish at screen coords
      let fsx = w2sX(f.x), fsy = w2sY(f.y);
      let fishDir = f.angle;
      let fdx = cos(fishDir), fdy = sin(fishDir);
      let fishAlpha = 160 * dayMix;
      // Body (4px ellipse)
      fill(f.col.r, f.col.g, f.col.b, fishAlpha);
      rect(floor(fsx - 2), floor(fsy - 1), 4, 2);
      // Tail (2px)
      fill(f.col.r - 20, f.col.g - 20, f.col.b - 10, fishAlpha * 0.8);
      rect(floor(fsx - fdx * 3), floor(fsy - fdy * 2), 2, 2);
      // Eye dot
      fill(20, 20, 30, fishAlpha);
      rect(floor(fsx + fdx * 1.5), floor(fsy), 1, 1);
    }
  }

  // Jumping fish (existing — ocean-wide)
  if (frameCount % 180 === 0) {
    if (_jumpingFish.length < 2) {
      _jumpingFish.push({
        x: random(width * 0.1, width * 0.9),
        y: oceanTop + random(30, oceanH - 30),
        phase: 0, size: random(3, 6),
      });
    }
  }
  {
    noStroke();
    for (let i = _jumpingFish.length - 1; i >= 0; i--) {
      let f = _jumpingFish[i];
      f.phase += 0.08;
      let jumpY = -sin(f.phase) * 18;
      if (f.phase > PI) { _jumpingFish.splice(i, 1); continue; }
      let fy2 = f.y + jumpY;
      let fx2 = floor(f.x), fy3 = floor(fy2);
      // Fish body
      fill(165, 185, 205, 185);
      rect(fx2 - f.size, fy3 - floor(f.size * 0.4), floor(f.size * 2.5), floor(f.size * 0.8));
      // Tail
      fill(150, 172, 195, 180);
      rect(fx2 + floor(f.size * 1.5), fy3 - floor(f.size * 0.5), floor(f.size * 0.8), floor(f.size));
      // Splash at entry/exit
      if (f.phase < 0.5 || f.phase > PI - 0.5) {
        fill(180, 220, 245, 50);
        let splashR = f.phase < 0.5 ? floor((0.5 - f.phase) * 15) : floor((f.phase - PI + 0.5) * 15);
        rect(fx2 - splashR, floor(f.y), splashR * 2, 2);
      }
      // Water droplets during arc
      if (f.phase > 0.3 && f.phase < PI - 0.3) {
        fill(180, 215, 240, 80 * (1 - abs(f.phase - PI / 2) / (PI / 2)));
        for (let di = 0; di < 2; di++) {
          let dx = floor(fx2 + sin(f.phase * 3 + di * 2.1) * f.size);
          let dy = floor(fy3 + cos(f.phase * 2 + di * 3.7) * f.size * 0.5);
          rect(dx, dy, 1, 1);
        }
      }
    }
  }
}
// Ambient ships — see sailing.js

function drawShoreWaves() {
  if (frameCount % 2 !== 0) return;
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);
  let iw = state.islandRX * 2;
  let ih = state.islandRY * 2;
  let t = frameCount * 0.015;
  let bright = getSkyBrightness();
  let dayMix = max(0.3, bright);

  noStroke();
  // Animated sine-based shoreline — foam crests roll in and out
  // Uses coastline verts so waves follow the same organic shape as shallow water layers
  for (let a = 0; a < TWO_PI; a += 0.045) {
    let coastR = _getCoastlineRadiusAtAngle(a, iw * 0.56, ih * 0.25);
    // yOffset attenuation at east/west to match drawCoastlineShape fix
    let yOff = -10 * abs(sin(a));
    // Multi-frequency wave for organic shoreline movement
    let wave1 = sin(t * 2.5 + a * 6);
    let wave2 = sin(t * 1.8 + a * 3.5 + 1.2) * 0.5;
    let wave3 = sin(t * 3.5 + a * 9) * 0.25;
    let wavePhase = wave1 + wave2 + wave3;
    let waveOff = floor(wavePhase * 4 + 3);
    let ex = floor(ix + cos(a) * (coastR.rx + waveOff));
    let ey = floor((iy + yOff) + sin(a) * (coastR.ry + waveOff * 0.4));
    let foamA = (70 + sin(t * 1.2 + a * 4) * 28) * dayMix;
    // Pixel foam — animated horizontal rects
    fill(225, 242, 255, foamA);
    let fw = floor(8 + sin(t * 1.8 + a * 3) * 4);
    rect(ex - fw / 2, ey, fw, 2);
    // Bright crest pixel
    if (wavePhase > 0.4) {
      fill(252, 255, 255, (wavePhase - 0.4) * 120 * dayMix);
      rect(ex - 2, ey, 5, 1);
    }
    // Foam spray — tiny pixel dots above crest
    if (wavePhase > 0.8 && random() < 0.15) {
      fill(240, 250, 255, foamA * 0.6);
      rect(ex + floor(random(-4, 4)), ey - 2, 1, 1);
    }
  }
  // Inner pixel foam — beach-to-shallow transition
  // Uses coastline-aware radii to match island layers
  for (let a = 0; a < TWO_PI; a += 0.08) {
    let wavePhase = sin(t * 3.0 + a * 4 + 1.5);
    if (wavePhase > 0.35) {
      let beachR = _getCoastlineRadiusAtAngle(a, iw * 0.48, ih * 0.205);
      let grassR = _getCoastlineRadiusAtAngle(a, iw * 0.45, ih * 0.18);
      let beachYOff = -14 * abs(sin(a));
      let grassYOff = -18 * abs(sin(a));
      let waveOff = floor((wavePhase - 0.35) * 3);
      let ex = floor(ix + cos(a) * (beachR.rx + waveOff));
      let ey = floor((iy + beachYOff) + sin(a) * (beachR.ry + waveOff * 0.4));
      // Check against grass boundary (coastline-aware)
      let gx2 = (ex - ix) / grassR.rx;
      let gy2 = (ey - (iy + grassYOff)) / grassR.ry;
      if (gx2 * gx2 + gy2 * gy2 < 1.0) continue;
      fill(232, 248, 255, (wavePhase - 0.35) * 95 * dayMix);
      rect(ex - 3, ey, 6, 2);
    }
  }
}

// ─── SEASONS ─────────────────────────────────────────────────────────────
function getSeason() {
  // 10 days per season: Spring(0), Summer(1), Autumn(2), Winter(3)
  return floor((state.day % 40) / 10);
}

function getSeasonName() {
  return ['VER (Spring)', 'AESTAS (Summer)', 'AUTUMNUS (Autumn)', 'HIEMS (Winter)'][getSeason()];
}


// ─── NIGHT MARKET ────────────────────────────────────────────────────────
const MARKET_ITEMS = [
  { name: 'Golden Seeds (x5)', cost: { meals: 3 }, reward: 'seeds', qty: 5, desc: '5 premium seeds' },
  { name: 'Grape Seeds (x3)', cost: { meals: 2 }, reward: 'grapeSeeds', qty: 3, desc: '3 grape seeds' },
  { name: 'Olive Seeds (x3)', cost: { meals: 2 }, reward: 'oliveSeeds', qty: 3, desc: '3 olive seeds' },
  { name: 'Crystal Shard', cost: { wine: 1 }, reward: 'crystals', qty: 3, desc: '3 crystals' },
  { name: 'Stone Block (x10)', cost: { meals: 2 }, reward: 'stone', qty: 10, desc: '10 stone' },
  { name: 'Blessing Token', cost: { wine: 2 }, reward: 'blessing', qty: 1, desc: 'Random blessing' },
  { name: 'Cat Treat', cost: { meals: 1, oil: 1 }, reward: 'catTreat', qty: 1, desc: 'Befriend a cat instantly' },
  { name: 'Gold Pouch', cost: { wine: 1 }, reward: 'gold', qty: 15, desc: '15 gold' },
];

function openNightMarket() {
  // Stock 4 random items each time
  let shuffled = [...MARKET_ITEMS].sort(() => random() - 0.5);
  state.nightMarket.stock = shuffled.slice(0, 4);
  state.nightMarket.active = true;
  state.nightMarket.shopOpen = false;
  unlockJournal('night_market');
  addFloatingText(width / 2, height * 0.20, 'The Night Market has arrived!', '#ffaa44');
  addFloatingText(width / 2, height * 0.26, 'Find the merchant to browse rare wares.', '#cc8833');
  addNotification('Night Market open until midnight!', '#ffaa44');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('fanfare');
  let mp = getMarketPosition();
  spawnParticles(mp.x, mp.y, 'divine', 20);
  state.screenFlash = { r: 255, g: 180, b: 50, alpha: 40, timer: 30 };
}

function canAffordMarketItem(item) {
  for (let [res, amt] of Object.entries(item.cost)) {
    if ((state[res] || 0) < amt) return false;
  }
  return true;
}

function buyMarketItem(idx) {
  let item = state.nightMarket.stock[idx];
  if (!item || !canAffordMarketItem(item)) return;
  // Pay cost
  for (let [res, amt] of Object.entries(item.cost)) {
    state[res] -= amt;
  }
  // Give reward
  if (item.reward === 'blessing') {
    let types = ['crops', 'solar', 'speed', 'luck'];
    state.blessing = { type: types[floor(random(types.length))], timer: 720 };
    if (snd) snd.playSFX('ding');
    addFloatingText(width / 2, height * 0.3, 'Blessed!', '#ffcc44');
  } else if (item.reward === 'catTreat') {
    let wild = state.cats.find(c => !c.adopted);
    if (wild) { wild.adopted = true; wild.bondStage = 4; wild.bondDay = state.day; }
    addFloatingText(width / 2, height * 0.3, 'Cat befriended!', '#ffaa88');
  } else {
    state[item.reward] = (state[item.reward] || 0) + item.qty;
    addFloatingText(width / 2, height * 0.3, '+' + item.qty + ' ' + item.reward, '#ffcc44');
  }
  // Remove from stock
  state.nightMarket.stock[idx] = null;
  spawnParticles(state.player.x, state.player.y, 'harvest', 8);
}

function getMarketPosition() {
  return { x: WORLD.islandCX + 100, y: WORLD.islandCY + getSurfaceRY() * 0.55 };
}

function drawNightMarket() {
  if (!state.nightMarket.active) return;
  let mp = getMarketPosition();
  let sx = w2sX(mp.x), sy = w2sY(mp.y);

  push();
  translate(sx, sy);

  // Market stall — wooden frame with fabric canopy
  noStroke();
  // Posts
  fill(100, 70, 35);
  rect(-25, -30, 4, 35);
  rect(21, -30, 4, 35);
  // Counter
  fill(120, 85, 45);
  rect(-27, -2, 54, 8, 2);
  fill(140, 100, 55);
  rect(-27, -2, 54, 3, 2, 2, 0, 0);
  // Canopy — pixel rect
  fill(180, 50, 30, 200);
  rect(-32, -32, 64, 8);
  fill(200, 60, 35, 200);
  rect(-30, -32, 60, 4);
  // Hanging lanterns — pixel
  let glow = sin(frameCount * 0.04) * 0.3 + 0.7;
  fill(255, 180, 50, glow * 200);
  rect(-18, -24, 6, 7);
  rect(12, -24, 6, 7);
  fill(255, 220, 100, glow * 150);
  rect(-17, -23, 4, 4);
  rect(13, -23, 4, 4);

  // Wares on counter — pixel
  fill(200, 180, 60);
  rect(-14, -6, 5, 3);
  fill(140, 60, 140);
  rect(-2, -6, 4, 3);
  fill(80, 180, 80);
  rect(10, -6, 4, 3);

  // Merchant NPC — pixel hooded figure
  fill(60, 40, 80);
  rect(-7, -24, 14, 14);
  fill(50, 30, 70);
  rect(-8, -28, 16, 6);
  // Face
  fill(210, 180, 140);
  rect(-3, -20, 6, 5);
  // Eyes
  fill(40);
  rect(-2, -19, 1, 1);
  rect(1, -19, 1, 1);

  pop();

  // Interaction prompt
  let pd = dist(state.player.x, state.player.y, mp.x, mp.y);
  if (pd < 60) {
    fill(255, 255, 255, 200);
    textAlign(CENTER, CENTER);
    textSize(10);
    text('[E] Browse Market', sx, sy - 42);
  }
}

function drawMarketUI() {
  if (!state.nightMarket.shopOpen) return;
  let panW = min(310, width - 20), panH = min(230, height - 20);
  let panX = max(10, width / 2 - panW / 2);
  let panY = max(10, height / 2 - panH / 2 - 10);

  // Backdrop
  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, panW, panH);

  // Title
  fill(200, 170, 90);
  textAlign(CENTER, TOP);
  textSize(14);
  text('FORUM NOCTIS', width / 2, panY + 12);
  fill(160, 140, 100);
  textSize(11);
  text('Night Market — Trade meals & wine for rare goods', width / 2, panY + 30);
  // Decorative line
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(panX + 20, panY + 42, panX + panW - 20, panY + 42);
  noStroke();

  // Items
  textAlign(LEFT, TOP);
  state.nightMarket.stock.forEach((item, i) => {
    if (!item) return;
    let oy = panY + 50 + i * 40;
    let affordable = canAffordMarketItem(item);

    // Row bg
    fill(affordable ? color(60, 50, 35, 150) : color(40, 30, 25, 100));
    rect(panX + 12, oy, panW - 24, 34, 3);
    // Left accent bar
    fill(affordable ? color(180, 150, 60) : color(80, 60, 40));
    rect(panX + 12, oy, 3, 34, 3, 0, 0, 3);

    // Name
    fill(affordable ? color(220, 200, 150) : color(100, 85, 65));
    textSize(10);
    text(item.name, panX + 22, oy + 5);

    // Cost
    let costStr = Object.entries(item.cost).map(([k, v]) => v + ' ' + k).join(' + ');
    fill(affordable ? color(160, 140, 110) : color(80, 70, 55));
    textSize(10);
    text('Cost: ' + costStr, panX + 22, oy + 20);

    // Click hint
    if (affordable) {
      fill(180, 150, 60);
      textAlign(RIGHT, TOP);
      textSize(11);
      text('CLICK', panX + panW - 18, oy + 12);
      textAlign(LEFT, TOP);
    }
  });

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(11);
  text('[ESC] Close', width / 2, panY + panH - 16);
  textAlign(LEFT, TOP);
  rectMode(CORNER);
}
