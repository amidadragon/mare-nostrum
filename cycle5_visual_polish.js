// MARE NOSTRUM — Cycle 5: Visual Polish
// Ambient particle systems, weather enhancements, screen effects, and island ambiance

(function() {
  'use strict';

  // ─── AMBIENT PARTICLE MANAGER ─────────────────────────────────────────────
  // Manages separate pools of ambient particles for performance

  const AmbientParticles = {
    fireflies: [],
    dustMotes: [],
    leaves: [],
    seaSpray: [],
    rainStreaks: [],
    rainPuddles: [],
    snowflakes: [],
    sunRays: [],
    smokePuffs: [],
    marketCloth: [],
    waterRipples: [],
    birds: [],

    pools: {
      fireflies: 15,
      dustMotes: 20,
      leaves: 12,
      seaSpray: 10,
      rainStreaks: 30,
      rainPuddles: 8,
      snowflakes: 20,
      sunRays: 6,
      smokePuffs: 8,
      marketCloth: 6,
      waterRipples: 5,
      birds: 4,
    },

    // Initialize particle pools
    init() {
      Object.keys(this.pools).forEach(pool => {
        this[pool] = [];
      });
    },

    // Update all ambient particles
    update(dt) {
      this.updateFireflies(dt);
      this.updateDustMotes(dt);
      this.updateLeaves(dt);
      this.updateSeaSpray(dt);
      this.updateRainStreaks(dt);
      this.updateRainPuddles(dt);
      this.updateSnowflakes(dt);
      this.updateSunRays(dt);
      this.updateSmokePuffs(dt);
      this.updateMarketCloth(dt);
      this.updateWaterRipples(dt);
      this.updateBirds(dt);
    },

    // Render all ambient particles
    draw() {
      this.drawFireflies();
      this.drawDustMotes();
      this.drawLeaves();
      this.drawSeaSpray();
      this.drawRainStreaks();
      this.drawRainPuddles();
      this.drawSnowflakes();
      this.drawSunRays();
      this.drawSmokePuffs();
      this.drawMarketCloth();
      this.drawWaterRipples();
      this.drawBirds();
    },

    // ─── FIREFLIES (night only) ───────────────────────────────────────────
    updateFireflies(dt) {
      let hour = ((state.time || 720) / 60) % 24;
      let isNight = hour > 20 || hour < 6;

      if (!isNight) {
        this.fireflies = [];
        return;
      }

      // Spawn fireflies at night
      if (frameCount % 45 === 0 && this.fireflies.length < this.pools.fireflies) {
        let fx = state.player.x + random(-300, 300);
        let fy = state.player.y + random(-200, 150);

        if (isOnIsland(fx, fy)) {
          this.fireflies.push({
            x: fx, y: fy,
            vx: random(-0.08, 0.08),
            vy: random(-0.12, 0.08),
            life: random(120, 200),
            maxLife: 200,
            blinkPhase: random(TWO_PI),
            size: random(1.5, 2.5),
          });
        }
      }

      // Update fireflies
      this.fireflies.forEach(f => {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.life -= dt;

        // Gentle drift
        f.vx += random(-0.02, 0.02);
        f.vy += random(-0.03, 0.03);
        f.vx = constrain(f.vx, -0.15, 0.15);
        f.vy = constrain(f.vy, -0.2, 0.15);
      });

      // Cleanup dead fireflies
      this.fireflies = this.fireflies.filter(f => f.life > 0);
    },

    drawFireflies() {
      noStroke();
      this.fireflies.forEach(f => {
        let a = map(f.life, 0, f.maxLife, 0, 1);
        let brightness = sin(frameCount * 0.08 + f.blinkPhase) * 0.4 + 0.6;

        let fx = w2sX(f.x);
        let fy = w2sY(f.y);

        // Glow halo
        fill(100, 220, 140, 30 * a * brightness);
        ellipse(fx, fy, f.size * 6);

        // Core light
        fill(120, 255, 160, 200 * a * brightness);
        ellipse(fx, fy, f.size);
      });
    },

    // ─── DUST MOTES (day only) ────────────────────────────────────────────
    updateDustMotes(dt) {
      let bright = getSkyBrightness();

      if (bright < 0.5) {
        this.dustMotes = [];
        return;
      }

      // Spawn dust motes during day
      if (frameCount % 30 === 0 && this.dustMotes.length < this.pools.dustMotes) {
        let dx = state.player.x + random(-200, 200);
        let dy = state.player.y + random(-120, 100);

        if (isOnIsland(dx, dy)) {
          this.dustMotes.push({
            x: dx, y: dy,
            vx: random(-0.04, 0.04),
            vy: random(-0.08, -0.02),
            life: random(60, 120),
            maxLife: 120,
            size: random(0.8, 1.8),
          });
        }
      }

      // Update motes
      this.dustMotes.forEach(m => {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;
      });

      this.dustMotes = this.dustMotes.filter(m => m.life > 0);
    },

    drawDustMotes() {
      noStroke();
      this.dustMotes.forEach(m => {
        let a = map(m.life, 0, m.maxLife, 0, 1);
        let fx = w2sX(m.x);
        let fy = w2sY(m.y);

        fill(200, 170, 110, 80 * a);
        ellipse(fx, fy, m.size);
      });
    },

    // ─── LEAVES (wind effect) ─────────────────────────────────────────────
    updateLeaves(dt) {
      let bright = getSkyBrightness();

      // Leaves visible during day and twilight
      if (bright < 0.2) {
        this.leaves = [];
        return;
      }

      // Spawn leaves
      if (frameCount % 60 === 0 && this.leaves.length < this.pools.leaves) {
        let lx = state.player.x + random(-width * 0.3, width * 0.3);
        let ly = state.player.y - 200 + random(-50, 50);

        this.leaves.push({
          x: lx, y: ly,
          vx: random(-0.3, -0.05),
          vy: random(0.05, 0.2),
          rotation: random(TWO_PI),
          rotSpeed: random(-0.05, 0.05),
          life: random(200, 350),
          maxLife: 350,
          size: random(2, 4),
          color: random([0, 1, 2]), // 0=brown, 1=green, 2=yellow-green
        });
      }

      // Update leaves
      this.leaves.forEach(l => {
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.rotation += l.rotSpeed;
        l.life -= dt;

        // Gentle wind wobble
        l.vx += sin(frameCount * 0.01 + l.x * 0.001) * 0.01;
      });

      this.leaves = this.leaves.filter(l => l.life > 0);
    },

    drawLeaves() {
      this.leaves.forEach(l => {
        let a = map(l.life, 0, l.maxLife, 0, 1);
        let lx = w2sX(l.x);
        let ly = w2sY(l.y);

        if (lx < -20 || lx > width + 20 || ly < -20 || ly > height + 20) return;

        push();
        translate(lx, ly);
        rotate(l.rotation);
        noStroke();

        if (l.color === 0) {
          fill(100, 70, 40, 180 * a); // brown
        } else if (l.color === 1) {
          fill(80, 140, 60, 180 * a); // green
        } else {
          fill(140, 150, 60, 180 * a); // yellow-green
        }

        // Simple leaf shape (triangle-ish)
        beginShape();
        vertex(0, -l.size);
        vertex(l.size * 0.6, 0);
        vertex(0, l.size);
        vertex(-l.size * 0.6, 0);
        endShape(CLOSE);

        pop();
      });
    },

    // ─── SEA SPRAY (near coastline) ─────────────────────────────────────
    updateSeaSpray(dt) {
      // Spawn near water edges
      if (frameCount % 50 === 0 && this.seaSpray.length < this.pools.seaSpray) {
        let angle = random(TWO_PI);
        let dist = 1.05 + random(0, 0.03);

        let sx = WORLD.islandCX + cos(angle) * getSurfaceRX() * dist;
        let sy = WORLD.islandCY + sin(angle) * getSurfaceRY() * dist;

        this.seaSpray.push({
          x: sx, y: sy,
          vx: cos(angle) * random(0.1, 0.3) + random(-0.05, 0.05),
          vy: sin(angle) * random(0.1, 0.3) - random(0.2, 0.4),
          life: random(40, 100),
          maxLife: 100,
          gravity: 0.08,
          size: random(0.5, 1.2),
        });
      }

      // Update spray
      this.seaSpray.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += s.gravity * dt;
        s.life -= dt;
      });

      this.seaSpray = this.seaSpray.filter(s => s.life > 0);
    },

    drawSeaSpray() {
      noStroke();
      this.seaSpray.forEach(s => {
        let a = map(s.life, 0, s.maxLife, 0, 1);
        let sx = w2sX(s.x);
        let sy = w2sY(s.y);

        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) return;

        fill(240, 245, 250, 180 * a);
        ellipse(sx, sy, s.size);
      });
    },

    // ─── RAIN STREAKS (rain weather) ─────────────────────────────────────
    updateRainStreaks(dt) {
      if (state.weather !== 'rain') {
        this.rainStreaks = [];
        return;
      }

      // Spawn rain streaks
      if (frameCount % 3 === 0 && this.rainStreaks.length < this.pools.rainStreaks) {
        this.rainStreaks.push({
          x: random(width),
          y: random(-50, height * 0.2),
          vx: random(-3, -1),
          vy: random(5, 9),
          life: random(60, 120),
          maxLife: 120,
          length: random(8, 16),
        });
      }

      // Update rain
      this.rainStreaks.forEach(r => {
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.life -= dt;
      });

      this.rainStreaks = this.rainStreaks.filter(r => r.life > 0);
    },

    drawRainStreaks() {
      stroke(100, 160, 220, 140);
      strokeWeight(1);
      this.rainStreaks.forEach(r => {
        let a = map(r.life, 0, r.maxLife, 0, 1);
        stroke(100, 160, 220, 140 * a);
        line(r.x, r.y, r.x + r.vx * 0.1, r.y + r.length);
      });
      noStroke();
    },

    // ─── RAIN PUDDLE REFLECTIONS ───────────────────────────────────────
    updateRainPuddles(dt) {
      if (state.weather !== 'rain') {
        this.rainPuddles = [];
        return;
      }

      // Spawn puddles on ground
      if (frameCount % 80 === 0 && this.rainPuddles.length < this.pools.rainPuddles) {
        let px = state.player.x + random(-200, 200);
        let py = state.player.y + random(20, 80);

        if (isOnIsland(px, py)) {
          this.rainPuddles.push({
            x: px, y: py,
            life: random(200, 400),
            maxLife: 400,
            rx: random(4, 8),
            ry: random(2, 4),
          });
        }
      }

      // Update puddles
      this.rainPuddles.forEach(p => {
        p.life -= dt;
      });

      this.rainPuddles = this.rainPuddles.filter(p => p.life > 0);
    },

    drawRainPuddles() {
      noStroke();
      this.rainPuddles.forEach(p => {
        let a = map(p.life, 0, p.maxLife, 0, 1);
        let px = w2sX(p.x);
        let py = w2sY(p.y);

        fill(80, 140, 200, 60 * a);
        ellipse(px, py, p.rx * 2, p.ry * 2);
      });
    },

    // ─── SNOWFLAKES (snow weather) ────────────────────────────────────
    updateSnowflakes(dt) {
      if (state.weather !== 'snow') {
        this.snowflakes = [];
        return;
      }

      // Spawn snowflakes
      if (frameCount % 4 === 0 && this.snowflakes.length < this.pools.snowflakes) {
        this.snowflakes.push({
          x: random(width),
          y: random(-20, 0),
          vx: random(-0.5, 0.5),
          vy: random(0.3, 0.8),
          life: random(400, 600),
          maxLife: 600,
          wobble: random(TWO_PI),
          size: random(1, 2),
        });
      }

      // Update snowflakes
      this.snowflakes.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.wobble += 0.02;
        s.x += sin(s.wobble) * 0.3;
        s.life -= dt;
      });

      this.snowflakes = this.snowflakes.filter(s => s.life > 0);
    },

    drawSnowflakes() {
      noStroke();
      fill(245, 250, 255, 220);
      this.snowflakes.forEach(s => {
        let a = map(s.life, 0, s.maxLife, 0, 1);
        fill(245, 250, 255, 220 * a);
        ellipse(s.x, s.y, s.size);
      });
    },

    // ─── SUN RAYS (clear weather, daytime) ────────────────────────────
    updateSunRays(dt) {
      let bright = getSkyBrightness();

      if (state.weather === 'rain' || state.weather === 'snow' || bright < 0.5) {
        this.sunRays = [];
        return;
      }

      // Spawn sun rays
      if (frameCount % 120 === 0 && this.sunRays.length < this.pools.sunRays) {
        this.sunRays.push({
          x: random(width * 0.2, width * 0.8),
          life: random(300, 500),
          maxLife: 500,
          angle: random(-PI / 6, PI / 6),
          length: random(200, 400),
          width: random(15, 35),
        });
      }

      // Update rays
      this.sunRays.forEach(r => {
        r.life -= dt;
      });

      this.sunRays = this.sunRays.filter(r => r.life > 0);
    },

    drawSunRays() {
      this.sunRays.forEach(r => {
        let a = map(r.life, 0, r.maxLife, 0, 1);
        fill(255, 220, 80, 20 * a);
        noStroke();

        push();
        translate(r.x, 0);
        beginShape();
        vertex(0, 0);
        vertex(-r.width / 2, r.length);
        vertex(r.width / 2, r.length);
        endShape(CLOSE);
        pop();
      });
    },

    // ─── SMOKE PUFFS (from chimneys) ──────────────────────────────────
    updateSmokePuffs(dt) {
      // Spawn smoke from houses with chimneys
      if (frameCount % 35 === 0 && this.smokePuffs.length < this.pools.smokePuffs) {
        let houses = state.buildings?.filter(b => b.type === 'house' && b.active);
        if (houses && houses.length > 0) {
          let house = random(houses);
          let sx = house.x + random(-5, 5);
          let sy = house.y - house.h / 2 - 10;

          this.smokePuffs.push({
            x: sx, y: sy,
            vx: random(-0.05, 0.05),
            vy: random(-0.15, -0.05),
            life: random(80, 150),
            maxLife: 150,
            size: random(3, 6),
          });
        }
      }

      // Update smoke
      this.smokePuffs.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.size += 0.2;
        s.life -= dt;
      });

      this.smokePuffs = this.smokePuffs.filter(s => s.life > 0);
    },

    drawSmokePuffs() {
      noStroke();
      this.smokePuffs.forEach(s => {
        let a = map(s.life, 0, s.maxLife, 0, 1);
        fill(150, 150, 150, 80 * a);
        let sx = w2sX(s.x);
        let sy = w2sY(s.y);
        ellipse(sx, sy, s.size);
      });
    },

    // ─── MARKET CLOTH FLUTTERING ──────────────────────────────────────
    updateMarketCloth(dt) {
      // Spawn cloth waves from market stalls
      if (frameCount % 40 === 0 && this.marketCloth.length < this.pools.marketCloth) {
        let markets = state.buildings?.filter(b => b.type === 'market' && b.active);
        if (markets && markets.length > 0) {
          let market = random(markets);
          let mx = market.x + random(-20, 20);
          let my = market.y - market.h / 2;

          this.marketCloth.push({
            x: mx, y: my,
            vx: random(-0.08, 0.08),
            vy: random(-0.05, 0.05),
            life: random(60, 120),
            maxLife: 120,
            angle: random(TWO_PI),
            size: random(2, 4),
            color: random([0, 1, 2, 3]), // different colors
          });
        }
      }

      // Update cloth
      this.marketCloth.forEach(c => {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.angle += random(-0.1, 0.1);
        c.life -= dt;
      });

      this.marketCloth = this.marketCloth.filter(c => c.life > 0);
    },

    drawMarketCloth() {
      this.marketCloth.forEach(c => {
        let a = map(c.life, 0, c.maxLife, 0, 1);
        let cx = w2sX(c.x);
        let cy = w2sY(c.y);

        push();
        translate(cx, cy);
        rotate(c.angle);

        const colors = [
          [220, 60, 60],   // red
          [60, 120, 220],  // blue
          [220, 180, 60],  // yellow
          [120, 200, 80],  // green
        ];

        let col = colors[c.color];
        fill(col[0], col[1], col[2], 180 * a);
        noStroke();

        // Triangle cloth shape
        beginShape();
        vertex(0, 0);
        vertex(-c.size, c.size);
        vertex(c.size, c.size);
        endShape(CLOSE);

        pop();
      });
    },

    // ─── WATER RIPPLES (near docks) ────────────────────────────────────
    updateWaterRipples(dt) {
      // Spawn ripples near docks
      if (frameCount % 60 === 0 && this.waterRipples.length < this.pools.waterRipples) {
        let docks = state.buildings?.filter(b => b.type === 'dock' && b.active);
        if (docks && docks.length > 0) {
          let dock = random(docks);
          let rx = dock.x + random(-30, 30);
          let ry = dock.y + dock.h / 2 + 10;

          this.waterRipples.push({
            x: rx, y: ry,
            life: random(80, 150),
            maxLife: 150,
            radius: 0,
            maxRadius: random(20, 40),
          });
        }
      }

      // Update ripples
      this.waterRipples.forEach(r => {
        r.life -= dt;
        r.radius = map(r.life, r.maxLife, 0, 0, r.maxRadius);
      });

      this.waterRipples = this.waterRipples.filter(r => r.life > 0);
    },

    drawWaterRipples() {
      noFill();
      this.waterRipples.forEach(r => {
        let a = map(r.life, 0, r.maxLife, 0, 1);
        stroke(100, 160, 220, 80 * a);
        strokeWeight(1);
        let rx = w2sX(r.x);
        let ry = w2sY(r.y);
        circle(rx, ry, r.radius * 2);
      });
      noStroke();
    },

    // ─── BIRD SILHOUETTES ────────────────────────────────────────────
    updateBirds(dt) {
      let bright = getSkyBrightness();

      if (bright < 0.3) {
        this.birds = [];
        return;
      }

      // Spawn birds
      if (frameCount % 180 === 0 && this.birds.length < this.pools.birds) {
        let side = random([0, 1]);
        let bx = side === 0 ? -50 : width + 50;
        let by = random(height * 0.15, height * 0.4);

        this.birds.push({
          x: bx, y: by,
          vx: side === 0 ? random(0.4, 0.7) : random(-0.7, -0.4),
          vy: random(-0.05, 0.05),
          life: random(500, 800),
          maxLife: 800,
          wingPhase: random(TWO_PI),
          size: random(3, 6),
        });
      }

      // Update birds
      this.birds.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
      });

      this.birds = this.birds.filter(b => b.life > 0);
    },

    drawBirds() {
      noFill();
      this.birds.forEach(b => {
        let bright = getSkyBrightness();
        let a = map(b.life, 0, b.maxLife, 0, 1);

        stroke(40, 35, 30, 100 * a * bright);
        strokeWeight(1);

        let wing = sin(frameCount * 0.12 + b.wingPhase) * b.size * 0.4;
        // V-shaped bird
        line(b.x - b.size, b.y - wing, b.x, b.y);
        line(b.x, b.y, b.x + b.size, b.y - wing);
      });
      noStroke();
    },
  };

  // ─── SCREEN EFFECTS ───────────────────────────────────────────────────────

  const ScreenEffects = {
    // Vignette effect (darkened edges)
    drawVignette() {
      noStroke();
      let vignettePower = 2.5;

      for (let x = 0; x < width; x += 20) {
        for (let y = 0; y < height; y += 20) {
          let dx = (x - width / 2) / (width / 2);
          let dy = (y - height / 2) / (height / 2);
          let dist = sqrt(dx * dx + dy * dy);
          let vignette = pow(1 - constrain(dist, 0, 1), vignettePower);

          fill(0, 0, 0, (1 - vignette) * 30);
          rect(x, y, 20, 20);
        }
      }
    },

    // Day/night color grading
    applyColorGrading() {
      let hour = ((state.time || 720) / 60) % 24;

      // Sunset warmth (18-20)
      if (hour >= 18 && hour < 20) {
        let sunsetAmount = map(hour, 18, 20, 0, 1);
        fill(200, 140, 80, sunsetAmount * 25);
        rect(0, 0, width, height);
      }

      // Night cool blue (20-6)
      if ((hour >= 20 && hour <= 24) || (hour >= 0 && hour < 6)) {
        let nightAmount = 0.8;
        if (hour >= 20 && hour < 22) {
          nightAmount = map(hour, 20, 22, 0, 0.8);
        } else if (hour >= 4 && hour < 6) {
          nightAmount = map(hour, 4, 6, 0.8, 0);
        }
        fill(80, 120, 160, nightAmount * 30);
        rect(0, 0, width, height);
      }
    },

    // Camera shake on explosions/impacts
    applyCameraShake() {
      if (state.screenShake && state.screenShake > 0) {
        let shakeAmount = state.screenShake * 2;
        let shakeX = random(-shakeAmount, shakeAmount);
        let shakeY = random(-shakeAmount, shakeAmount);

        // Apply to camera offset (handled in main drawing)
        return { x: shakeX, y: shakeY };
      }
      return { x: 0, y: 0 };
    },
  };

  // ─── INITIALIZATION & HOOKS ───────────────────────────────────────────────

  // Initialize when ready
  window.initVisualPolish = function() {
    if (typeof AmbientParticles !== 'undefined') {
      AmbientParticles.init();
    }
  };

  // Update ambient particles (call from main update loop)
  window.updateVisualPolish = function(dt) {
    if (AmbientParticles) {
      AmbientParticles.update(dt);
    }
  };

  // Draw all visual polish (call from main draw loop)
  window.drawVisualPolish = function() {
    if (AmbientParticles) {
      AmbientParticles.draw();
    }

    // Apply vignette
    ScreenEffects.drawVignette();

    // Apply color grading
    ScreenEffects.applyColorGrading();
  };

  // Export for use
  window.AmbientParticles = AmbientParticles;
  window.ScreenEffects = ScreenEffects;

})();
