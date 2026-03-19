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
  // Floating lanterns near buildings during festivals
  state.buildings.forEach((b, i) => {
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
        state.gold -= loss;
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
    desc: 'A weary legionary arrives seeking trade.',
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
];

function isEventEligible(def) {
  if (def.oneShot && state.eventHistory.includes(def.id)) return false;
  let cd = state.eventCooldown[def.id] || 0;
  if (cd > 0) return false;
  if (def.eligible && !def.eligible()) return false;
  return true;
}

function checkRandomEvent() {
  if (state.activeEvent) return;
  if (random() > 0.20) return; // 20% chance per day
  let eligible = EVENT_DEFS.filter(isEventEligible);
  if (!eligible.length) return;
  let def = eligible[floor(random(eligible.length))];
  state.activeEvent = { id: def.id, timer: def.duration, data: {} };
  // Tick down other cooldowns by 1 day
  EVENT_DEFS.forEach(d => {
    if (state.eventCooldown[d.id] > 0) state.eventCooldown[d.id]--;
  });
  // Set cooldown for this event
  if (!def.oneShot) state.eventCooldown[def.id] = def.cooldown;
  if (def.oneShot) state.eventHistory.push(def.id);
  def.onStart();
}

function updateActiveEvent(dt) {
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
            state.player.hp -= max(1, p.damage - dmgReduce);
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
  return 1;
}

// Returns the crystal charge rate multiplier from active events
function getEventCrystalMult() {
  if (!state.activeEvent) return 1;
  let id = state.activeEvent.id;
  if (id === 'storm_surge') return 2;
  if (id === 'solar_eclipse') return 2;
  if (id === 'crystal_surge') return 2;
  return 1;
}

// Returns the crop growth timer multiplier (lower = faster growth) from active events
function getEventCropGrowthMult() {
  if (!state.activeEvent) return 1;
  let id = state.activeEvent.id;
  if (id === 'harvest_moon') return 0.5; // 2x speed = half the timer
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
  let panelW = 260, panelH = 40 + stock.length * 50;
  let px = width / 2 - panelW / 2, py = height / 2 - panelH / 2;
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
  state.gold -= item.cost;
  state[item.resource] = (state[item.resource] || 0) + item.qty;
  item.sold = true;
  addFloatingText(width / 2, height * 0.3, 'Bought ' + item.name + '!', '#ffcc44');
  if (snd) snd.playSFX('harvest');
}
