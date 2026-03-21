// ─── ROMAN FESTIVALS ─────────────────────────────────────────────────────
const FESTIVALS = [
  { name: 'FLORALIA', season: 0, desc: 'Festival of Flowers — crops grow 2x, mutations 5x',
    effect: { crops: 2, mutation: 5 }, color: '#ff88cc' },
  { name: 'NEPTUNALIA', season: 1, desc: 'Festival of Waters — fish 3x, rain guaranteed',
    effect: { fish: 3, forceRain: true }, color: '#44aaff' },
  { name: 'VINALIA', season: 2, desc: 'Festival of Wine — cooking instant, hearts 2x',
    effect: { cooking: true, hearts: 2 }, color: '#cc44ff' },
  { name: 'SATURNALIA', season: 3, desc: 'Festival of Saturn — all resources 2x, gold rain',
    effect: { allResources: 2, goldRain: true }, color: '#ffcc44' },
];

function getFestival() {
  if (!state.festival || !state.festival.active) return null;
  return FESTIVALS[state.festival.season];
}

function startFestival() {
  let season = getSeason();
  state.festival = { active: true, season: season, timer: 0, celebrated: false };
  state.codex.festivalsAttended++;
  unlockJournal('first_festival');
  let f = FESTIVALS[season];
  addFloatingText(width / 2, height * 0.25, f.name + '!', f.color);
  addFloatingText(width / 2, height * 0.32, f.desc, '#ffffff');
  spawnSeasonFanfare(season);
  if (snd) snd.playSFX('festival_start');
  if (f.effect.forceRain) {
    state.weather = { type: 'rain', timer: 1440, intensity: 0.7 };
  }
  // Trigger cinematic announcement overlay
  _festivalAnnouncement = { timer: 0, duration: 120, season: season };
  _spawnFestivalParticles(season);
}

// ─── FESTIVAL ANNOUNCEMENT CINEMATIC ──────────────────────────────────────
let _festivalAnnouncement = null;

function _spawnFestivalParticles(season) {
  let px = state.player.x, py = state.player.y;
  let count = 30;
  for (let i = 0; i < count; i++) {
    let angle = (TWO_PI / count) * i + random(-0.2, 0.2);
    let speed = random(1.5, 4);
    let p = {
      x: px + random(-30, 30), y: py + random(-30, 30),
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.6 - random(0.5, 1.5),
      life: random(50, 90), maxLife: 90,
      type: 'burst', size: random(2, 5),
      r: 0, g: 0, b: 0, world: true,
    };
    if (season === 0) { p.r = 255; p.g = floor(random(120, 200)); p.b = floor(random(160, 220)); } // Floralia pink petals
    else if (season === 1) { p.r = floor(random(60, 120)); p.g = floor(random(160, 220)); p.b = 255; } // Neptunalia water drops
    else if (season === 2) { p.r = floor(random(140, 200)); p.g = floor(random(60, 120)); p.b = 255; } // Vinalia grape orbs
    else { p.r = 255; p.g = floor(random(180, 220)); p.b = floor(random(40, 80)); } // Saturnalia golden sparks
    particles.push(p);
  }
}

function drawFestivalAnnouncement() {
  if (!_festivalAnnouncement) return;
  let a = _festivalAnnouncement;
  a.timer++;
  let progress = a.timer / a.duration;
  if (progress >= 1) { _festivalAnnouncement = null; return; }

  let f = FESTIVALS[a.season];

  // Screen dim overlay
  let dimAlpha;
  if (progress < 0.15) dimAlpha = (progress / 0.15) * 80;
  else if (progress < 0.75) dimAlpha = 80;
  else dimAlpha = 80 * (1 - (progress - 0.75) / 0.25);
  fill(0, 0, 0, floor(dimAlpha));
  rect(0, 0, width, height);

  // Festival name in large ornate text
  let textAlpha;
  if (progress < 0.15) textAlpha = progress / 0.15;
  else if (progress < 0.7) textAlpha = 1;
  else textAlpha = 1 - (progress - 0.7) / 0.3;

  if (textAlpha > 0.01) {
    let col = color(f.color);
    let pulse = sin(a.timer * 0.12) * 0.15 + 0.85;
    _drawCinematicText(width / 2, height * 0.4, f.name, 28,
      red(col), green(col), blue(col), floor(textAlpha * pulse * 255));
    // Subtitle
    let subDesc = f.desc.split('\u2014')[1] ? f.desc.split('\u2014')[1].trim() : f.desc;
    _drawCinematicText(width / 2, height * 0.4 + 36, subDesc, 12,
      220, 210, 190, floor(textAlpha * 0.7 * 255));
  }
}

function drawFestivalBanner() {
  let f = getFestival();
  if (!f) return;
  let pulse = sin(frameCount * 0.05) * 0.3 + 0.7;
  fill(0, 0, 0, 120);
  noStroke();
  rectMode(CENTER);
  rect(width / 2, 55, 260, 28, 8);
  fill(color(f.color));
  textAlign(CENTER, CENTER);
  textSize(13);
  text(f.name + ' — ' + f.desc.split('—')[1].trim(), width / 2, 55);
  rectMode(CORNER);
}

function drawFestivalDecorations() {
  let f = getFestival();
  if (!f) return;
  let season = state.festival.season;

  // Floating lanterns near buildings during festivals
  (state.buildings || []).forEach((b, i) => {
    let lx = w2sX(b.x) + sin(frameCount * 0.02 + i * 1.7) * 8;
    let ly = w2sY(b.y) - 50 + cos(frameCount * 0.03 + i * 2.1) * 4;
    let pulse = sin(frameCount * 0.06 + i) * 0.3 + 0.7;
    fill(color(f.color + hex(floor(pulse * 180), 2).slice(-2)));
    noStroke();
    rect(floor(lx) - 4, floor(ly) - 5, 8, 10);
    fill(255, 255, 200, pulse * 200);
    rect(floor(lx) - 2, floor(ly) - 2, 4, 4);
    stroke(color(f.color));
    strokeWeight(0.5);
    line(lx, ly + 6, lx, ly + 14);
    noStroke();
  });

  // === Season-specific visual transformations ===
  if (season === 0) {
    // FLORALIA — pink/white flower petals drifting across screen
    for (let i = 0; i < 18; i++) {
      let seed = i * 137.5;
      let px = ((frameCount * 0.4 + seed * 7) % (width + 40)) - 20;
      let py = ((frameCount * 0.25 + seed * 11) % (height + 40)) - 20;
      let wobble = sin(frameCount * 0.03 + seed) * 12;
      let spin = sin(frameCount * 0.05 + seed * 0.3) * 3;
      let a = 100 + sin(frameCount * 0.04 + i) * 40;
      fill(i % 3 === 0 ? color(255, 220, 230, a) : (i % 3 === 1 ? color(255, 200, 210, a) : color(255, 245, 248, a)));
      ellipse(floor(px + wobble), floor(py), 3 + spin, 2 + spin * 0.5);
    }
  } else if (season === 1) {
    // NEPTUNALIA — water sparkle particles along coast edges
    let cx = w2sX(WORLD.islandCX), cy = w2sY(WORLD.islandCY);
    for (let i = 0; i < 24; i++) {
      let ang = (i / 24) * TWO_PI + frameCount * 0.003;
      let rx = WORLD.islandRX * 0.48 + sin(frameCount * 0.02 + i * 2.3) * 20;
      let ry = WORLD.islandRY * 0.48 + cos(frameCount * 0.025 + i * 1.7) * 15;
      let sx = cx + cos(ang) * rx;
      let sy = cy + sin(ang) * ry;
      if (sx < -10 || sx > width + 10 || sy < -10 || sy > height + 10) continue;
      let sparkle = sin(frameCount * 0.12 + i * 3.1) * 0.5 + 0.5;
      fill(180, 230, 255, floor(sparkle * 180));
      noStroke();
      let sz = 1 + sparkle * 2.5;
      rect(floor(sx), floor(sy), sz, sz);
      if (sparkle > 0.7) {
        fill(220, 245, 255, floor(sparkle * 100));
        rect(floor(sx) - 1, floor(sy), sz + 2, 1);
        rect(floor(sx), floor(sy) - 1, 1, sz + 2);
      }
    }
  } else if (season === 2) {
    // VINALIA — purple/amber grape-colored orbs drifting near buildings
    (state.buildings || []).forEach((b, i) => {
      for (let j = 0; j < 2; j++) {
        let seed = i * 47 + j * 113;
        let ox = sin(frameCount * 0.015 + seed) * 30;
        let oy = cos(frameCount * 0.02 + seed * 0.7) * 20 - 30;
        let bsx = w2sX(b.x) + ox;
        let bsy = w2sY(b.y) + oy;
        if (bsx < -10 || bsx > width + 10) continue;
        let pulse = sin(frameCount * 0.04 + seed) * 0.4 + 0.6;
        let c = j % 2 === 0 ? color(140, 50, 180, floor(pulse * 90)) : color(200, 140, 40, floor(pulse * 70));
        fill(c);
        noStroke();
        ellipse(floor(bsx), floor(bsy), 5, 5);
        fill(j % 2 === 0 ? color(170, 80, 220, floor(pulse * 40)) : color(230, 180, 60, floor(pulse * 30)));
        ellipse(floor(bsx), floor(bsy), 9, 9);
      }
    });
  } else if (season === 3) {
    // SATURNALIA — golden sparkle particles scattered across screen
    for (let i = 0; i < 20; i++) {
      let seed = i * 97.3;
      let px = (sin(frameCount * 0.008 + seed) * 0.5 + 0.5) * width;
      let py = (cos(frameCount * 0.006 + seed * 1.3) * 0.5 + 0.5) * height;
      let twinkle = sin(frameCount * 0.1 + seed * 2.7) * 0.5 + 0.5;
      if (twinkle < 0.3) continue;
      fill(255, 210, 80, floor(twinkle * 160));
      noStroke();
      let sz = 1 + twinkle * 2;
      rect(floor(px), floor(py), sz, sz);
      if (twinkle > 0.6) {
        fill(255, 230, 140, floor(twinkle * 80));
        rect(floor(px) - 1, floor(py), sz + 2, 1);
        rect(floor(px), floor(py) - 1, 1, sz + 2);
      }
    }
    // Extra torch glow on buildings
    (state.buildings || []).forEach((b, i) => {
      let bx = w2sX(b.x), by = w2sY(b.y);
      if (bx < -40 || bx > width + 40) return;
      let flicker = sin(frameCount * 0.08 + i * 2.5) * 0.2 + 0.8;
      fill(255, 180, 50, floor(flicker * 30));
      noStroke();
      ellipse(floor(bx), floor(by) - 20, 40 * flicker, 30 * flicker);
    });
  }
}

