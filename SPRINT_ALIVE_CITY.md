# SPRINT: Alive City — Bigger Landmarks + Life Signals
**Target file**: `sketch.js` only
**Agent**: One sequential agent
**Goal**: Make landmark buildings BIGGER and more impressive. Make the city feel ALIVE.

---

## PART 1 — BLUEPRINT SIZE UPDATES

In `sketch.js`, find the `const BLUEPRINTS = {` block (line ~430).

Update these five entries' `w` and `h` values:

```js
// BEFORE:
bath:    { name: 'Balneum', w: 58, h: 44, ... }
library: { name: 'Biblioth', w: 58, h: 44, ... }
arena:   { name: 'Arena',    w: 68, h: 54, ... }
castrum: { name: 'Castrum',  w: 64, h: 50, ... }
watchtower:{ name: 'Tower',  w: 20, h: 44, ... }

// AFTER:
bath:    { name: 'Balneum', w: 70, h: 52, ... }
library: { name: 'Biblioth', w: 72, h: 52, ... }
arena:   { name: 'Arena',    w: 84, h: 64, ... }
castrum: { name: 'Castrum',  w: 80, h: 60, ... }
watchtower:{ name: 'Tower',  w: 24, h: 56, ... }
```

Keep all other fields (cost, key, blocks, minLevel) unchanged.

---

## PART 2 — CITY_SLOTS SIZE SYNC

In `sketch.js`, find the `const CITY_SLOTS = [` block (line ~254).

Update these CITY_SLOT entries' `w` and `h` to match the new BLUEPRINTS sizes. Match by `id` field:

- `id: 'bath_1'` — change `w: 58, h: 44` to `w: 70, h: 52`
- `id: 'bath_2'` — change `w: 58, h: 44` to `w: 70, h: 52`
- `id: 'castrum'` — change `w: 64, h: 50` to `w: 80, h: 60`
- `id: 'library'` — change `w: 58, h: 44` to `w: 72, h: 52`
- `id: 'arena'` — change `w: 68, h: 54` to `w: 84, h: 64`
- `id: 'watchtower_cast'` — change `w: 20, h: 44` to `w: 24, h: 56`
- `id: 'watchtower_far'` — change `w: 20, h: 44` to `w: 24, h: 56`

Also add a save migration in `loadState()`. Find the line in `loadState()` where buildings are loaded from localStorage (search for `"state.buildings"` or `"b.type"` in the load block). After buildings are restored, add:

```js
// Normalize building sizes to current BLUEPRINTS on load
if (state.buildings) {
  state.buildings.forEach(b => {
    if (BLUEPRINTS[b.type]) {
      b.w = BLUEPRINTS[b.type].w;
      b.h = BLUEPRINTS[b.type].h;
    }
  });
}
```

---

## PART 3 — ENHANCED drawOneBuilding RENDERING

All changes are inside the `switch (b.type)` in `function drawOneBuilding(b)`.

### 3A: case 'castrum' — Complete rewrite

Replace the entire `case 'castrum':` block (from `case 'castrum':` to `break;`) with:

```js
      case 'castrum':
        // Roman military fortress — imposing stone walls with crenellations
        noStroke();
        // Ground shadow
        fill(0, 0, 0, 35);
        rect(-bw / 2 + 3, bh / 2 - 3, bw, 7);
        // Outer stone wall (darker, fortress weight)
        fill(125, 112, 92);
        rect(-bw / 2, -bh / 2, bw, bh, 2);
        // Stone block variation — ashlar courses
        stroke(108, 96, 78, 55);
        strokeWeight(0.7);
        for (let cy2 = -bh / 2 + 6; cy2 < bh / 2; cy2 += 7) {
          line(-bw / 2 + 1, cy2, bw / 2 - 1, cy2);
          let coff = (floor((cy2 + bh / 2) / 7) % 2) * 9;
          for (let cx2 = -bw / 2 + coff + 5; cx2 < bw / 2 - 2; cx2 += 16) {
            line(cx2, cy2, cx2, cy2 + 7);
          }
        }
        noStroke();
        // Interior parade ground — packed earth
        fill(155, 138, 112);
        rect(-bw / 2 + 8, -bh / 2 + 8, bw - 16, bh - 16);
        // Parade ground texture — subtle
        fill(148, 132, 108, 60);
        for (let pi2 = 0; pi2 < 5; pi2++) {
          rect(-bw / 2 + 12 + pi2 * 11, -bh / 2 + 14, 8, 3);
        }
        // Corner towers — thicker and taller
        fill(112, 100, 82);
        rect(-bw / 2, -bh / 2, 13, 14);
        rect(bw / 2 - 13, -bh / 2, 13, 14);
        rect(-bw / 2, bh / 2 - 14, 13, 14);
        rect(bw / 2 - 13, bh / 2 - 14, 13, 14);
        // Tower cap highlights
        fill(128, 116, 96);
        rect(-bw / 2, -bh / 2, 13, 3);
        rect(bw / 2 - 13, -bh / 2, 13, 3);
        // Wall crenellations (merlons) — top wall
        fill(132, 120, 100);
        for (let mi = 0; mi < 7; mi++) {
          let mx2 = -bw / 2 + 14 + mi * (bw - 28) / 6;
          rect(mx2, -bh / 2 - 5, 6, 7, 1);
        }
        // Wall crenellations — bottom wall
        for (let mi = 0; mi < 7; mi++) {
          let mx2 = -bw / 2 + 14 + mi * (bw - 28) / 6;
          rect(mx2, bh / 2 - 2, 6, 7, 1);
        }
        // Gate archway (south) — iron portcullis feel
        fill(45, 35, 22);
        rect(-10, bh / 2 - 14, 20, 14, 1);
        // Portcullis bars
        stroke(30, 24, 14, 200);
        strokeWeight(1.2);
        for (let gi2 = -8; gi2 <= 8; gi2 += 4) {
          line(gi2, bh / 2 - 13, gi2, bh / 2 - 2);
        }
        line(-10, bh / 2 - 8, 10, bh / 2 - 8);
        noStroke();
        // Gate arch top
        fill(112, 100, 82);
        arc(0, bh / 2 - 14, 20, 10, PI, TWO_PI);
        // Red legion banner — animated wave
        let castFlap = sin(frameCount * 0.04 + b.x * 0.01) * 2;
        fill(100, 75, 42);
        rect(-1.5, -bh / 2 - 14, 3, 18);   // pole
        fill(185, 28, 28);
        beginShape();
        vertex(0, -bh / 2 - 13);
        vertex(12 + castFlap, -bh / 2 - 10);
        vertex(11 + castFlap * 0.6, -bh / 2 - 5);
        vertex(0, -bh / 2 - 4);
        endShape(CLOSE);
        // Eagle sigil on banner
        fill(220, 195, 60, 200);
        circle(6 + castFlap * 0.4, -bh / 2 - 8, 4);
        fill(185, 28, 28, 0);
        // Military cooking smoke (darker, greyer than residential)
        {
          let castSmokeAlpha = map(getSkyBrightness(), 0.0, 0.6, 65, 18);
          for (let si2 = 0; si2 < 2; si2++) {
            let sPhase = frameCount * 0.012 + si2 * 3.1 + b.x * 0.008;
            for (let sp = 0; sp < 4; sp++) {
              let sFrac = sp / 3;
              let sx2 = -bw / 4 + si2 * (bw / 2.5) + floor(sin(sPhase + sp * 0.8) * (2 + sp));
              let sy2 = -bh / 2 - 4 - floor(sp * 7 + (frameCount * 0.6 + si2 * 25) % 28);
              let sa = castSmokeAlpha * (1 - sFrac * 0.75);
              fill(120, 115, 108, sa);  // darker grey than house smoke
              noStroke();
              rect(sx2, sy2, 2, 2);
            }
          }
        }
        // Night: window glow from barracks
        if (getSkyBrightness() < 0.35) {
          let nightStr = map(getSkyBrightness(), 0, 0.35, 1, 0);
          fill(255, 185, 80, 55 * nightStr);
          rect(-bw / 2 + 14, -bh / 2 + 14, 10, 7);
          rect(bw / 2 - 24, -bh / 2 + 14, 10, 7);
          fill(255, 170, 60, 20 * nightStr);
          ellipse(0, -bh / 2 + 22, 20, 12);
        }
        break;
```

### 3B: case 'library' — Complete rewrite

Replace the entire `case 'library': {` block (from `case 'library': {` to `break;\n      }`) with:

```js
      case 'library': {
        noStroke();
        // Shadow
        fill(0, 0, 0, 28);
        rect(-bw / 2 + 3, bh / 2 - 3, bw, 6);
        // Main body — warm marble
        fill(205, 198, 180);
        rect(-bw / 2, -bh / 2 + 10, bw, bh - 10, 1);
        // Stone course lines
        stroke(185, 178, 162, 50);
        strokeWeight(0.5);
        for (let ly2 = -bh / 2 + 16; ly2 < bh / 2; ly2 += 6) {
          line(-bw / 2 + 1, ly2, bw / 2 - 1, ly2);
        }
        noStroke();
        // Scroll niches — 6 arched recesses along facade
        for (let lni = 0; lni < 6; lni++) {
          let lnx = -bw / 2 + 8 + lni * ((bw - 16) / 5);
          // Niche recess
          fill(65, 52, 35, 180);
          rect(lnx - 1, -bh / 2 + 14, 7, 12, 1);
          // Niche arch top
          fill(75, 60, 42, 160);
          arc(lnx + 2.5, -bh / 2 + 14, 7, 6, PI, TWO_PI);
          // Scroll silhouette inside niche
          fill(195, 178, 142);
          rect(lnx + 0.5, -bh / 2 + 17, 6, 7, 1);
          // Scroll end caps (papyrus yellow)
          fill(215, 195, 148);
          rect(lnx, -bh / 2 + 17, 1.5, 7);
          rect(lnx + 5, -bh / 2 + 17, 1.5, 7);
        }
        // 4 entrance columns — wider spacing on larger building
        fill(215, 208, 192);
        let libColPositions = [-bw/2 + 5, -bw/2 + 5 + (bw-10)/3, -bw/2 + 5 + 2*(bw-10)/3, bw/2 - 5];
        libColPositions.forEach(lcx => {
          rect(lcx - 3, -bh / 2 + 2, 6, bh / 2 + 10, 1);
          // Fluting
          stroke(195, 188, 172, 60);
          strokeWeight(0.4);
          line(lcx - 1, -bh / 2 + 4, lcx - 1, bh / 2 - 12);
          line(lcx + 1, -bh / 2 + 4, lcx + 1, bh / 2 - 12);
          noStroke();
          // Column capital
          fill(225, 218, 202);
          rect(lcx - 4, -bh / 2 + 1, 8, 3, 1);
          // Base
          fill(210, 203, 188);
          rect(lcx - 3.5, bh / 2 - 14, 7, 2, 1);
        });
        // Entablature
        fill(190, 182, 165);
        rect(-bw / 2 + 2, -bh / 2 + 8, bw - 4, 5, 1);
        // Pediment — triangular
        fill(178, 170, 155);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 10);
        vertex(bw / 2 - 2, -bh / 2 + 8);
        endShape(CLOSE);
        // Owl symbol on pediment
        fill(160, 152, 138);
        circle(0, -bh / 2 + 1, 6);
        fill(48, 42, 32);
        circle(-1.2, -bh / 2 + 0.5, 1.8);
        circle(1.2, -bh / 2 + 0.5, 1.8);
        // Beak
        fill(185, 155, 55);
        triangle(0, -bh/2 + 1.5, -1, -bh/2 + 3, 1, -bh/2 + 3);
        // Acroteria
        fill(200, 158, 52, 180);
        circle(-bw / 2 + 4, -bh / 2 + 7, 4);
        circle(bw / 2 - 4, -bh / 2 + 7, 4);
        circle(0, -bh / 2 - 11, 4);
        // Entrance doorway
        fill(45, 33, 18);
        rect(-8, -bh / 2 + 13, 16, 16, 1);
        arc(0, -bh / 2 + 13, 16, 10, PI, TWO_PI);
        // Night: warm lamp glow through entrance
        if (getSkyBrightness() < 0.35) {
          let libNight = map(getSkyBrightness(), 0, 0.35, 1, 0);
          fill(255, 205, 90, 60 * libNight);
          rect(-7, -bh / 2 + 14, 14, 14);
          fill(255, 190, 70, 25 * libNight);
          ellipse(0, -bh / 2 + 26, 22, 14);
          // Reading lamp windows
          fill(255, 195, 80, 45 * libNight);
          rect(-bw / 2 + 16, -bh / 2 + 30, 8, 5);
          rect(bw / 2 - 24, -bh / 2 + 30, 8, 5);
        }
        break;
      }
```

### 3C: case 'arena' — Complete rewrite

Replace the entire `case 'arena': {` block (from `case 'arena': {` to `break;\n      }`) with:

```js
      case 'arena': {
        noStroke();
        // Shadow ellipse
        fill(0, 0, 0, 35);
        ellipse(3, 6, bw, bh * 0.4);
        // Outer wall — stone ellipse (largest, background)
        fill(175, 162, 140);
        ellipse(0, 0, bw, bh);
        // Stone block texture on outer wall
        stroke(155, 143, 122, 60);
        strokeWeight(0.6);
        for (let aRing = 0; aRing < 3; aRing++) {
          let aRx = (bw / 2 - 2) * (1 - aRing * 0.04);
          let aRy = (bh / 2 - 2) * (1 - aRing * 0.04);
          ellipse(0, 0, aRx * 2, aRy * 2);
        }
        noStroke();
        // Seating tier 1 — outer (stone, lightest)
        fill(185, 172, 150);
        ellipse(0, 0, bw - 6, bh - 6);
        // Seating tier 2 — mid
        fill(165, 152, 130);
        ellipse(0, 0, bw - 18, bh - 18);
        // Seating tier 3 — inner
        fill(148, 135, 112);
        ellipse(0, 0, bw - 30, bh - 30);
        // Sand pit — arena floor
        fill(212, 195, 158);
        ellipse(0, 0, bw - 44, bh - 44);
        // Sand texture streaks
        fill(198, 182, 145, 80);
        for (let st = 0; st < 6; st++) {
          let sang = st * PI / 3 + 0.3;
          let slen = (bw - 50) * 0.3;
          stroke(185, 170, 135, 50);
          strokeWeight(0.8);
          line(cos(sang) * slen * 0.2, sin(sang) * slen * 0.15,
               cos(sang) * slen, sin(sang) * slen * 0.75);
        }
        noStroke();
        // Spectator dots on seating tiers — crowd suggestion
        for (let aai = 0; aai < 28; aai++) {
          let aAngle = aai * TWO_PI / 28 + 0.1;
          let aTierR = 0.72 + (aai % 3) * 0.06;
          let asx = cos(aAngle) * (bw / 2 - 4) * aTierR;
          let asy = sin(aAngle) * (bh / 2 - 4) * aTierR;
          // Alternate crowd color
          let crowdColors = [[85, 35, 18], [42, 55, 95], [155, 85, 28], [28, 68, 38]];
          let cc = crowdColors[aai % 4];
          fill(cc[0], cc[1], cc[2], 140);
          circle(asx, asy, 2.5);
        }
        // North gate (top)
        fill(95, 82, 62);
        rect(-6, -bh / 2 + 4, 12, 14, 1);
        fill(38, 28, 16, 220);
        rect(-4, -bh / 2 + 6, 8, 11);
        arc(0, -bh / 2 + 6, 8, 6, PI, TWO_PI);
        // South main gate (bottom)
        fill(115, 100, 78);
        rect(-8, bh / 2 - 16, 16, 16, 1);
        fill(38, 28, 16, 220);
        rect(-6, bh / 2 - 14, 12, 13);
        arc(0, bh / 2 - 14, 12, 8, PI, TWO_PI);
        // Velarium poles — awning poles at top of outer wall
        fill(110, 88, 48);
        rect(-bw / 2 + 4, -bh / 2 - 8, 2, 14);
        rect(bw / 2 - 6, -bh / 2 - 8, 2, 14);
        // Velarium rope lines
        stroke(130, 110, 75, 120);
        strokeWeight(0.7);
        line(-bw / 2 + 5, -bh / 2 - 8, 0, -bh / 2 - 2);
        line(bw / 2 - 5, -bh / 2 - 8, 0, -bh / 2 - 2);
        noStroke();
        // Red pennant banners on poles
        fill(175, 28, 28);
        rect(-bw / 2 + 6, -bh / 2 - 8, 7, 9);
        rect(bw / 2 - 13, -bh / 2 - 8, 7, 9);
        fill(145, 22, 22);
        rect(-bw / 2 + 6, -bh / 2 - 2, 7, 2);
        rect(bw / 2 - 13, -bh / 2 - 2, 7, 2);
        // Night: torchlight in seating tiers
        if (getSkyBrightness() < 0.35) {
          let arenaNight = map(getSkyBrightness(), 0, 0.35, 1, 0);
          for (let nt = 0; nt < 6; nt++) {
            let ntAngle = nt * TWO_PI / 6;
            let ntx = cos(ntAngle) * (bw / 2 - 10);
            let nty = sin(ntAngle) * (bh / 2 - 10);
            fill(255, 170, 55, 45 * arenaNight);
            circle(ntx, nty, 8);
          }
        }
        break;
      }
```

