// ═══════════════════════════════════════════════════════════════════════
// V2 MEGA-PATCH — Special Island Rendering + Invasion Fixes
// Load AFTER islands.js, combat.js, sketch.js in index.html
// ═══════════════════════════════════════════════════════════════════════

console.log('[V2 MEGAPATCH] Loading special island rendering + invasion fixes...');

// ─── SPECIAL ISLAND RENDERING ──────────────────────────────────────────
// All 4 draw functions were stubbed (return;) — replacing with real rendering

// ═══════════════════════════════════════════════════════════════════════
// VULCAN — Volcanic Fire Island
// ═══════════════════════════════════════════════════════════════════════

drawVulcanIsland = function() {
  let v = state.vulcan;
  if (!v || !v.isleX) return;
  let cx = v.isleX, cy = v.isleY, rx = v.isleRX, ry = v.isleRY;
  let sx = w2sX(cx), sy = w2sY(cy), srx = rx * camZoom, sry = ry * camZoom;
  if (sx < -srx * 2 || sx > width + srx * 2 || sy < -sry * 2 || sy > height + sry * 2) return;

  push();
  // Dark volcanic terrain
  noStroke();
  fill(45, 35, 30);
  ellipse(sx, sy, srx * 2, sry * 2);
  // Scorched inner ring
  fill(55, 40, 32);
  ellipse(sx, sy, srx * 1.7, sry * 1.7);
  // Ashen highlands
  fill(65, 50, 38);
  ellipse(sx - srx * 0.1, sy - sry * 0.15, srx * 1.2, sry * 1.0);
  // Volcanic crater (center-north)
  fill(30, 20, 18);
  ellipse(sx, sy - sry * 0.2, srx * 0.5, sry * 0.35);
  // Magma glow in crater
  let glow = 0.6 + sin(frameCount * 0.04) * 0.3;
  fill(200 * glow, 60 * glow, 20 * glow, 120);
  ellipse(sx, sy - sry * 0.2, srx * 0.3, sry * 0.2);
  // Rocky beach edge
  stroke(70, 55, 40);
  strokeWeight(max(1, 2 * camZoom));
  noFill();
  ellipse(sx, sy, srx * 2.02, sry * 2.02);
  noStroke();

  // Lava pools
  if (v.lavaPools) {
    for (let lp of v.lavaPools) {
      let lpx = w2sX(lp.x), lpy = w2sY(lp.y);
      let pulse = 0.7 + sin(frameCount * 0.06 + lp.x) * 0.3;
      let lr = (lp.r || 15) * camZoom;
      fill(180 * pulse, 40 * pulse, 10, 200);
      ellipse(lpx, lpy, lr * 2, lr * 1.4);
      fill(240 * pulse, 100 * pulse, 20, 150);
      ellipse(lpx, lpy, lr * 1.2, lr * 0.8);
      // Ember particles
      fill(255, 200, 50, 100 + sin(frameCount * 0.1 + lp.y) * 60);
      ellipse(lpx + sin(frameCount * 0.05) * lr * 0.3, lpy - lr * 0.2, 3 * camZoom, 3 * camZoom);
    }
  }

  // Hot springs (blue-green pools)
  if (v.hotSprings) {
    for (let hs of v.hotSprings) {
      let hsx = w2sX(hs.x), hsy = w2sY(hs.y);
      let r = 18 * camZoom;
      fill(40, 90, 80, 180);
      ellipse(hsx, hsy, r * 2, r * 1.4);
      fill(60, 140, 120, 120);
      ellipse(hsx, hsy, r * 1.3, r * 0.9);
      // Steam
      for (let i = 0; i < 3; i++) {
        let soff = sin(frameCount * 0.03 + i * 2) * r * 0.4;
        fill(200, 200, 200, 40 - i * 10);
        ellipse(hsx + soff, hsy - r * 0.5 - i * 4 * camZoom, 6 * camZoom, 4 * camZoom);
      }
    }
  }

  // Obsidian nodes (dark shiny rocks)
  if (v.obsidianNodes) {
    for (let on of v.obsidianNodes) {
      if (on.mined) continue;
      let ox = w2sX(on.x), oy = w2sY(on.y);
      let sz = 8 * camZoom;
      fill(20, 15, 25);
      beginShape();
      vertex(ox - sz, oy + sz * 0.5);
      vertex(ox - sz * 0.3, oy - sz);
      vertex(ox + sz * 0.6, oy - sz * 0.7);
      vertex(ox + sz, oy + sz * 0.3);
      endShape(CLOSE);
      // Shiny reflection
      fill(140, 130, 160, 150 + sin(frameCount * 0.05 + on.x) * 80);
      ellipse(ox, oy - sz * 0.3, sz * 0.5, sz * 0.3);
    }
  }

  // Smoke vents
  if (v.smokeVents) {
    for (let sv of v.smokeVents) {
      let svx = w2sX(sv.x), svy = w2sY(sv.y);
      fill(60, 50, 45);
      ellipse(svx, svy, 6 * camZoom, 4 * camZoom);
      for (let j = 0; j < 4; j++) {
        let yoff = j * 5 * camZoom;
        let xoff = sin(frameCount * 0.02 + j + sv.x) * 8 * camZoom;
        fill(120, 110, 100, 60 - j * 12);
        ellipse(svx + xoff, svy - yoff - 5 * camZoom, (5 + j * 2) * camZoom, (3 + j) * camZoom);
      }
    }
  }

  // Forge altar (center)
  let fx = w2sX(cx), fy = w2sY(cy + ry * 0.1);
  fill(50, 40, 35);
  rect(fx - 12 * camZoom, fy - 8 * camZoom, 24 * camZoom, 16 * camZoom, 2);
  fill(160, 60, 20, 180 + sin(frameCount * 0.08) * 60);
  ellipse(fx, fy - 4 * camZoom, 10 * camZoom, 6 * camZoom);
  fill(220, 180, 80);
  textAlign(CENTER, CENTER);
  textSize(max(7, 9 * camZoom));
  text('[E] Forge', fx, fy + 14 * camZoom);

  pop();
};