function drawFestivalOverlay() {
  let f = getFestival();
  if (!f) return;
  let season = state.festival.season;
  push();
  noStroke();
  if (season === 0) {
    // Floralia — warm pink tint
    fill(255, 140, 180, 8);
    rect(0, 0, width, height);
  } else if (season === 1) {
    // Neptunalia — deeper blue overlay
    fill(20, 60, 140, 10);
    rect(0, 0, width, height);
  } else if (season === 2) {
    // Vinalia — purple/amber tint
    fill(120, 40, 160, 7);
    rect(0, 0, width, height);
    fill(180, 130, 30, 5);
    rect(0, 0, width, height);
  } else if (season === 3) {
    // Saturnalia — warm golden light
    fill(255, 200, 80, 12);
    rect(0, 0, width, height);
  }
  pop();
}

function updateFestival(dt) {
  if (!state.festival || !state.festival.active) return;
  state.festival.timer += dt;
  let f = FESTIVALS[state.festival.season];
  // Saturnalia gold rain: +1 gold every 3 seconds
  if (f.effect.goldRain && frameCount % 180 === 0) {
    state.gold += 1;
    let rx = state.player.x + random(-60, 60);
    let ry = state.player.y + random(-60, 60);
    spawnParticles(rx, ry, 'harvest', 3);
    addFloatingText(w2sX(rx), w2sY(ry) - 20, '+1 Gold', '#ffcc44');
  }
}