### 3D: case 'bath' — Enhanced rewrite

Replace the entire `case 'bath':` block (from `case 'bath':` to `break;`) with:

```js
      case 'bath':
        // Roman bath house (balneum) — grand heated pool with steam
        noStroke();
        // Shadow
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 3, bh / 2 - 3, bw, 7);
        // Foundation — lower step
        fill(165, 155, 138);
        rect(-bw / 2 + 2, bh / 2 - 8, bw - 4, 8, 1);
        // Main building body
        fill(190, 180, 162);
        rect(-bw / 2, -bh / 2 + 12, bw, bh - 12, 1);
        // Stone course texture
        stroke(172, 162, 145, 45);
        strokeWeight(0.5);
        for (let bly = -bh / 2 + 18; bly < bh / 2 - 10; bly += 6) {
          line(-bw / 2 + 1, bly, bw / 2 - 1, bly);
        }
        noStroke();
        // Blue pool — main feature, large and prominent
        fill(42, 105, 162, 195);
        rect(-bw / 2 + 12, -bh / 2 + 22, bw - 24, bh - 42, 3);
        // Pool shimmer
        let bathPhase2 = frameCount * 0.04 + b.x * 0.1;
        fill(75, 148, 210, 55 + sin(bathPhase2) * 28);
        rect(-bw / 2 + 16, -bh / 2 + 26, 16, 4, 2);
        fill(90, 165, 225, 35 + sin(bathPhase2 * 1.4) * 18);
        rect(-bw / 2 + 36, -bh / 2 + 30, 12, 3, 2);
        // Pool ripple highlight
        fill(120, 185, 230, 25 + sin(bathPhase2 * 0.9) * 12);
        rect(-bw / 2 + 14, -bh / 2 + 28, bw - 30, 2);
        // 4 entrance columns — proper spacing for wider building
        fill(200, 192, 175);
        let bathCols = [-bw/2 + 4, -bw/2 + 4 + (bw-8)/3, -bw/2 + 4 + 2*(bw-8)/3, bw/2 - 4];
        bathCols.forEach(bcx => {
          rect(bcx - 3, -bh / 2 + 2, 6, 22, 1);
          fill(210, 202, 185);
          rect(bcx - 4, -bh / 2 + 1, 8, 3, 1);  // capital
          fill(200, 192, 175);
          rect(bcx - 3.5, -bh / 2 + 22, 7, 2, 1); // base
          fill(200, 192, 175);
        });
        // Entablature
        fill(180, 172, 155);
        rect(-bw / 2 + 2, -bh / 2 + 8, bw - 4, 6, 1);
        // Pediment
        fill(168, 160, 145);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 6);
        vertex(bw / 2 - 2, -bh / 2 + 8);
        endShape(CLOSE);
        // Steam particles — multiple rising columns
        {
          let steamAlpha = map(getSkyBrightness(), 0.2, 1.0, 50, 18);
          for (let si3 = 0; si3 < 4; si3++) {
            let sPhase3 = frameCount * 0.018 + si3 * 2.4 + b.x * 0.007;
            for (let sp3 = 0; sp3 < 5; sp3++) {
              let sFrac3 = sp3 / 4;
              let sx3 = -bw / 2 + 18 + si3 * (bw - 32) / 3 + floor(sin(sPhase3 + sp3 * 0.6) * (1.5 + sp3));
              let sy3 = -bh / 2 + 20 - floor(sp3 * 8 + (frameCount * 0.5 + si3 * 20) % 32);
              let sSize = 2 + floor(sFrac3 * 2);
              let sa3 = steamAlpha * (1 - sFrac3 * 0.8);
              fill(230, 235, 240, sa3);
              noStroke();
              rect(sx3, sy3, sSize, sSize);
            }
          }
        }
        // Steps to entrance
        fill(175, 168, 152);
        rect(-12, bh / 2 - 10, 24, 4, 1);
        rect(-10, bh / 2 - 6, 20, 3, 1);
        // Night: blue pool glow
        if (getSkyBrightness() < 0.35) {
          let bathNight = map(getSkyBrightness(), 0, 0.35, 1, 0);
          fill(40, 100, 175, 30 * bathNight);
          rect(-bw / 2 + 10, -bh / 2 + 20, bw - 22, bh - 40);
          fill(255, 190, 80, 40 * bathNight);
          rect(-bw / 2 + 14, -bh / 2 + 16, 8, 5);
          rect(bw / 2 - 22, -bh / 2 + 16, 8, 5);
        }
        break;
```