drawVulcanEntities = function() {
  let v = state.vulcan;
  if (!v) return;
  // Ambient ash particles
  if (v.ambientAsh) {
    for (let a of v.ambientAsh) {
      let ax = w2sX(a.x), ay = w2sY(a.y);
      let alpha = min(150, a.life);
      fill(140, 120, 100, alpha);
      noStroke();
      ellipse(ax, ay, a.size * camZoom, a.size * camZoom);
    }
  }
};

drawVulcanDistantLabel = function() {
  let v = state.vulcan;
  if (!v || !v.isleX) return;
  let sx = w2sX(v.isleX), sy = w2sY(v.isleY - v.isleRY - 30);
  if (sx < -200 || sx > width + 200) return;
  fill(255, 120, 40, 200);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(max(8, 11 * camZoom));
  text('Isle of Vulcan', sx, sy);
};

drawVulcanHUD = function() {
  if (!state._activeExploration || state._activeExploration !== 'vulcan') return;
  let v = state.vulcan;
  push();
  noStroke();
  fill(0, 0, 0, 150);
  rect(10, 10, 180, 26, 6);
  fill(255, 100, 40);
  textAlign(LEFT, CENTER);
  textSize(12);
  text('Isle of Vulcan', 20, 23);
  fill(180, 160, 140);
  textSize(9);
  text('[E] Interact', 130, 23);
  pop();
};

// ═══════════════════════════════════════════════════════════════════════
// HYPERBOREA — Frozen Island
// ═══════════════════════════════════════════════════════════════════════