// ─── RANDOM EVENTS ───────────────────────────────────────────────────────
// 1 day = ~8000 frames (~133s). Duration values below are in frames.
const EVENT_DEFS = [
  {
    id: 'festival_day',
    name: 'FESTIVAL DAY',
    desc: 'All NPCs rejoice! +50% harvest yield.',
    duration: 8000,    // 1 full day
    cooldown: 7,       // days before it can fire again
    oneShot: false,
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Festival Day! All rejoice!', '#ffdd66');
      spawnParticles(state.player.x, state.player.y, 'harvest', 20);
      if (snd) snd.playSFX('festival_start');
    },
    onEnd() {},
  },
  {
    id: 'storm_surge',
    name: 'STORM SURGE',
    desc: 'Heavy weather — crystal nodes charge 2x faster.',
    duration: 4000,    // half a day
    cooldown: 5,
    oneShot: false,
    onStart() {
      state.weather = { type: 'rain', timer: 4000, intensity: 0.9 };
      addFloatingText(width / 2, height * 0.22, 'Storm Surge! Crystal nodes pulse!', '#88ccff');
      spawnParticles(state.player.x, state.player.y, 'divine', 8);
    },
    onEnd() {},
  },
  {
    id: 'wandering_merchant',
    name: 'WANDERING MERCHANT',
    desc: 'A rare merchant has anchored at the dock.',
    duration: 8000,    // 1 day
    cooldown: 10,
    oneShot: false,
    onStart() {
      // Pick 3 random items from the wandering merchant pool
      let pool = [
        { name: 'Exotic Spice', resource: 'exoticSpices', qty: 2, cost: 40 },
        { name: 'Ancient Relic', resource: 'ancientRelic', qty: 1, cost: 70 },
        { name: 'Titan Bone', resource: 'titanBone', qty: 1, cost: 55 },
        { name: 'Soul Essence', resource: 'soulEssence', qty: 2, cost: 80 },
        { name: 'Rare Hide', resource: 'rareHide', qty: 2, cost: 35 },
        { name: 'Crystal Shard', resource: 'crystals', qty: 5, cost: 30 },
        { name: 'Iron Ore', resource: 'ironOre', qty: 3, cost: 25 },
        { name: 'Rare Seeds', resource: 'seeds', qty: 8, cost: 20 },
      ];
      let shuffled = [...pool].sort(() => random() - 0.5);
      state.activeEvent.data.stock = shuffled.slice(0, 3).map(i => ({ ...i, sold: false }));
      // Place merchant near dock
      state.activeEvent.data.x = WORLD.islandCX + WORLD.islandRX - 80;
      state.activeEvent.data.y = WORLD.islandCY + 60;
      addFloatingText(width / 2, height * 0.22, 'A rare merchant anchors at the dock!', '#ffcc44');
      if (snd) snd.playSFX('visitor_arrive');
    },
    onEnd() {
      if (state.activeEvent && state.activeEvent.data.shopOpen) {
        state.activeEvent.data.shopOpen = false;
      }
    },
  },
  {
    id: 'harvest_moon',
    name: 'HARVEST MOON',
    desc: 'Night crops glow — all farms grow 2x tonight.',
    duration: 4000,    // one night
    cooldown: 8,
    oneShot: false,
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Harvest Moon rises! Crops grow twice as fast!', '#ffeeaa');
      spawnParticles(state.player.x, state.player.y, 'harvest', 15);
    },
    onEnd() {},
  },
  {
    id: 'solar_eclipse',
    name: 'SOLAR ECLIPSE',
    desc: 'The sky darkens. Crystal power doubles.',
    duration: 200,     // brief — ~3 seconds
    cooldown: 14,
    oneShot: false,
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Solar Eclipse! Crystal power surges!', '#cc88ff');
      spawnParticles(state.player.x, state.player.y, 'divine', 20);
      if (snd) snd.playSFX('crystal_charge');
    },
    onEnd() {},
  },
  {
    id: 'ancient_spirit',
    name: 'ANCIENT SPIRIT',
    desc: 'A ghost stirs at the ruins. Approach for a prophecy.',
    duration: 8000,    // 1 day window to interact
    cooldown: 0,       // irrelevant — oneShot
    oneShot: true,
    onStart() {
      // Find a ruin position; fall back to centre of island
      let ruinPos = state.ruins && state.ruins.length > 0
        ? state.ruins[0]
        : { x: WORLD.islandCX - 200, y: WORLD.islandCY - 80 };
      state.activeEvent.data.x = ruinPos.x;
      state.activeEvent.data.y = ruinPos.y;
      state.activeEvent.data.interacted = false;
      addFloatingText(width / 2, height * 0.22, 'An Ancient Spirit lingers at the ruins...', '#aaddff');
      spawnParticles(ruinPos.x, ruinPos.y, 'divine', 12);
    },
    onEnd() {},
  },
  {
    id: 'pirate_raid',
    name: 'PIRATE RAID',
    desc: 'Pirates spotted offshore! Defend the island!',
    duration: 7200,    // ~2 in-game hours
    cooldown: 3,
    oneShot: false,
    eligible() { return state.gold >= 100; },
    onStart() {
      state.activeEvent.data.pirates = [];
      state.activeEvent.data.spawned = false;
      state.activeEvent.data.defeated = 0;
      state.activeEvent.data.shipX = WORLD.islandCX;
      state.activeEvent.data.shipY = WORLD.islandCY + (state.islandRY || WORLD.islandRY) + 80;
      addFloatingText(width / 2, height * 0.22, 'Pirates spotted offshore!', '#ff4444');
      triggerScreenShake(4, 15);
      if (snd) snd.playSFX('visitor_arrive');
    },
    onEnd() {
      let d = state.activeEvent ? state.activeEvent.data : {};
      if (d.defeated >= 5) {
        state.gold += 50;
        addFloatingText(width / 2, height * 0.25, 'Pirates defeated! +50 gold bounty!', '#ffcc44');
      } else if (d.spawned) {
        let loss = floor(state.gold * 0.25);
        state.gold = max(0, state.gold - loss);
        addFloatingText(width / 2, height * 0.25, 'Pirates escaped with ' + loss + ' gold!', '#ff6644');
      } else {
        addFloatingText(width / 2, height * 0.25, 'The pirates sailed away.', '#888888');
      }
    },
  },
  {
    id: 'harvest_windfall',
    name: 'HARVEST WINDFALL',
    desc: 'Sol smiles on us today! Crops yield double!',
    duration: 8000,    // 1 full day
    cooldown: 8,
    oneShot: false,
    eligible() { return true; }, // triggered on season change (20% chance)
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Harvest Windfall! Crops yield double today!', '#ffdd44');
      spawnParticles(state.player.x, state.player.y, 'harvest', 25);
      if (snd) snd.playSFX('festival_start');
    },
    onEnd() {},
  },
  {
    id: 'crystal_surge',
    name: 'CRYSTAL SURGE',
    desc: 'Ancient energy pulses through the crystals!',
    duration: 24000,   // 3 in-game days
    cooldown: 15,
    oneShot: false,
    eligible() { return (state.islandLevel || 1) >= 10; },
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'The crystals pulse with ancient energy!', '#44ffdd');
      if (state.crystalShrine) spawnParticles(state.crystalShrine.x, state.crystalShrine.y, 'divine', 20);
      if (snd) snd.playSFX('crystal_charge');
    },
    onEnd() {},
  },
  {
    id: 'ghost_sighting',
    name: 'GHOST SIGHTING',
    desc: 'A restless spirit wanders the ruins at night...',
    duration: 6000,    // shorter than ancient_spirit, ~night window
    cooldown: 6,
    oneShot: false,
    eligible() {
      let hour = floor(state.time / 60);
      return (state.islandLevel || 1) >= 8 && hour >= 22;
    },
    onStart() {
      let ruinPos = state.ruins && state.ruins.length > 0
        ? state.ruins[floor(random(state.ruins.length))]
        : { x: WORLD.islandCX - 200, y: WORLD.islandCY - 80 };
      state.activeEvent.data.originX = ruinPos.x;
      state.activeEvent.data.originY = ruinPos.y;
      state.activeEvent.data.talked = false;
      state.activeEvent.data.hintIdx = floor(random(8));
      addFloatingText(width / 2, height * 0.22, 'A restless spirit stirs near the ruins...', '#aaaaff');
      spawnParticles(ruinPos.x, ruinPos.y, 'divine', 10);
    },
    onEnd() {},
  },
  {
    id: 'wandering_soldier',
    name: 'WANDERING SOLDIER',
    desc: 'A weary soldier arrives seeking trade.',
    duration: 8000,    // 1 day
    cooldown: 30,
    oneShot: false,
    eligible() { return state.day >= 30; },
    onStart() {
      let port = getPortPosition();
      let names = ['Gaius', 'Lucius', 'Titus', 'Publius', 'Decimus', 'Quintus', 'Sextus'];
      let stories = [
        'I marched from Carthage. My legion is dust.',
        'Three years at the frontier. I seek only rest.',
        'I carry a message that will never arrive.',
        'The empire forgets its soldiers, but we endure.',
        'I deserted after Pannonia. Judge me if you will.',
        'My shield arm is weak, but my will is not.',
        'I traded my gladius for bread. Now I trade bread for hope.',
      ];
      let ni = floor(random(names.length));
      state.activeEvent.data.x = port.x;
      state.activeEvent.data.y = port.y;
      state.activeEvent.data.name = names[ni];
      state.activeEvent.data.story = stories[ni % stories.length];
      state.activeEvent.data.traded = false;
      // Random trade: player gives resource, gets rare item
      let trades = [
        { give: 'iron', giveAmt: 5, get: 'steel', getAmt: 3, giveLabel: '5 Iron', getLabel: '3 Steel' },
        { give: 'wood', giveAmt: 15, get: 'gold', getAmt: 60, giveLabel: '15 Wood', getLabel: '60 Gold' },
        { give: 'fish', giveAmt: 10, get: 'crystals', getAmt: 5, giveLabel: '10 Fish', getLabel: '5 Crystals' },
        { give: 'harvest', giveAmt: 12, get: 'seeds', getAmt: 10, giveLabel: '12 Harvest', getLabel: '10 Seeds' },
        { give: 'stone', giveAmt: 10, get: 'ironOre', getAmt: 6, giveLabel: '10 Stone', getLabel: '6 Iron Ore' },
      ];
      state.activeEvent.data.trade = trades[floor(random(trades.length))];
      addFloatingText(width / 2, height * 0.22, 'A weary soldier arrives at the dock...', '#cc8844');
      if (snd) snd.playSFX('visitor_arrive');
    },
    onEnd() {},
  },
  // ─── NEW EVENTS ─────────────────────────────────────────────────────
  {
    id: 'earthquake',
    name: 'EARTHQUAKE',
    desc: 'The ground shakes! Buildings may crack, but ores surface.',
    duration: 600,     // brief tremor ~10 seconds
    cooldown: 12,
    oneShot: false,
    eligible() { return (state.islandLevel || 1) >= 3; },
    onStart() {
      triggerScreenShake(8, 60);
      addFloatingText(width / 2, height * 0.22, 'Earthquake! The island trembles!', '#ff6633');
      if (snd) snd.playSFX('crystal_charge');
      // Damage: random building loses some durability visual; reward: free ores
      let oreGain = 3 + floor(random(5));
      state.stone = (state.stone || 0) + oreGain;
      state.ironOre = (state.ironOre || 0) + floor(oreGain / 2);
      addFloatingText(width / 2, height * 0.28, '+' + oreGain + ' Stone, +' + floor(oreGain / 2) + ' Iron Ore surfaced!', '#ccaa66');
      // Crops can be damaged — 30% chance each growing crop wilts back one stage
      let damaged = 0;
      if (state.plots) {
        state.plots.forEach(p => {
          if (p.planted && !p.ripe && p.stage > 0 && random() < 0.3) {
            p.stage = max(0, p.stage - 1);
            p.timer = 0;
            damaged++;
          }
        });
      }
      if (damaged > 0) addFloatingText(width / 2, height * 0.34, damaged + ' crops shaken back!', '#ff8866');
      // Chain: earthquake can trigger aftershock
      state.activeEvent.data.chainAfterShock = random() < 0.35;
      spawnParticles(state.player.x, state.player.y, 'hit', 15);
    },
    onEnd() {
      if (state.activeEvent && state.activeEvent.data.chainAfterShock) {
        _pendingChainEvent = 'aftershock';
        _pendingChainDelay = 300; // ~5 seconds later
      }
    },
  },
  {
    id: 'aftershock',
    name: 'AFTERSHOCK',
    desc: 'A second tremor! Crystal nodes crack open.',
    duration: 300,
    cooldown: 20,
    oneShot: false,
    eligible() { return false; }, // only triggered by chain, never random
    onStart() {
      triggerScreenShake(5, 40);
      addFloatingText(width / 2, height * 0.22, 'Aftershock! Crystal veins split open!', '#66ddff');
      let crystalGain = 3 + floor(random(4));
      state.crystals = (state.crystals || 0) + crystalGain;
      addFloatingText(width / 2, height * 0.28, '+' + crystalGain + ' Crystals!', '#44ffdd');
      spawnParticles(state.player.x, state.player.y, 'divine', 12);
    },
    onEnd() {},
  },
  {
    id: 'whale_sighting',
    name: 'WHALE SIGHTING',
    desc: 'A great whale breaches! Fish flock to shore for 1 day.',
    duration: 8000,
    cooldown: 10,
    oneShot: false,
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'A great whale breaches off the coast!', '#55aadd');
      state.activeEvent.data.whaleX = WORLD.islandCX + random(-100, 100);
      state.activeEvent.data.whaleY = WORLD.islandCY + (state.islandRY || WORLD.islandRY) + 60;
      state.activeEvent.data.bonusFishGiven = 0;
      if (snd) snd.playSFX('visitor_arrive');
      spawnParticles(state.activeEvent.data.whaleX, state.activeEvent.data.whaleY, 'burst', 20);
    },
    onEnd() {
      let bonus = state.activeEvent ? state.activeEvent.data.bonusFishGiven || 0 : 0;
      if (bonus > 0) addFloatingText(width / 2, height * 0.25, 'The whale departs. ' + bonus + ' bonus fish caught!', '#55aadd');
    },
  },
  {
    id: 'merchant_caravan',
    name: 'MERCHANT CARAVAN',
    desc: 'A trade fleet arrives! All shop prices halved today.',
    duration: 8000,
    cooldown: 14,
    oneShot: false,
    eligible() { return state.day >= 10; },
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'A merchant caravan arrives! Prices halved!', '#ffaa33');
      // Gift some free gold and resources
      state.gold = (state.gold || 0) + 25;
      state.seeds = (state.seeds || 0) + 5;
      addFloatingText(width / 2, height * 0.28, '+25 Gold, +5 Seeds as gifts!', '#ffcc44');
      if (snd) snd.playSFX('festival_start');
      spawnParticles(state.player.x, state.player.y, 'harvest', 18);
      // Chain: merchant caravan can attract bandits
      state.activeEvent.data.chainBandit = random() < 0.25;
    },
    onEnd() {
      if (state.activeEvent && state.activeEvent.data.chainBandit) {
        _pendingChainEvent = 'bandit_raid';
        _pendingChainDelay = 600; // ~10 seconds after caravan leaves
      }
    },
  },
  {
    id: 'bandit_raid',
    name: 'BANDIT RAID',
    desc: 'Bandits ambush the island! Defend your stores!',
    duration: 6000,
    cooldown: 8,
    oneShot: false,
    eligible() { return state.day >= 15 && (state.gold || 0) >= 50; },
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Bandits raid the island!', '#ff4444');
      triggerScreenShake(4, 15);
      if (snd) snd.playSFX('visitor_arrive');
      state.activeEvent.data.bandits = [];
      state.activeEvent.data.defeated = 0;
      state.activeEvent.data.spawned = false;
      // Bandits spawn from the forest edge (north side)
      let spawnX = WORLD.islandCX + random(-150, 150);
      let spawnY = WORLD.islandCY - (state.islandRY || WORLD.islandRY) * 0.6;
      state.activeEvent.data.spawnX = spawnX;
      state.activeEvent.data.spawnY = spawnY;
      // Spawn 3 bandits immediately
      for (let i = 0; i < 3; i++) {
        state.activeEvent.data.bandits.push({
          x: spawnX + random(-40, 40),
          y: spawnY + random(-20, 20),
          hp: 30, maxHp: 30,
          vx: 0, vy: 0,
          speed: 1.2 + random(0.3),
          damage: 8,
          size: 12,
          facing: 1,
          flashTimer: 0,
          attackCooldown: 0,
          targetType: 'player', // bandits target player or steal from buildings
        });
      }
      state.activeEvent.data.spawned = true;
      state.activeEvent.data.stolenGold = 0;
    },
    onEnd() {
      let d = state.activeEvent ? state.activeEvent.data : {};
      if (d.defeated >= 3) {
        state.gold = (state.gold || 0) + 30;
        addFloatingText(width / 2, height * 0.25, 'Bandits routed! +30 gold recovered!', '#ffcc44');
      } else {
        let stolen = min(floor((state.gold || 0) * 0.15), 40);
        state.gold = max(0, (state.gold || 0) - stolen);
        addFloatingText(width / 2, height * 0.25, 'Bandits escaped with ' + stolen + ' gold!', '#ff6644');
      }
    },
  },
  // ─── SEASONAL EVENTS (one per season, triggered by season check) ────
  {
    id: 'spring_bloom',
    name: 'SPRING BLOOM',
    desc: 'Wildflowers erupt! All crops advance one growth stage.',
    duration: 4000,
    cooldown: 40, // once per year basically
    oneShot: false,
    seasonal: 0, // spring only
    eligible() { return getSeason() === 0; },
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Spring Bloom! Nature surges forward!', '#ff88cc');
      if (state.plots) {
        state.plots.forEach(p => {
          if (p.planted && !p.ripe && p.stage < 3) {
            p.stage++;
            p.timer = 0;
          }
        });
      }
      addFloatingText(width / 2, height * 0.28, 'All growing crops advanced a stage!', '#88ff88');
      if (snd) snd.playSFX('festival_start');
      spawnParticles(state.player.x, state.player.y, 'harvest', 20);
    },
    onEnd() {},
  },
  {
    id: 'summer_drought',
    name: 'SUMMER DROUGHT',
    desc: 'Scorching heat! Crops wilt without water, but solar doubles.',
    duration: 8000,
    cooldown: 40,
    oneShot: false,
    seasonal: 1,
    eligible() { return getSeason() === 1; },
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Summer Drought! Sol burns bright!', '#ffaa00');
      // Dry out crops that aren't near aqueducts
      if (state.plots) {
        state.plots.forEach(p => {
          if (p.planted && !p.ripe && p.stage > 0) {
            let nearAqueduct = state.buildings && state.buildings.some(b => b.type === 'aqueduct' && dist(b.x, b.y, p.x, p.y) < 80);
            if (!nearAqueduct && random() < 0.4) {
              p.stage = max(0, p.stage - 1);
              p.timer = 0;
            }
          }
        });
      }
      addFloatingText(width / 2, height * 0.28, 'Unwatered crops wilt! Build aqueducts!', '#ff8844');
      spawnParticles(state.player.x, state.player.y, 'burst', 10);
    },
    onEnd() {},
  },
  {
    id: 'autumn_bounty',
    name: 'AUTUMN BOUNTY',
    desc: 'Ceres blesses the harvest! All ripe crops yield triple.',
    duration: 8000,
    cooldown: 40,
    oneShot: false,
    seasonal: 2,
    eligible() { return getSeason() === 2; },
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Autumn Bounty! Ceres smiles upon you!', '#dd7722');
      if (snd) snd.playSFX('festival_start');
      spawnParticles(state.player.x, state.player.y, 'harvest', 25);
    },
    onEnd() {},
  },
  {
    id: 'winter_frost',
    name: 'WINTER FROST',
    desc: 'Deep frost! Non-winter crops freeze, but crystals form.',
    duration: 6000,
    cooldown: 40,
    oneShot: false,
    seasonal: 3,
    eligible() { return getSeason() === 3; },
    onStart() {
      addFloatingText(width / 2, height * 0.22, 'Winter Frost descends!', '#88ddff');
      // Kill non-frostherb crops that are still growing
      let frozen = 0;
      if (state.plots) {
        state.plots.forEach(p => {
          if (p.planted && !p.ripe && p.cropType !== 'frostherb') {
            if (random() < 0.5) {
              p.planted = false; p.stage = 0; p.timer = 0; p.ripe = false;
              frozen++;
            }
          }
        });
      }
      if (frozen > 0) addFloatingText(width / 2, height * 0.28, frozen + ' crops frozen solid!', '#aaddff');
      // Reward: crystal formation
      let crystalGain = 2 + floor(random(4));
      state.crystals = (state.crystals || 0) + crystalGain;
      addFloatingText(width / 2, height * 0.34, '+' + crystalGain + ' Crystals formed from frost!', '#44ffdd');
      spawnParticles(state.player.x, state.player.y, 'divine', 15);
    },
    onEnd() {},
  },
];