### 3E: case 'watchtower' — Enhanced (keep existing, add beacon and taller proportions)

The watchtower rendering already has good bones (crenellations, beacon, arrow slits). The new size `24x56` means it will automatically look taller. However, the existing rendering offsets are calculated from `bw` and `bh` — they will auto-scale. No code change needed for watchtower rendering; the size change alone is the improvement.

**Optional enhancement** — if time permits, add a second arrow slit at a different height since the tower is now 12px taller. Find the existing arrow slit lines:
```js
        fill(40, 30, 18, 200);
        rect(-1.5, -bh / 2 + 16, 3, 7, 1);
        rect(-1.5, -bh / 2 + 30, 3, 7, 1);
```
Add a third slit:
```js
        rect(-1.5, -bh / 2 + 44, 3, 7, 1);
```

---

## PART 4 — CITY LIFE SIGNALS

All added to `sketch.js`. These are new functions called from the existing draw pipeline.

### 4A: drawGranaryArea() — grain carts near the granary

Add this new function near `drawCitySmoke()` (around line 5315):

```js
function drawGranaryArea() {
  if (state.islandLevel < 5) return;
  // Find granary buildings from CITY_SLOTS
  let granaries = state.buildings.filter(b => b.type === 'granary');
  granaries.forEach(g => {
    let gsx = w2sX(g.x);
    let gsy = w2sY(g.y);
    // 2 grain carts parked near granary
    let cartOffsets = [{ dx: -g.w * 0.6, dy: g.h * 0.6 }, { dx: g.w * 0.5, dy: g.h * 0.55 }];
    cartOffsets.forEach((co, ci) => {
      let cx3 = floor(gsx + co.dx);
      let cy3 = floor(gsy + co.dy);
      push();
      translate(cx3, cy3);
      noStroke();
      // Cart body — rough wood planks
      fill(95, 68, 32);
      rect(-9, -4, 18, 7, 1);
      // Plank lines
      stroke(78, 55, 25, 100);
      strokeWeight(0.5);
      line(-7, -4, -7, 3);
      line(-1, -4, -1, 3);
      line(5, -4, 5, 3);
      noStroke();
      // Grain sacks — lumpy beige
      fill(192, 172, 128);
      ellipse(-3, -6, 7, 5);
      ellipse(3, -7, 6, 5);
      ellipse(0, -8, 5, 4);
      fill(178, 158, 115);
      ellipse(-3, -5, 6, 3);
      ellipse(3, -6, 5, 3);
      // Wheels — 2 dark circles with spokes
      fill(55, 40, 20);
      circle(-7, 3, 7);
      circle(7, 3, 7);
      fill(75, 55, 28);
      circle(-7, 3, 4);
      circle(7, 3, 4);
      stroke(55, 40, 20, 180);
      strokeWeight(0.6);
      for (let sp4 = 0; sp4 < 4; sp4++) {
        let sang2 = sp4 * HALF_PI + frameCount * 0 + ci * 0.5; // static
        line(-7 + cos(sang2) * 1, 3 + sin(sang2) * 1, -7 + cos(sang2) * 3.5, 3 + sin(sang2) * 3.5);
        line(7 + cos(sang2) * 1, 3 + sin(sang2) * 1, 7 + cos(sang2) * 3.5, 3 + sin(sang2) * 3.5);
      }
      noStroke();
      pop();
    });
  });
}
```

### 4B: drawAmphoraStacks() — pottery near market

Add this new function after `drawGranaryArea()`:

```js
function drawAmphoraStacks() {
  if (state.islandLevel < 10) return;
  let markets = state.buildings.filter(b => b.type === 'market');
  markets.forEach(m => {
    let msx = w2sX(m.x);
    let msy = w2sY(m.y);
    // Stack of amphoras left of market
    push();
    translate(floor(msx - m.w * 0.7), floor(msy + m.h * 0.3));
    noStroke();
    // Bottom row — 3 amphoras
    for (let ai = 0; ai < 3; ai++) {
      let ax = (ai - 1) * 7;
      let aColor = ai % 2 === 0 ? [175, 95, 48] : [162, 82, 38];
      fill(aColor[0], aColor[1], aColor[2]);
      // Body — tapered oval
      ellipse(ax, 0, 5, 8);
      // Neck
      rect(ax - 1, -5, 2, 3);
      // Rim
      rect(ax - 1.5, -7, 3, 2, 1);
      // Toe (pointy bottom)
      fill(aColor[0] - 20, aColor[1] - 20, aColor[2] - 10);
      ellipse(ax, 3, 3, 4);
      // Handle lines
      stroke(aColor[0] - 30, aColor[1] - 25, aColor[2] - 15, 150);
      strokeWeight(0.7);
      line(ax - 2, -3, ax - 3, 0);
      line(ax + 2, -3, ax + 3, 0);
      noStroke();
    }
    // Top row — 2 amphoras slightly offset
    for (let ai = 0; ai < 2; ai++) {
      let ax = (ai - 0.5) * 7;
      fill(168, 88, 42);
      ellipse(ax, -8, 5, 8);
      rect(ax - 1, -13, 2, 3);
      rect(ax - 1.5, -15, 3, 2, 1);
    }
    pop();
  });
}
```

### 4C: drawTempleIncense() — wispy purple smoke from temple doorway

Add this new function after `drawAmphoraStacks()`:

```js
function drawTempleIncense() {
  if (state.islandLevel < 10) return;
  let temples = state.buildings.filter(b => b.type === 'temple');
  temples.forEach(t => {
    let tsx = w2sX(t.x);
    let tsy = w2sY(t.y);
    // Incense rises from temple door — slow, wispy, purple-tinted
    let incAlpha = map(getSkyBrightness(), 0.0, 0.7, 55, 15);
    for (let ii = 0; ii < 2; ii++) {
      let iPhase = frameCount * 0.008 + ii * 1.8 + t.x * 0.005;
      for (let ip = 0; ip < 6; ip++) {
        let iFrac = ip / 5;
        let ix = tsx + floor(sin(iPhase + ip * 0.5) * (1 + ip * 0.8)) + (ii - 0.5) * 4;
        let iy = tsy - floor(t.h * 0.3) - floor(ip * 9 + (frameCount * 0.3 + ii * 18) % 54);
        let iSize = 1 + floor(iFrac * 1.5);
        let ia = incAlpha * (1 - iFrac * 0.85);
        // Purple-grey tint — distinct from house smoke (grey-white) and castrum smoke (dark grey)
        fill(165, 148, 175, ia);
        noStroke();
        rect(ix, iy, iSize, iSize);
      }
    }
  });
}
```

### 4D: drawStreetWear() — dirt/wear along the Decumanus

Add this new function after `drawTempleIncense()`:

```js
function drawStreetWear() {
  if (state.islandLevel < 8) return;
  let bright = getSkyBrightness();
  if (bright < 0.15) return;  // invisible at deep night
  let cx4 = WORLD.islandCX;
  let cy4 = WORLD.islandCY;
  // The Decumanus runs east-west through city center
  // Draw subtle darkened ellipses where foot traffic wears the ground
  let wearPoints = [
    { wx: cx4 - 80, wy: cy4 + 30 },
    { wx: cx4, wy: cy4 + 30 },
    { wx: cx4 + 80, wy: cy4 + 30 },
    { wx: cx4 + 140, wy: cy4 + 40 },
    { wx: cx4 - 140, wy: cy4 + 40 },
    // Forum approach
    { wx: cx4, wy: cy4 + 60 },
    { wx: cx4, wy: cy4 + 10 },
  ];
  noStroke();
  wearPoints.forEach(wp => {
    let wsx = w2sX(wp.wx);
    let wsy = w2sY(wp.wy);
    fill(80, 68, 45, 18);
    ellipse(wsx, wsy, 28, 12);
    fill(70, 58, 38, 10);
    ellipse(wsx, wsy, 44, 18);
  });
}
```

### 4E: drawForumBanner() — animated SPQR banner on the forum

Add this new function after `drawStreetWear()`:

```js
function drawForumBanner() {
  if (state.islandLevel < 15) return;
  let forums = state.buildings.filter(b => b.type === 'forum');
  forums.forEach(f => {
    let fsx = w2sX(f.x);
    let fsy = w2sY(f.y);
    push();
    translate(floor(fsx - f.w * 0.25), floor(fsy - f.h * 0.55));
    noStroke();
    // Pole
    fill(110, 85, 45);
    rect(-1, -22, 2, 22);
    // Crossbar
    rect(-5, -22, 10, 2);
    // Animated banner — wind ripple
    let bannerWave = sin(frameCount * 0.035 + f.x * 0.01) * 2.5;
    fill(175, 28, 28);
    beginShape();
    vertex(0, -21);
    vertex(10 + bannerWave, -20);
    vertex(10 + bannerWave * 0.6, -15);
    vertex(0, -14);
    endShape(CLOSE);
    // SPQR text suggestion — 3 tiny horizontal lines
    fill(220, 195, 60, 200);
    rect(2, -20, 6, 1);
    rect(2, -18, 5, 1);
    rect(2, -16, 6, 1);
    pop();
  });
}
```

### 4F: drawWindowGlow() — warm light from all landmark buildings at night

Add this new function after `drawForumBanner()`:

```js
function drawWindowGlow() {
  let bright = getSkyBrightness();
  if (bright >= 0.35) return;
  let nightStr = map(bright, 0, 0.35, 1, 0);

  state.buildings.forEach(b => {
    if (b.type === 'forum' || b.type === 'temple' || b.type === 'granary' ||
        b.type === 'market' || b.type === 'shrine' || b.type === 'villa' ||
        b.type === 'arch') {
      let sx5 = w2sX(b.x);
      let sy5 = w2sY(b.y);
      noStroke();
      // 2-3 small warm rectangles per building — windows/doorways
      fill(255, 195, 80, 50 * nightStr);
      rect(floor(sx5 - b.w * 0.15), floor(sy5 - b.h * 0.25), 5, 4);
      rect(floor(sx5 + b.w * 0.1), floor(sy5 - b.h * 0.25), 5, 4);
      // Soft bloom
      fill(255, 175, 60, 18 * nightStr);
      ellipse(sx5, sy5 - b.h * 0.1, b.w * 0.5, b.h * 0.3);
    }
  });
}
```

---

## PART 5 — WIRE UP THE NEW DRAW FUNCTIONS

### 5A: Call new functions from draw pipeline

In `sketch.js`, find the draw pipeline section that currently reads:

```js
    drawCitySmoke();
    drawLaundryLines();
```

Change it to:

```js
    drawCitySmoke();
    drawLaundryLines();
    drawStreetWear();
    drawGranaryArea();
    drawAmphoraStacks();
    drawTempleIncense();
    drawForumBanner();
    drawWindowGlow();
```

Note: `drawStreetWear()` goes FIRST (it's ground-level, should be under everything). The rest go after laundry.

---

## VERIFICATION CHECKLIST

After implementing all changes, verify:

1. **BLUEPRINTS sizes updated**: castrum=80x60, library=72x52, arena=84x64, bath=70x52, watchtower=24x56
2. **CITY_SLOTS updated**: all 7 slot entries match new sizes
3. **loadState() migration**: exists and runs on load
4. **castrum**: has visible crenellations, portcullis gate, waving banner, darker smoke, night glow
5. **library**: has scroll niches, 4 columns with fluting, owl on pediment, night glow
6. **arena**: has 3 seating tiers, sand pit, crowd dots, north+south gates, velarium poles, night torchlight
7. **bath**: has large blue pool, 4 columns, 4-column steam, steps, night pool glow
8. **watchtower**: taller, optionally 3rd arrow slit
9. **Grain carts**: visible near granary at level 5+
10. **Amphora stacks**: visible near market at level 10+
11. **Temple incense**: purple-tinted wispy smoke rising from temple at level 10+
12. **Street wear**: subtle dark ellipses along Decumanus at level 8+
13. **Forum banner**: animated red SPQR banner at level 15+
14. **Window glow**: warm yellow rects on forum/temple/granary/market/shrine/villa/arch at night

---

## SCOPE NOTES

- All changes are in `sketch.js` only
- No new state variables required — all rendering is purely visual/stateless
- The `drawWindowGlow()` for house/castrum/library/arena/bath is handled inside each `case` in `drawOneBuilding()` — the separate `drawWindowGlow()` function handles buildings that didn't get updated case blocks
- If the castrum CITY_SLOT x/y coordinate causes overlap with expanded 80x60 footprint, adjust the `x` in the `id: 'castrum'` CITY_SLOT entry by -8 (from x:840 to x:832) to keep it centered in the military district
- Do NOT touch npc.js, world.js, or any other file