drawHyperboreIsland = function() {
  let h = state.hyperborea;
  if (!h || !h.isleX) return;
  let cx = h.isleX, cy = h.isleY, rx = h.isleRX, ry = h.isleRY;
  let sx = w2sX(cx), sy = w2sY(cy), srx = rx * camZoom, sry = ry * camZoom;
  if (sx < -srx * 2 || sx > width + srx * 2 || sy < -sry * 2 || sy > height + sry * 2) return;

  push();
  noStroke();
  // Icy terrain
  fill(200, 215, 230);
  ellipse(sx, sy, srx * 2, sry * 2);
  // Snow inner
  fill(220, 230, 240);
  ellipse(sx, sy, srx * 1.7, sry * 1.7);
  // Frozen lake (center)
  fill(140, 180, 210, 180);
  ellipse(sx + srx * 0.1, sy + sry * 0.1, srx * 0.6, sry * 0.4);
  // Ice cracks on lake
  stroke(160, 200, 230, 120);
  strokeWeight(max(1, camZoom));
  line(sx - srx * 0.15, sy + sry * 0.05, sx + srx * 0.2, sy + sry * 0.15);
  line(sx + srx * 0.05, sy - sry * 0.02, sx + srx * 0.15, sy + sry * 0.12);
  noStroke();

  // Snow drifts
  fill(235, 240, 248);
  ellipse(sx - srx * 0.4, sy - sry * 0.3, srx * 0.5, sry * 0.25);
  ellipse(sx + srx * 0.35, sy - sry * 0.2, srx * 0.4, sry * 0.2);

  // Frozen obelisk
  if (h.frozenObelisk) {
    let ox = w2sX(h.frozenObelisk.x), oy = w2sY(h.frozenObelisk.y);
    let sz = 14 * camZoom;
    // Base
    fill(100, 120, 150);
    rect(ox - sz * 0.6, oy - sz * 0.3, sz * 1.2, sz * 0.6, 2);
    // Pillar
    fill(130, 155, 185);
    beginShape();
    vertex(ox - sz * 0.35, oy - sz * 0.3);
    vertex(ox - sz * 0.15, oy - sz * 2.5);
    vertex(ox + sz * 0.15, oy - sz * 2.5);
    vertex(ox + sz * 0.35, oy - sz * 0.3);
    endShape(CLOSE);
    // Glow
    let glow = 0.5 + sin(frameCount * 0.03) * 0.3;
    fill(100, 180, 255, 60 * glow);
    ellipse(ox, oy - sz * 1.5, sz * 1.5, sz * 2);
    // Label
    fill(140, 200, 255);
    textAlign(CENTER, CENTER);
    textSize(max(7, 9 * camZoom));
    text('[E] Obelisk', ox, oy + 12 * camZoom);
  }

  // Frozen ruins
  if (h.frozenRuins) {
    for (let r of h.frozenRuins) {
      let rx2 = w2sX(r.x), ry2 = w2sY(r.y);
      let sz = 10 * camZoom;
      fill(r.looted ? 90 : 110, r.looted ? 105 : 130, r.looted ? 120 : 155);
      rect(rx2 - sz, ry2 - sz * 0.6, sz * 2, sz * 1.2, 3);
      // Broken walls
      rect(rx2 - sz, ry2 - sz * 1.2, sz * 0.4, sz * 0.8);
      rect(rx2 + sz * 0.6, ry2 - sz * 1.4, sz * 0.4, sz * 1.0);
      if (!r.looted) {
        fill(200, 220, 255, 100 + sin(frameCount * 0.04 + r.x) * 50);
        ellipse(rx2, ry2, sz * 0.8, sz * 0.5);
        fill(180, 210, 240);
        textSize(max(6, 8 * camZoom));
        text('[E]', rx2, ry2 + sz + 4 * camZoom);
      }
    }
  }

  // Frost nodes
  if (h.frostNodes) {
    for (let fn of h.frostNodes) {
      if (fn.mined) continue;
      let fnx = w2sX(fn.x), fny = w2sY(fn.y);
      let sz = 6 * camZoom;
      fill(160, 200, 240);
      beginShape();
      for (let i = 0; i < 6; i++) {
        let a = i * TWO_PI / 6 + frameCount * 0.005;
        vertex(fnx + cos(a) * sz, fny + sin(a) * sz * 0.7);
      }
      endShape(CLOSE);
      fill(200, 230, 255, 180);
      ellipse(fnx, fny, sz * 0.8, sz * 0.5);
    }
  }

  // Penguins
  if (h.penguins) {
    for (let pg of h.penguins) {
      let px2 = w2sX(pg.x), py2 = w2sY(pg.y);
      let sz = 5 * camZoom;
      // Waddle offset
      let wobble = (pg.state === 'waddle') ? sin(frameCount * 0.15 + pg.x) * 2 * camZoom : 0;
      px2 += wobble;
      // Body
      fill(30, 30, 40);
      ellipse(px2, py2, sz * 2, sz * 2.5);
      // Belly
      fill(230, 230, 240);
      ellipse(px2, py2 + sz * 0.3, sz * 1.2, sz * 1.8);
      // Beak
      fill(230, 160, 40);
      triangle(px2 - sz * 0.3, py2 - sz * 0.6, px2 + sz * 0.3, py2 - sz * 0.6, px2, py2 - sz * 0.2);
      // Eyes
      fill(255);
      ellipse(px2 - sz * 0.3, py2 - sz * 0.8, sz * 0.4, sz * 0.4);
      ellipse(px2 + sz * 0.3, py2 - sz * 0.8, sz * 0.4, sz * 0.4);
      fill(0);
      ellipse(px2 - sz * 0.3, py2 - sz * 0.8, sz * 0.2, sz * 0.2);
      ellipse(px2 + sz * 0.3, py2 - sz * 0.8, sz * 0.2, sz * 0.2);
    }
  }

  // Aurora borealis
  if (h.auroraBorealis > 0) {
    let alpha = h.auroraBorealis * 80;
    for (let i = 0; i < 5; i++) {
      let ay = sy - sry - 20 * camZoom - i * 8 * camZoom;
      let wave = sin(frameCount * 0.01 + i * 0.5) * srx * 0.3;
      fill(40 + i * 20, 180 - i * 10, 120 + i * 20, alpha - i * 10);
      ellipse(sx + wave, ay, srx * (1.5 - i * 0.15), 8 * camZoom);
    }
  }

  // Shore edge
  stroke(180, 200, 220);
  strokeWeight(max(1, 2 * camZoom));
  noFill();
  ellipse(sx, sy, srx * 2.02, sry * 2.02);

  pop();
};