// ─── EVENT CHAIN SYSTEM ─────────────────────────────────────────────────
let _pendingChainEvent = null;
let _pendingChainDelay = 0;

function updateEventChain(dt) {
  if (!_pendingChainEvent) return;
  if (state.activeEvent) return; // wait for current event to fully clear
  _pendingChainDelay -= dt;
  if (_pendingChainDelay <= 0) {
    let chainId = _pendingChainEvent;
    _pendingChainEvent = null;
    let def = EVENT_DEFS.find(d => d.id === chainId);
    if (def) {
      state.activeEvent = { id: def.id, timer: def.duration, data: {} };
      if (!def.oneShot) state.eventCooldown[def.id] = def.cooldown;
      def.onStart();
    }
  }
}

function isEventEligible(def) {
  if (def.oneShot && state.eventHistory.includes(def.id)) return false;
  let cd = state.eventCooldown[def.id] || 0;
  if (cd > 0) return false;
  if (def.eligible && !def.eligible()) return false;
  return true;
}

function checkRandomEvent() {
  if (state.activeEvent) return;
  // Balanced frequency: 30% base, +10% if no event in 3+ days
  let chance = 0.30;
  let daysSince = state._daysSinceLastEvent || 0;
  if (daysSince >= 3) chance += 0.10;
  if (daysSince >= 5) chance += 0.15; // catch-up if player hasn't seen anything
  if (random() > chance) {
    state._daysSinceLastEvent = (state._daysSinceLastEvent || 0) + 1;
    return;
  }
  // Prioritize seasonal events if season just changed
  let seasonDay = state.day % 10; // day within season
  let eligible = EVENT_DEFS.filter(isEventEligible);
  if (!eligible.length) return;
  // Weight seasonal events higher on first 2 days of season
  let picked;
  let seasonalEligible = eligible.filter(d => d.seasonal !== undefined && d.seasonal === getSeason());
  if (seasonDay <= 1 && seasonalEligible.length > 0 && random() < 0.6) {
    picked = seasonalEligible[floor(random(seasonalEligible.length))];
  } else {
    picked = eligible[floor(random(eligible.length))];
  }
  state.activeEvent = { id: picked.id, timer: picked.duration, data: {} };
  state._daysSinceLastEvent = 0;
  // Tick down other cooldowns by 1 day
  EVENT_DEFS.forEach(d => {
    if (state.eventCooldown[d.id] > 0) state.eventCooldown[d.id]--;
  });
  // Set cooldown for this event
  if (!picked.oneShot) state.eventCooldown[picked.id] = picked.cooldown;
  if (picked.oneShot) state.eventHistory.push(picked.id);
  picked.onStart();
}