drawHyperboreEntities = function() {
  let h = state.hyperborea;
  if (!h) return;
  // Snowflakes
  if (h.snowflakes) {
    noStroke();
    for (let s of h.snowflakes) {
      let sx2 = w2sX(s.x), sy2 = w2sY(s.y);
      let alpha = min(180, s.life);
      fill(240, 245, 255, alpha);
      ellipse(sx2, sy2, s.size * camZoom, s.size * camZoom);
    }
  }
};

drawHyperboreDistantLabel = function() {
  let h = state.hyperborea;
  if (!h || !h.isleX) return;
  let sx = w2sX(h.isleX), sy = w2sY(h.isleY - h.isleRY - 30);
  if (sx < -200 || sx > width + 200) return;
  fill(140, 200, 255, 200);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(max(8, 11 * camZoom));
  text('Hyperborea', sx, sy);
};

drawHyperboreHUD = function() {
  if (!state._activeExploration || state._activeExploration !== 'hyperborea') return;
  push();
  noStroke();
  fill(0, 0, 0, 150);
  rect(10, 10, 180, 26, 6);
  fill(140, 200, 255);
  textAlign(LEFT, CENTER);
  textSize(12);
  text('Hyperborea', 20, 23);
  fill(180, 200, 220);
  textSize(9);
  text('[E] Interact', 130, 23);
  pop();
};

// ═══════════════════════════════════════════════════════════════════════
// ISLE OF PLENTY — Tropical Paradise
// ═══════════════════════════════════════════════════════════════════════