function updateActiveEvent(dt) {
  updateEventChain(dt);
  if (!state.activeEvent) {
    // Tick cooldowns even when no event is active (catch-all in case checkRandomEvent skips)
    return;
  }
  let def = EVENT_DEFS.find(d => d.id === state.activeEvent.id);
  if (!def) { state.activeEvent = null; return; }

  state.activeEvent.timer -= dt;

  // Per-frame effects
  if (def.id === 'festival_day') {
    // Spawn golden particles occasionally
    if (frameCount % 90 === 0) {
      let rx = state.player.x + random(-120, 120);
      let ry = state.player.y + random(-80, 80);
      spawnParticles(rx, ry, 'harvest', 2);
    }
  }

  // Pirate raid — spawn pirates when player approaches shore
  if (def.id === 'pirate_raid') {
    let d = state.activeEvent.data;
    if (!d.spawned) {
      let py = state.player.y;
      let shoreY = WORLD.islandCY + (state.islandRY || WORLD.islandRY) * 0.7;
      if (py > shoreY) {
        d.spawned = true;
        d.pirates = [];
        for (let i = 0; i < 5; i++) {
          d.pirates.push({
            x: d.shipX + random(-60, 60),
            y: d.shipY - 30 - random(20, 60),
            hp: 40, maxHp: 40,
            vx: 0, vy: 0,
            speed: 1.4 + random(0.3),
            damage: 10,
            size: 13,
            facing: 1,
            flashTimer: 0,
            attackCooldown: 0,
          });
        }
        addFloatingText(width / 2, height * 0.3, 'Pirates are attacking!', '#ff4444');
        triggerScreenShake(6, 20);
      }
    }
    // Update pirate enemies
    if (d.pirates) {
      for (let i = d.pirates.length - 1; i >= 0; i--) {
        let p = d.pirates[i];
        if (p.flashTimer > 0) p.flashTimer--;
        if (p.attackCooldown > 0) p.attackCooldown--;
        // Chase player
        let dx = state.player.x - p.x, dy = state.player.y - p.y;
        let dd = sqrt(dx * dx + dy * dy);
        if (dd > 30) {
          p.x += (dx / dd) * p.speed;
          p.y += (dy / dd) * p.speed;
          p.facing = dx > 0 ? 1 : -1;
        } else if (p.attackCooldown <= 0) {
          // Attack player
          if (state.player.invincTimer <= 0) {
            let armor = state.player.armor || 0;
            let dmgReduce = armor === 1 ? 3 : armor === 2 ? 6 : armor === 3 ? 10 : 0;
            state.player.hp = max(0, state.player.hp - max(1, p.damage - dmgReduce));
            state.player.invincTimer = 30;
            p.attackCooldown = 50;
          }
        }
        // Check if player killed this pirate (slashPhase active and in range)
        if (state.player.slashPhase > 0 && dd < state.player.attackRange + 10) {
          p.hp -= state.player.attackDamage;
          p.flashTimer = 6;
          if (p.hp <= 0) {
            d.defeated++;
            d.pirates.splice(i, 1);
            spawnParticles(p.x, p.y, 'hit', 6);
            if (d.defeated >= 5) {
              state.activeEvent.timer = 1; // end event next frame
            }
          }
        }
      }
    }
  }

  // Harvest windfall — golden shimmer particles on farms
  if (def.id === 'harvest_windfall') {
    if (frameCount % 60 === 0 && state.farms) {
      for (let f of state.farms) {
        if (f.crop) spawnParticles(f.x, f.y, 'harvest', 1);
      }
    }
  }

  // Crystal surge — extra particles around shrine
  if (def.id === 'crystal_surge') {
    if (frameCount % 8 === 0 && state.crystalShrine) {
      let sh = state.crystalShrine;
      spawnParticles(sh.x + random(-40, 40), sh.y + random(-30, 30), 'divine', 1);
    }
  }

  // Ghost sighting — patrol around ruins
  if (def.id === 'ghost_sighting') {
    let d = state.activeEvent.data;
    let t = frameCount * 0.01;
    d.currentX = d.originX + cos(t) * 40;
    d.currentY = d.originY + sin(t) * 25;
  }

  // Wandering soldier — walk toward island center
  if (def.id === 'wandering_soldier') {
    let d = state.activeEvent.data;
    let dx = WORLD.islandCX - d.x;
    let dy = WORLD.islandCY - d.y;
    let dd = sqrt(dx * dx + dy * dy);
    if (dd > 80) {
      d.x += (dx / dd) * 0.5;
      d.y += (dy / dd) * 0.3;
    }
  }

  // Whale sighting — bonus fish when player fishes during event
  if (def.id === 'whale_sighting') {
    let d = state.activeEvent.data;
    // Animate whale bob
    d.whalePhase = (d.whalePhase || 0) + 0.02;
    // Periodic free fish splash near shore
    if (frameCount % 300 === 0) {
      let bonusFish = 1 + floor(random(2));
      state.fish = (state.fish || 0) + bonusFish;
      d.bonusFishGiven = (d.bonusFishGiven || 0) + bonusFish;
      let rx = d.whaleX + random(-80, 80);
      let ry = d.whaleY - random(20, 50);
      addFloatingText(w2sX(rx), w2sY(ry), '+' + bonusFish + ' Fish!', '#55aadd');
      spawnParticles(rx, ry, 'burst', 4);
    }
  }

  // Bandit raid — bandits chase player and try to steal
  if (def.id === 'bandit_raid') {
    let d = state.activeEvent.data;
    if (d.bandits) {
      for (let i = d.bandits.length - 1; i >= 0; i--) {
        let b = d.bandits[i];
        if (b.flashTimer > 0) b.flashTimer--;
        if (b.attackCooldown > 0) b.attackCooldown--;
        let dx = state.player.x - b.x, dy = state.player.y - b.y;
        let dd = sqrt(dx * dx + dy * dy);
        if (dd > 25) {
          b.x += (dx / dd) * b.speed;
          b.y += (dy / dd) * b.speed;
          b.facing = dx > 0 ? 1 : -1;
        } else if (b.attackCooldown <= 0) {
          if (state.player.invincTimer <= 0) {
            let armor = state.player.armor || 0;
            let dmgReduce = armor === 1 ? 2 : armor === 2 ? 5 : armor === 3 ? 8 : 0;
            state.player.hp = max(0, state.player.hp - max(1, b.damage - dmgReduce));
            state.player.invincTimer = 30;
            b.attackCooldown = 45;
          }
        }
        // Player can kill bandits with attacks
        if (state.player.slashPhase > 0 && dd < (state.player.attackRange || 30) + 8) {
          b.hp -= state.player.attackDamage || 15;
          b.flashTimer = 6;
          if (b.hp <= 0) {
            d.defeated++;
            d.bandits.splice(i, 1);
            spawnParticles(b.x, b.y, 'hit', 6);
            if (d.defeated >= 3) {
              state.activeEvent.timer = 1;
            }
          }
        }
      }
    }
  }

  // Merchant caravan — golden particles near docks
  if (def.id === 'merchant_caravan') {
    if (frameCount % 90 === 0) {
      let rx = WORLD.islandCX + WORLD.islandRX - 60 + random(-30, 30);
      let ry = WORLD.islandCY + 40 + random(-20, 20);
      spawnParticles(rx, ry, 'harvest', 2);
    }
  }

  // Summer drought — solar energy bonus (handled by getEventSolarMult)
  // Autumn bounty — harvest triple (handled by getEventHarvestMult)

  if (state.activeEvent.timer <= 0) {
    def.onEnd();
    state.activeEvent = null;
  }
}

// Returns the harvest multiplier contributed by active events (applied on crop harvest)
function getEventHarvestMult() {
  if (!state.activeEvent) return 1;
  let id = state.activeEvent.id;
  if (id === 'festival_day') return 1.5;
  if (id === 'harvest_moon') return 2.0;
  if (id === 'harvest_windfall') return 2.0;
  if (id === 'autumn_bounty') return 3.0;
  return 1;
}

// Returns the crystal charge rate multiplier from active events
function getEventCrystalMult() {
  if (!state.activeEvent) return 1;
  let id = state.activeEvent.id;
  if (id === 'storm_surge') return 2;
  if (id === 'solar_eclipse') return 2;
  if (id === 'crystal_surge') return 2;
  if (id === 'winter_frost') return 1.5;
  return 1;
}

// Returns the crop growth timer multiplier (lower = faster growth) from active events
function getEventCropGrowthMult() {
  if (!state.activeEvent) return 1;
  let id = state.activeEvent.id;
  if (id === 'harvest_moon') return 0.5; // 2x speed = half the timer
  if (id === 'spring_bloom') return 0.5;
  return 1;
}

// Returns shop price multiplier from active events
function getEventShopPriceMult() {
  if (!state.activeEvent) return 1;
  if (state.activeEvent.id === 'merchant_caravan') return 0.5;
  return 1;
}

// Returns solar energy multiplier from active events
function getEventSolarMult() {
  if (!state.activeEvent) return 1;
  if (state.activeEvent.id === 'summer_drought') return 2.0;
  return 1;
}

// Returns fishing catch multiplier from active events
function getEventFishMult() {
  if (!state.activeEvent) return 1;
  if (state.activeEvent.id === 'whale_sighting') return 2.0;
  return 1;
}