drawPlentyIsland = function() {
  let pl = state.plenty;
  if (!pl || !pl.isleX) return;
  let cx = pl.isleX, cy = pl.isleY, rx = pl.isleRX, ry = pl.isleRY;
  let sx = w2sX(cx), sy = w2sY(cy), srx = rx * camZoom, sry = ry * camZoom;
  if (sx < -srx * 2 || sx > width + srx * 2 || sy < -sry * 2 || sy > height + sry * 2) return;

  push();
  noStroke();
  // Sandy beach
  fill(210, 195, 150);
  ellipse(sx, sy, srx * 2, sry * 2);
  // Lush green interior
  fill(50, 140, 50);
  ellipse(sx, sy, srx * 1.7, sry * 1.7);
  // Dense jungle center
  fill(35, 120, 40);
  ellipse(sx - srx * 0.1, sy - sry * 0.1, srx * 1.2, sry * 1.0);
  // Clearing/meadow
  fill(70, 160, 60);
  ellipse(sx + srx * 0.15, sy + sry * 0.05, srx * 0.5, sry * 0.35);

  // Waterfalls
  if (pl.waterfalls) {
    for (let wf of pl.waterfalls) {
      let wx = w2sX(wf.x), wy = w2sY(wf.y);
      let sz = 10 * camZoom;
      // Rock face
      fill(80, 70, 60);
      rect(wx - sz, wy - sz * 2, sz * 2, sz * 0.8, 3);
      // Water stream
      fill(100, 180, 220, 180);
      rect(wx - sz * 0.3, wy - sz * 1.3, sz * 0.6, sz * 2.5);
      // Splash pool
      fill(80, 160, 200, 140);
      ellipse(wx, wy + sz * 1.2, sz * 1.8, sz * 0.8);
      // Mist
      fill(200, 220, 240, 40 + sin(frameCount * 0.04 + wf.x) * 20);
      ellipse(wx, wy + sz * 0.5, sz * 2.5, sz * 1.5);
    }
  }

  // Fruit trees
  if (pl.fruitTrees) {
    let treeColors = { mango: [200, 160, 40], banana: [230, 210, 50], coconut: [140, 100, 50], fig: [120, 50, 80] };
    for (let t of pl.fruitTrees) {
      let tx = w2sX(t.x), ty = w2sY(t.y);
      let sz = 8 * camZoom;
      // Trunk
      fill(100, 70, 40);
      rect(tx - sz * 0.2, ty - sz * 0.5, sz * 0.4, sz * 2, 1);
      // Canopy
      fill(40, 130, 40);
      ellipse(tx, ty - sz * 1.2, sz * 2, sz * 1.5);
      fill(50, 150, 50);
      ellipse(tx - sz * 0.3, ty - sz * 1.5, sz * 1.2, sz);
      // Fruit (if available)
      if (t.fruit) {
        let fc = treeColors[t.type] || [200, 100, 50];
        fill(fc[0], fc[1], fc[2]);
        ellipse(tx - sz * 0.4, ty - sz, sz * 0.4, sz * 0.4);
        ellipse(tx + sz * 0.3, ty - sz * 0.8, sz * 0.4, sz * 0.4);
        ellipse(tx, ty - sz * 1.4, sz * 0.35, sz * 0.35);
      }
    }
  }

  // Spice nodes
  if (pl.spiceNodes) {
    for (let sn of pl.spiceNodes) {
      if (sn.mined) continue;
      let snx = w2sX(sn.x), sny = w2sY(sn.y);
      let sz = 5 * camZoom;
      fill(180, 100, 40);
      ellipse(snx, sny, sz * 2, sz * 1.5);
      fill(220, 140, 60, 160);
      ellipse(snx, sny - sz * 0.2, sz * 1.2, sz * 0.8);
      // Aroma wisps
      fill(200, 160, 80, 50);
      ellipse(snx + sin(frameCount * 0.03) * sz, sny - sz * 1.5, sz * 0.8, sz * 0.5);
    }
  }

  // Parrots
  if (pl.parrots) {
    for (let pr of pl.parrots) {
      let px2 = w2sX(pr.x), py2 = w2sY(pr.y);
      let sz = 4 * camZoom;
      let wing = sin(frameCount * 0.2 + pr.x) * sz * 0.5;
      // Body
      let colors = [[230, 50, 30], [50, 180, 50], [50, 100, 220], [230, 200, 30], [200, 50, 180]];
      let c = colors[(pr.colorIdx || 0) % colors.length];
      fill(c[0], c[1], c[2]);
      ellipse(px2, py2, sz * 1.5, sz * 2);
      // Wings
      fill(c[0] * 0.7, c[1] * 0.7, c[2] * 0.7);
      ellipse(px2 - sz, py2 + wing, sz * 1.2, sz * 0.6);
      ellipse(px2 + sz, py2 - wing, sz * 1.2, sz * 0.6);
      // Beak
      fill(240, 200, 60);
      triangle(px2 - sz * 0.2, py2 - sz * 0.7, px2 + sz * 0.2, py2 - sz * 0.7, px2, py2 - sz * 1.2);
    }
  }

  // Shore edge
  stroke(180, 170, 140);
  strokeWeight(max(1, 2 * camZoom));
  noFill();
  ellipse(sx, sy, srx * 2.02, sry * 2.02);

  pop();
};

drawPlentyEntities = function() {
  let pl = state.plenty;
  if (!pl) return;
  if (pl.fallingLeaves) {
    noStroke();
    for (let l of pl.fallingLeaves) {
      let lx = w2sX(l.x), ly = w2sY(l.y);
      let alpha = min(140, l.life);
      push();
      translate(lx, ly);
      rotate(l.rot);
      fill(80 + random(40), 160 + random(40), 30, alpha);
      ellipse(0, 0, l.size * camZoom, l.size * 0.5 * camZoom);
      pop();
    }
  }
};

drawPlentyDistantLabel = function() {
  let pl = state.plenty;
  if (!pl || !pl.isleX) return;
  let sx = w2sX(pl.isleX), sy = w2sY(pl.isleY - pl.isleRY - 30);
  if (sx < -200 || sx > width + 200) return;
  fill(80, 200, 60, 200);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(max(8, 11 * camZoom));
  text('Isle of Plenty', sx, sy);
};

drawPlentyHUD = function() {
  if (!state._activeExploration || state._activeExploration !== 'plenty') return;
  push();
  noStroke();
  fill(0, 0, 0, 150);
  rect(10, 10, 180, 26, 6);
  fill(80, 200, 60);
  textAlign(LEFT, CENTER);
  textSize(12);
  text('Isle of Plenty', 20, 23);
  fill(180, 200, 160);
  textSize(9);
  text('[E] Interact', 130, 23);
  pop();
};

// ═══════════════════════════════════════════════════════════════════════
// NECROPOLIS — Death Island
// ═══════════════════════════════════════════════════════════════════════

drawNecropolisIsland = function() {
  let n = state.necropolis;
  if (!n || !n.isleX) return;
  let cx = n.isleX, cy = n.isleY, rx = n.isleRX, ry = n.isleRY;
  let sx = w2sX(cx), sy = w2sY(cy), srx = rx * camZoom, sry = ry * camZoom;
  if (sx < -srx * 2 || sx > width + srx * 2 || sy < -sry * 2 || sy > height + sry * 2) return;

  push();
  noStroke();

  // Dark aura overlay
  let aura = n.darkAura || 0.3;

  // Ashen terrain
  fill(60, 55, 65);
  ellipse(sx, sy, srx * 2, sry * 2);
  // Dead earth
  fill(50, 48, 55);
  ellipse(sx, sy, srx * 1.7, sry * 1.7);
  // Bone yard center
  fill(70, 65, 72);
  ellipse(sx, sy, srx * 0.8, sry * 0.6);

  // Tombs
  if (n.tombs) {
    for (let tomb of n.tombs) {
      let tx = w2sX(tomb.x), ty = w2sY(tomb.y);
      let sz = 12 * camZoom;
      // Stone sarcophagus
      fill(tomb.looted ? 55 : 75, tomb.looted ? 50 : 70, tomb.looted ? 58 : 80);
      rect(tx - sz, ty - sz * 0.4, sz * 2, sz * 0.8, 2);
      // Lid
      fill(tomb.looted ? 65 : 90, tomb.looted ? 60 : 85, tomb.looted ? 68 : 95);
      rect(tx - sz * 1.05, ty - sz * 0.7, sz * 2.1, sz * 0.4, 2);
      if (!tomb.looted) {
        // Glow
        fill(150, 100, 200, 60 + sin(frameCount * 0.04 + tomb.x) * 30);
        ellipse(tx, ty, sz * 1.5, sz);
        fill(180, 160, 220);
        textAlign(CENTER, CENTER);
        textSize(max(6, 8 * camZoom));
        text('[E]', tx, ty + sz + 4 * camZoom);
      }
    }
  }

  // Ghost NPCs
  if (n.ghostNPCs) {
    for (let g of n.ghostNPCs) {
      let gx = w2sX(g.x), gy = w2sY(g.y);
      let sz = 8 * camZoom;
      let bob = sin(frameCount * 0.03 + g.x) * 3 * camZoom;
      // Translucent ghost body
      fill(180, 180, 220, 80);
      ellipse(gx, gy + bob - sz, sz * 1.5, sz * 2);
      // Wispy tail
      fill(160, 160, 200, 50);
      beginShape();
      vertex(gx - sz * 0.5, gy + bob);
      vertex(gx + sz * 0.5, gy + bob);
      vertex(gx + sz * 0.3, gy + bob + sz);
      vertex(gx - sz * 0.1, gy + bob + sz * 0.7);
      vertex(gx - sz * 0.4, gy + bob + sz * 1.1);
      endShape(CLOSE);
      // Eyes
      fill(200, 200, 255, 160);
      ellipse(gx - sz * 0.25, gy + bob - sz * 1.2, sz * 0.3, sz * 0.3);
      ellipse(gx + sz * 0.25, gy + bob - sz * 1.2, sz * 0.3, sz * 0.3);
      // Name
      fill(160, 150, 200, 140);
      textAlign(CENTER, CENTER);
      textSize(max(6, 7 * camZoom));
      text(g.name || 'Ghost', gx, gy + bob - sz * 2.2);
    }
  }

  // Skeletons
  if (n.skeletons) {
    for (let sk of n.skeletons) {
      if (sk.hp <= 0) continue;
      let skx = w2sX(sk.x), sky = w2sY(sk.y);
      let sz = 6 * camZoom;
      let flash = sk.flashTimer > 0;
      // Shadow
      fill(0, 0, 0, 30);
      ellipse(skx, sky + sz, sz * 1.5, sz * 0.5);
      // Bones (body)
      fill(flash ? 255 : 200, flash ? 255 : 190, flash ? 255 : 170);
      rect(skx - sz * 0.3, sky - sz, sz * 0.6, sz * 1.5, 1);
      // Skull
      ellipse(skx, sky - sz * 1.3, sz * 0.9, sz * 0.9);
      // Eye sockets
      fill(30, 10, 10);
      ellipse(skx - sz * 0.15, sky - sz * 1.35, sz * 0.25, sz * 0.3);
      ellipse(skx + sz * 0.15, sky - sz * 1.35, sz * 0.25, sz * 0.3);
      // Weapon (bone club)
      fill(180, 170, 150);
      let wAngle = sk.attackTimer > 30 ? -0.5 : 0.2;
      push();
      translate(skx + sz * 0.5, sky - sz * 0.3);
      rotate(wAngle);
      rect(0, 0, sz * 0.2, sz * 1.2);
      pop();
      // HP bar
      if (sk.hp < (sk.maxHp || 40)) {
        let hpRatio = sk.hp / (sk.maxHp || 40);
        fill(40, 40, 40, 180);
        rect(skx - sz, sky - sz * 2, sz * 2, 3 * camZoom);
        fill(200, 50, 50);
        rect(skx - sz + 1, sky - sz * 2 + 1, (sz * 2 - 2) * hpRatio, 1 * camZoom);
      }
    }
  }

  // Soul nodes
  if (n.soulNodes) {
    for (let sn of n.soulNodes) {
      if (sn.mined) continue;
      let snx = w2sX(sn.x), sny = w2sY(sn.y);
      let sz = 5 * camZoom;
      let pulse = 0.6 + sin(frameCount * 0.05 + sn.x) * 0.4;
      fill(140 * pulse, 80 * pulse, 200 * pulse, 180);
      ellipse(snx, sny, sz * 2, sz * 2);
      fill(180, 120, 240, 100 * pulse);
      ellipse(snx, sny, sz * 3, sz * 3);
    }
  }

  // Shore edge
  stroke(80, 70, 90);
  strokeWeight(max(1, 2 * camZoom));
  noFill();
  ellipse(sx, sy, srx * 2.02, sry * 2.02);

  pop();
};