function drawEventBanner() {
  if (!state.activeEvent) return;
  let def = EVENT_DEFS.find(d => d.id === state.activeEvent.id);
  if (!def) return;

  push();
  noStroke();
  // Dark strip across top
  fill(0, 0, 0, 160);
  rectMode(CORNER);
  rect(0, 0, width, 30);
  // Gold event name left, description centre-right
  textAlign(LEFT, CENTER);
  textSize(9);
  fill(80, 60, 20, 200);
  rect(0, 0, width, 30);
  // Gold shimmer strip
  fill(200, 160, 40, 40);
  rect(0, 0, width, 2);
  fill(200, 160, 40, 40);
  rect(0, 28, width, 2);

  let pulse = sin(frameCount * 0.06) * 0.3 + 0.7;
  fill(255, 220, 80, floor(pulse * 255));
  textSize(10);
  textAlign(LEFT, CENTER);
  text(def.name, 10, 15);

  fill(220, 200, 140, 220);
  textSize(9);
  textAlign(CENTER, CENTER);
  text(def.desc, width / 2 + 50, 15);

  // Timer bar — thin gold progress across bottom of strip
  let progress = state.activeEvent.timer / def.duration;
  fill(180, 140, 30, 140);
  rect(0, 27, width * progress, 3);
  pop();

  // Wandering merchant: draw tent + NPC + interaction prompt
  if (def.id === 'wandering_merchant' && state.activeEvent.data.x !== undefined) {
    let mx = state.activeEvent.data.mx !== undefined ? state.activeEvent.data.mx : state.activeEvent.data.x;
    let my = state.activeEvent.data.my !== undefined ? state.activeEvent.data.my : state.activeEvent.data.y;
    let sx = w2sX(mx), sy = w2sY(my) + floatOffset;
    push();
    noStroke();
    // Tent — colorful striped awning
    // Tent poles
    fill(100, 80, 50);
    rect(sx - 20, sy - 5, 3, 22); rect(sx + 17, sy - 5, 3, 22);
    // Striped awning
    for (let s = 0; s < 5; s++) {
      fill(s % 2 === 0 ? color(180, 50, 40) : color(230, 200, 80));
      rect(sx - 22 + s * 9, sy - 12, 9, 8);
    }
    // Table with goods
    fill(140, 120, 80);
    rect(sx - 18, sy + 2, 36, 6);
    fill(200, 180, 100); rect(sx - 12, sy - 2, 6, 4);
    fill(80, 180, 160); rect(sx - 2, sy - 2, 5, 4);
    fill(160, 100, 60); rect(sx + 8, sy - 2, 6, 4);
    // Merchant figure (behind table)
    fill(180, 120, 60);
    ellipse(sx, sy - 18, 12, 12);
    fill(120, 70, 30);
    rect(sx - 5, sy - 12, 10, 14, 2);
    fill(200, 160, 60);
    ellipse(sx, sy - 24, 14, 8);
    // Interaction prompt
    let playerDist = dist(state.player.x, state.player.y, mx, my);
    if (playerDist < 80) {
      fill(0, 0, 0, 160);
      rect(sx - 52, sy - 40, 104, 16, 4);
      fill(255, 220, 100);
      textSize(9); textAlign(CENTER, CENTER);
      text('[E] Trade — Wandering Merchant', sx, sy - 32);
    }
    pop();
  }

  // Ancient spirit: draw ghost figure at ruin
  if (def.id === 'ancient_spirit' && !state.activeEvent.data.interacted) {
    let gx = state.activeEvent.data.x, gy = state.activeEvent.data.y;
    let sx = w2sX(gx), sy = w2sY(gy) + floatOffset;
    let ghostAlpha = sin(frameCount * 0.04) * 60 + 140;
    push();
    noStroke();
    fill(180, 220, 255, ghostAlpha);
    ellipse(sx, sy - 20, 10, 10);
    fill(180, 220, 255, ghostAlpha - 40);
    ellipse(sx, sy - 8, 8, 18);
    let playerDist = dist(state.player.x, state.player.y, gx, gy);
    if (playerDist < 80) {
      fill(0, 0, 0, 160);
      rect(sx - 48, sy - 38, 96, 16, 4);
      fill(180, 220, 255);
      textSize(9); textAlign(CENTER, CENTER);
      text('[E] Speak with the Spirit', sx, sy - 30);
    }
    pop();
  }

  // Pirate raid — pirate ship offshore + pirate enemies
  if (def.id === 'pirate_raid') {
    let d = state.activeEvent.data;
    // Pirate ship sprite
    let sx = w2sX(d.shipX), sy = w2sY(d.shipY) + floatOffset;
    let bob = sin(frameCount * 0.03) * 3;
    push();
    translate(sx, sy + bob);
    noStroke();
    // Hull — dark wood
    fill(60, 40, 25);
    beginShape();
    vertex(-30, 0); vertex(-25, 10); vertex(25, 10); vertex(30, 0);
    vertex(20, -4); vertex(-20, -4);
    endShape(CLOSE);
    // Deck
    fill(80, 55, 35);
    rect(-22, -4, 44, 4);
    // Mast
    stroke(70, 50, 30); strokeWeight(2);
    line(0, -4, 0, -35);
    noStroke();
    // Black sail
    fill(30, 28, 25);
    beginShape();
    vertex(-12, -33); vertex(12, -33);
    vertex(14, -12); vertex(-14, -12);
    endShape(CLOSE);
    // Skull on sail
    fill(200, 190, 170);
    rect(-3, -27, 6, 6);
    rect(-2, -21, 4, 3);
    fill(30);
    rect(-2, -26, 2, 2);
    rect(1, -26, 2, 2);
    // Red pennant
    fill(180, 40, 30);
    beginShape();
    vertex(0, -35); vertex(8, -32); vertex(0, -29);
    endShape(CLOSE);
    pop();
    // Draw pirate enemies
    if (d.pirates) {
      for (let p of d.pirates) {
        let px = w2sX(p.x), py = w2sY(p.y) + floatOffset;
        push();
        translate(px, py);
        noStroke();
        // Shadow
        fill(0, 0, 0, 30);
        ellipse(0, 2, 12, 4);
        // Body
        fill(p.flashTimer > 0 ? 255 : 80, 40, 40);
        rect(-4, -10, 8, 12);
        // Head with bandana
        fill(195, 165, 130);
        rect(-3, -15, 6, 5);
        fill(180, 30, 30);
        rect(-4, -16, 8, 2);
        // Cutlass
        stroke(170, 170, 180); strokeWeight(1);
        line(p.facing * 5, -8, p.facing * 10, -14);
        noStroke();
        // HP bar
        if (p.hp < p.maxHp) {
          fill(40, 0, 0, 180);
          rect(-8, -20, 16, 3);
          fill(220, 50, 30);
          rect(-8, -20, 16 * (p.hp / p.maxHp), 3);
        }
        pop();
      }
    }
  }

  // Harvest windfall — golden sparkle particles on farm zone
  if (def.id === 'harvest_windfall') {
    if (frameCount % 15 === 0 && state.farms) {
      for (let f of state.farms) {
        if (f.crop) {
          let fsx = w2sX(f.x), fsy = w2sY(f.y) + floatOffset;
          push();
          noStroke();
          let sa = sin(frameCount * 0.1 + f.x) * 50 + 200;
          fill(255, 220, 60, sa);
          ellipse(fsx + random(-8, 8), fsy - random(4, 16), 3, 3);
          pop();
        }
      }
    }
  }

  // Crystal surge — brighter shrine glow
  if (def.id === 'crystal_surge' && state.crystalShrine) {
    let sh = state.crystalShrine;
    let csx = w2sX(sh.x), csy = w2sY(sh.y) + floatOffset;
    let glowPulse = sin(frameCount * 0.04) * 0.3 + 0.7;
    push();
    noStroke();
    fill(60, 220, 200, floor(40 * glowPulse));
    ellipse(csx, csy - 10, 80, 50);
    fill(80, 240, 220, floor(25 * glowPulse));
    ellipse(csx, csy - 10, 120, 70);
    pop();
  }

  // Ghost sighting — translucent ghost figure patrolling ruins
  if (def.id === 'ghost_sighting' && !state.activeEvent.data.talked) {
    let d = state.activeEvent.data;
    let gx = d.currentX || d.originX;
    let gy = d.currentY || d.originY;
    let gsx = w2sX(gx), gsy = w2sY(gy) + floatOffset;
    let alpha = (sin(frameCount * 0.05) * 0.3 + 0.5) * 255;
    push();
    translate(gsx, gsy);
    noStroke();
    // Body glow
    fill(220, 220, 240, floor(alpha * 0.4));
    ellipse(0, -2, 14, 18);
    // Body
    fill(230, 230, 245, floor(alpha * 0.6));
    rect(-4, -10, 8, 14);
    rect(-3, -15, 6, 5);
    // Eyes
    fill(150, 180, 255, floor(alpha * 0.8));
    rect(-2, -13, 2, 2);
    rect(1, -13, 2, 2);
    pop();
    // Interaction prompt
    let playerDist = dist(state.player.x, state.player.y, gx, gy);
    if (playerDist < 80) {
      push();
      fill(0, 0, 0, 160);
      rect(gsx - 48, gsy - 28 + floatOffset, 96, 16, 4);
      fill(180, 200, 255);
      noStroke();
      textSize(9); textAlign(CENTER, CENTER);
      text('[E] Listen to the Ghost', gsx, gsy - 20 + floatOffset);
      pop();
    }
  }

  // Wandering soldier — legionary NPC
  if (def.id === 'wandering_soldier') {
    let d = state.activeEvent.data;
    let ssx = w2sX(d.x), ssy = w2sY(d.y) + floatOffset;
    push();
    translate(ssx, ssy);
    noStroke();
    // Shadow
    fill(0, 0, 0, 30);
    ellipse(0, 2, 12, 4);
    // Traveling cloak
    fill(100, 80, 55);
    rect(-5, -9, 10, 10);
    // Battered armor body
    fill(140, 125, 100);
    rect(-4, -10, 8, 12);
    // Head
    fill(195, 165, 130);
    rect(-3, -15, 6, 5);
    // Helmet (dented)
    fill(130, 120, 100);
    rect(-3, -17, 6, 3);
    // Spear
    stroke(110, 90, 60); strokeWeight(1);
    line(5, -20, 5, 4);
    noStroke();
    // Spear tip
    fill(170, 170, 180);
    beginShape();
    vertex(5, -22); vertex(3, -18); vertex(7, -18);
    endShape(CLOSE);
    pop();
    // Name tag
    push();
    noStroke();
    fill(0, 0, 0, 120);
    rect(ssx - 24, ssy - 28 + floatOffset, 48, 12, 3);
    fill(220, 190, 130);
    textSize(8); textAlign(CENTER, CENTER);
    text(d.name, ssx, ssy - 22 + floatOffset);
    pop();
    // Interaction prompt
    let playerDist = dist(state.player.x, state.player.y, d.x, d.y);
    if (playerDist < 80 && !d.traded) {
      push();
      noStroke();
      fill(0, 0, 0, 160);
      rect(ssx - 52, ssy - 44 + floatOffset, 104, 16, 4);
      fill(220, 180, 100);
      textSize(9); textAlign(CENTER, CENTER);
      text('[E] Speak with ' + d.name, ssx, ssy - 36 + floatOffset);
      pop();
    }
  }

  // Whale sighting — draw whale sprite offshore
  if (def.id === 'whale_sighting') {
    let d = state.activeEvent.data;
    let wx = w2sX(d.whaleX), wy = w2sY(d.whaleY) + floatOffset;
    let phase = d.whalePhase || 0;
    let bob = sin(phase) * 6;
    let breach = sin(phase * 0.3) * 0.5 + 0.5;
    push();
    translate(wx, wy + bob);
    noStroke();
    // Body — deep blue-grey
    fill(50, 60, 80);
    ellipse(0, 0, 50 * breach + 20, 14);
    // Belly lighter
    fill(80, 90, 110);
    ellipse(0, 2, 40 * breach + 16, 8);
    // Tail fluke
    fill(45, 55, 75);
    beginShape();
    vertex(22, -2); vertex(32, -8); vertex(30, 0); vertex(32, 8); vertex(22, 2);
    endShape(CLOSE);
    // Water spray
    if (breach > 0.7) {
      fill(180, 220, 255, floor((breach - 0.7) * 600));
      for (let i = 0; i < 5; i++) {
        let sx2 = -5 + i * 3;
        let sy2 = -10 - i * 2 - sin(phase * 2 + i) * 4;
        rect(sx2, sy2, 2, 2);
      }
    }
    pop();
  }

  // Bandit raid — draw bandit enemies
  if (def.id === 'bandit_raid') {
    let d = state.activeEvent.data;
    if (d.bandits) {
      for (let b of d.bandits) {
        let bx = w2sX(b.x), by = w2sY(b.y) + floatOffset;
        push();
        translate(bx, by);
        noStroke();
        fill(0, 0, 0, 30);
        ellipse(0, 2, 10, 4);
        // Dark cloak
        fill(b.flashTimer > 0 ? 255 : 50, 40, 35);
        rect(-4, -9, 8, 11);
        // Hood
        fill(40, 35, 30);
        rect(-3, -14, 6, 5);
        rect(-4, -12, 8, 2);
        // Eyes — menacing
        fill(200, 80, 40);
        rect(-2, -12, 1, 1);
        rect(1, -12, 1, 1);
        // Dagger
        fill(170, 170, 180);
        rect(b.facing * 5, -8, 1, 6);
        fill(120, 90, 50);
        rect(b.facing * 5 - 1, -3, 3, 2);
        // HP bar
        if (b.hp < b.maxHp) {
          fill(40, 0, 0, 180);
          rect(-8, -18, 16, 3);
          fill(220, 50, 30);
          rect(-8, -18, 16 * (b.hp / b.maxHp), 3);
        }
        pop();
      }
    }
  }

  // Earthquake/aftershock — screen dust particles (already handled by screen shake)

  // Seasonal visual overlays
  if (def.id === 'spring_bloom' && frameCount % 4 === 0) {
    push();
    noStroke();
    let sa = sin(frameCount * 0.03) * 30 + 60;
    fill(255, 180, 200, sa);
    for (let i = 0; i < 3; i++) {
      let px = random(width), py = random(height);
      ellipse(px, py, 3, 2);
    }
    pop();
  }
  if (def.id === 'winter_frost') {
    push();
    noStroke();
    for (let i = 0; i < 2; i++) {
      let seed = (frameCount + i * 200) % 1000;
      let fx = (seed * 1.7) % width;
      let fy = (frameCount * 0.3 + seed * 3.1) % height;
      fill(200, 230, 255, 100);
      rect(floor(fx), floor(fy), 2, 2);
    }
    pop();
  }
}

// Interaction: called from the E-key handler when near wandering merchant
function interactWanderingMerchant() {
  if (!state.activeEvent || state.activeEvent.id !== 'wandering_merchant') return false;
  let mx = state.activeEvent.data.x, my = state.activeEvent.data.y;
  if (dist(state.player.x, state.player.y, mx, my) > 80) return false;
  state.activeEvent.data.shopOpen = !state.activeEvent.data.shopOpen;
  return true;
}

// Interaction: called from E-key handler when near ancient spirit
function interactAncientSpirit() {
  if (!state.activeEvent || state.activeEvent.id !== 'ancient_spirit') return false;
  if (state.activeEvent.data.interacted) return false;
  let gx = state.activeEvent.data.x, gy = state.activeEvent.data.y;
  if (dist(state.player.x, state.player.y, gx, gy) > 80) return false;
  state.activeEvent.data.interacted = true;
  let prophecies = [
    'The tide that retreats leaves behind its gifts.',
    'Stone endures. So shall you.',
    'When the sun hides its face, the crystal sings.',
    'That which you plant in faith shall yield tenfold.',
    'The sea remembers all who crossed it.',
    'Listen — even silence carries news from Rome.',
  ];
  let msg = prophecies[floor(random(prophecies.length))];
  addFloatingText(width / 2, height * 0.3, '"' + msg + '"', '#aaddff');
  spawnParticles(gx, gy, 'divine', 14);
  // End the event
  state.activeEvent.timer = 0;
  return true;
}

// Interaction: ghost sighting — gives lore hint
function interactGhostSighting() {
  if (!state.activeEvent || state.activeEvent.id !== 'ghost_sighting') return false;
  if (state.activeEvent.data.talked) return false;
  let d = state.activeEvent.data;
  let gx = d.currentX || d.originX, gy = d.currentY || d.originY;
  if (dist(state.player.x, state.player.y, gx, gy) > 80) return false;
  d.talked = true;
  let hints = [
    'Beneath the northern stones, iron sleeps.',
    'The old aqueduct still flows... underground.',
    'A king was buried here, long before Rome.',
    'The crystals remember a civilization of light.',
    'Three altars once stood where the shrine now rests.',
    'The volcano to the west guards something ancient.',
    'Ships from Carthage once traded here in peace.',
    'The forest whispers of a hidden spring.',
  ];
  let msg = hints[d.hintIdx % hints.length];
  addFloatingText(width / 2, height * 0.3, '"' + msg + '"', '#aaaaff');
  spawnParticles(gx, gy, 'divine', 10);
  state.activeEvent.timer = 60; // fade out shortly
  return true;
}

// Interaction: wandering soldier — trade offer
function interactWanderingSoldier() {
  if (!state.activeEvent || state.activeEvent.id !== 'wandering_soldier') return false;
  let d = state.activeEvent.data;
  if (d.traded) return false;
  if (dist(state.player.x, state.player.y, d.x, d.y) > 80) return false;
  let t = d.trade;
  if ((state[t.give] || 0) >= t.giveAmt) {
    state[t.give] -= t.giveAmt;
    state[t.get] = (state[t.get] || 0) + t.getAmt;
    d.traded = true;
    addFloatingText(width / 2, height * 0.28, d.name + ': "My thanks. May Fortuna favor you."', '#cc8844');
    addFloatingText(width / 2, height * 0.34, '-' + t.giveLabel + '  +' + t.getLabel, '#ffcc44');
    if (snd) snd.playSFX('harvest');
  } else {
    addFloatingText(width / 2, height * 0.3, d.name + ': "I need ' + t.giveLabel + ' for ' + t.getLabel + '."', '#cc8844');
    addFloatingText(width / 2, height * 0.36, '"' + d.story + '"', '#aa9977');
  }
  return true;
}

// Draw the wandering merchant shop UI (rendered in main HUD pass)
function drawWanderingMerchantUI() {
  if (!state.activeEvent || state.activeEvent.id !== 'wandering_merchant') return;
  if (!state.activeEvent.data.shopOpen) return;
  let stock = state.activeEvent.data.stock || [];
  let panelW = min(260, width - 20), panelH = min(40 + stock.length * 50, height - 20);
  let px = max(10, width / 2 - panelW / 2), py = max(10, height / 2 - panelH / 2);
  push();
  noStroke();
  fill(30, 22, 12, 220);
  rect(px, py, panelW, panelH, 8);
  stroke(180, 140, 50); strokeWeight(1); noFill();
  rect(px, py, panelW, panelH, 8);
  noStroke();
  fill(220, 180, 80);
  textSize(11); textAlign(CENTER, TOP);
  text('WANDERING MERCHANT', px + panelW / 2, py + 10);
  fill(160, 140, 100);
  textSize(8); textAlign(CENTER, TOP);
  text('Gold: ' + state.gold, px + panelW / 2, py + 24);
  stock.forEach((item, i) => {
    let iy = py + 40 + i * 50;
    fill(item.sold ? 50 : 45, item.sold ? 40 : 35, 25, 200);
    rect(px + 8, iy, panelW - 16, 44, 4);
    if (!item.sold) {
      fill(200, 180, 120);
      textSize(9); textAlign(LEFT, TOP);
      text(item.name + ' (x' + item.qty + ')', px + 16, iy + 6);
      fill(200, 180, 60);
      text(item.cost + 'g', px + panelW - 50, iy + 6);
      fill(140, 160, 120);
      textSize(8);
      text('Press ' + (i + 1) + ' to buy', px + 16, iy + 22);
    } else {
      fill(100, 140, 80);
      textSize(9); textAlign(CENTER, CENTER);
      text('SOLD', px + panelW / 2, iy + 22);
    }
  });
  fill(160, 120, 60);
  textSize(8); textAlign(CENTER, BOTTOM);
  text('[E] Close', px + panelW / 2, py + panelH - 6);
  pop();
}

function buyWanderingMerchantItem(idx) {
  if (!state.activeEvent || state.activeEvent.id !== 'wandering_merchant') return;
  let stock = state.activeEvent.data.stock;
  if (!stock || idx < 0 || idx >= stock.length) return;
  let item = stock[idx];
  if (item.sold) { addFloatingText(width / 2, height * 0.35, 'Already sold!', '#ff8888'); return; }
  if (state.gold < item.cost) {
    addFloatingText(width / 2, height * 0.35, 'Need ' + item.cost + ' gold!', '#ff6644');
    return;
  }
  state.gold = Math.max(0, state.gold - item.cost);
  state[item.resource] = (state[item.resource] || 0) + item.qty;
  item.sold = true;
  addFloatingText(width / 2, height * 0.3, 'Bought ' + item.name + '!', '#ffcc44');
  if (snd) snd.playSFX('harvest');
}