drawNecropolisEntities = function() {
  let n = state.necropolis;
  if (!n) return;
  // Wisps
  if (n.wisps) {
    noStroke();
    for (let w of n.wisps) {
      let wx = w2sX(w.x), wy = w2sY(w.y);
      let alpha = min(100, w.life * 0.6);
      fill(140, 100, 220, alpha);
      ellipse(wx, wy, w.size * camZoom, w.size * camZoom);
      fill(180, 150, 255, alpha * 0.5);
      ellipse(wx, wy, w.size * 1.5 * camZoom, w.size * 1.5 * camZoom);
    }
  }
  // Dark aura overlay
  if (n.darkAura > 0) {
    noStroke();
    fill(20, 10, 30, n.darkAura * 60);
    let sx = w2sX(n.isleX), sy = w2sY(n.isleY);
    let srx = n.isleRX * camZoom, sry = n.isleRY * camZoom;
    ellipse(sx, sy, srx * 2.5, sry * 2.5);
  }
};

drawNecropolisDistantLabel = function() {
  let n = state.necropolis;
  if (!n || !n.isleX) return;
  let sx = w2sX(n.isleX), sy = w2sY(n.isleY - n.isleRY - 30);
  if (sx < -200 || sx > width + 200) return;
  fill(160, 100, 200, 200);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(max(8, 11 * camZoom));
  text('Necropolis', sx, sy);
};

drawNecropolisHUD = function() {
  if (!state._activeExploration || state._activeExploration !== 'necropolis') return;
  let n = state.necropolis;
  push();
  noStroke();
  fill(0, 0, 0, 150);
  rect(10, 10, 200, 26, 6);
  fill(160, 100, 200);
  textAlign(LEFT, CENTER);
  textSize(12);
  text('Necropolis', 20, 23);
  if (typeof state.soulEssence !== 'undefined') {
    fill(180, 140, 220);
    textSize(9);
    text('Souls: ' + state.soulEssence, 120, 23);
  }
  fill(180, 160, 200);
  textSize(9);
  text('[E] Interact', 170, 23);
  pop();
};


// ═══════════════════════════════════════════════════════════════════════
// INVASION SYSTEM FIXES
// ═══════════════════════════════════════════════════════════════════════

// Patch startInvasion to copy actual unit stats and init templeHP
(function() {
  let _origStartInvasion = startInvasion;
  startInvasion = function(nationKey) {
    let nation = state.nations[nationKey];
    if (!nation || !state.legia || !state.legia.army) return;
    let armySize = state.legia.army.length;
    if (armySize === 0) return;

    // BUGFIX: Ensure islandState and templeHP exist
    if (!nation.islandState) {
      nation.islandState = { templeHP: 100, buildings: [], wood: 0, stone: 0, legia: { army: [] } };
    }
    if (typeof nation.islandState.templeHP === 'undefined' || nation.islandState.templeHP === null) {
      nation.islandState.templeHP = 100;
    }

    let ix = nation.isleX, iy = nation.isleY;
    let ry = (nation.islandState && nation.islandState.islandRY) || nation.isleRY || 260;

    state.invasion = {
      active: true,
      target: nationKey,
      attackers: [],
      defenders: [],
      phase: 'fighting',
    };

    // BUGFIX: Copy actual unit stats instead of hardcoding
    for (let i = 0; i < armySize; i++) {
      let unit = state.legia.army[i] || {};
      state.invasion.attackers.push({
        x: ix + random(-80, 80),
        y: iy + ry * 0.3,
        hp: unit.maxHp || 20,
        maxHp: unit.maxHp || 20,
        damage: unit.damage || 5,
        speed: unit.speed || 1.2,
        type: unit.type || 'legionary',
        state: 'advancing',
        target: null,
        attackTimer: 0,
        swingAnim: 0,
        walkFrame: 0,
      });
    }

    // BUGFIX: Scale defenders based on nation level/military properly
    let botArmy = (nation.islandState && nation.islandState.legia && nation.islandState.legia.army) ? nation.islandState.legia.army : [];
    let mil = nation.military || 3;
    let nationLvl = nation.level || 1;
    let defenderCount = max(3, botArmy.length > 0 ? botArmy.length : mil);
    // Scale defender stats with nation level
    let defHP = 15 + nationLvl * 3;
    let defDmg = 4 + floor(nationLvl * 0.5);
    let defSpd = 1.0 + nationLvl * 0.05;

    for (let i = 0; i < defenderCount; i++) {
      let unit = botArmy[i] || {};
      state.invasion.defenders.push({
        x: ix + random(-60, 60),
        y: iy + random(-40, 40),
        hp: unit.maxHp || defHP,
        maxHp: unit.maxHp || defHP,
        damage: unit.damage || defDmg,
        speed: unit.speed || defSpd,
        type: unit.type || 'legionary',
        state: 'defending',
        target: null,
        attackTimer: 0,
        swingAnim: 0,
        walkFrame: 0,
      });
    }

    addNotification('Invasion of ' + (typeof getNationName === 'function' ? getNationName(nationKey) : nationKey) + ' begins!', '#ff6644');
    console.log('[INVASION] Started against ' + nationKey + ': ' + armySize + ' attackers vs ' + defenderCount + ' defenders, templeHP=' + nation.islandState.templeHP);
  };
})();

// Patch updateInvasion to clean up dead units and fix temple targeting
(function() {
  let _origUpdate = updateInvasion;
  updateInvasion = function(dt) {
    if (!state.invasion || !state.invasion.active) return;
    let inv = state.invasion;

    // BUGFIX: Clean up dead units after fade-out (deathTimer > 80)
    inv.attackers = inv.attackers.filter(a => a.hp > 0 || (a.deathTimer || 0) < 80);
    inv.defenders = inv.defenders.filter(d => d.hp > 0 || (d.deathTimer || 0) < 80);

    // Call original (which has all the combat logic)
    _origUpdate(dt);

    // BUGFIX: After victory, clear invasion state fully
    if (inv.active === false && !state._invasionCleanedUp) {
      state._invasionCleanedUp = true;
      // Allow a few seconds for victory effects, then clean up
      setTimeout(function() {
        if (state.invasion && !state.invasion.active) {
          state.invasion = null;
          state._invasionCleanedUp = false;
        }
      }, 3000);
    }
  };
})();

console.log('[V2 MEGAPATCH] Loaded: 4 special islands rendering + invasion system fixes');
