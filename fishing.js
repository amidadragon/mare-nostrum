// ─── FISHING SYSTEM ──────────────────────────────────────────────────────
// Extracted from sketch.js. All globals (state, WORLD, particles, snd,
// w2sX, w2sY, addFloatingText, spawnParticles, etc.) remain in sketch.js.

// ─── FISH TYPES ───────────────────────────────────────────────────────────
const FISH_TYPES = [
  { name: 'Sardine',         weight: 1, color: '#88aacc', minH: 0,  maxH: 24, season: -1 },
  { name: 'Tuna',            weight: 2, color: '#4477aa', minH: 6,  maxH: 18, season: -1 },
  { name: 'Octopus',         weight: 3, color: '#9955aa', minH: 18, maxH: 6,  season: 1  },  // night, summer
  { name: 'Eel',             weight: 2, color: '#556633', minH: 20, maxH: 5,  season: -1 },  // night only
  { name: 'Goldfish',        weight: 5, color: '#ffaa33', minH: 10, maxH: 14, season: 0  },  // spring noon — rare
  { name: 'Mackerel',        weight: 1, color: '#6699bb', minH: 5,  maxH: 20, season: -1 },
  { name: 'Sea Bass',        weight: 1, color: '#5588aa', minH: 6,  maxH: 22, season: -1 },
  { name: 'Anchovy',         weight: 1, color: '#99aabb', minH: 0,  maxH: 24, season: -1 },
  { name: 'Swordfish',       weight: 3, color: '#3366aa', minH: 8,  maxH: 16, season: 1  },  // summer
  { name: 'Golden Bream',    weight: 4, color: '#ddaa22', minH: 10, maxH: 16, season: -1 },
  { name: 'Electric Ray',    weight: 5, color: '#88ddff', minH: 19, maxH: 4,  season: 2  },  // autumn night
  { name: 'Cuttlefish',      weight: 2, color: '#bb88cc', minH: 17, maxH: 7,  season: -1 },
  { name: 'Red Mullet',      weight: 2, color: '#cc6644', minH: 6,  maxH: 20, season: 0  },  // spring
  { name: "Poseidon's Catch",weight: 8, color: '#55aaff', minH: 0,  maxH: 24, season: -1, stormOnly: true },
  { name: 'Silver Eel',     weight: 5, color: '#c0d0e0', minH: 0,  maxH: 24, season: -1, stormOnly: true },
  { name: 'Fog Crab',       weight: 5, color: '#8899aa', minH: 0,  maxH: 24, season: -1, fogOnly: true },
  // --- New fish types ---
  { name: 'Moon Jellyfish',  weight: 3, color: '#ccaaff', minH: 20, maxH: 5,  season: -1 },  // night
  { name: 'Imperial Sturgeon',weight:6, color: '#7799aa', minH: 5,  maxH: 9,  season: 2  },  // autumn dawn — very rare
  { name: 'Volcanic Snapper', weight: 4, color: '#ff6633', minH: 10, maxH: 20, season: 1  },  // summer day
  { name: 'Phantom Squid',   weight: 7, color: '#5544aa', minH: 22, maxH: 4,  season: -1, stormOnly: true },  // storm night — legendary
  { name: 'Bronze Wrasse',   weight: 2, color: '#cc9944', minH: 6,  maxH: 18, season: 0  },  // spring day
];

// Returns true if current hour is dawn (5-7) or dusk (17-19) — "golden hour"
function isGoldenHour() {
  let h = state.time / 60;
  return (h >= 5 && h <= 7) || (h >= 17 && h <= 19);
}

// Weather catch rate multiplier: rain = 1.5x rare chance, storm = 2x
function getWeatherFishingMult() {
  if (stormActive || (state.weather && state.weather.type === 'storm')) return 2.0;
  if (state.weather && state.weather.type === 'rain') return 1.5;
  return 1.0;
}

function rollFishType() {
  let h = state.time / 60;
  let season = getSeason();
  let eligible = FISH_TYPES.filter(f => {
    if (f.stormOnly && !stormActive && !(state.weather && (state.weather.type === 'storm' || state.weather.type === 'rain'))) return false;
    if (f.fogOnly && (!state.weather || state.weather.type !== 'fog')) return false;
    // Time check — wraps around midnight
    if (f.minH < f.maxH) {
      if (h < f.minH || h > f.maxH) return false;
    } else {
      if (h < f.minH && h > f.maxH) return false;
    }
    if (f.season >= 0 && f.season !== season) return false;
    return true;
  });
  if (eligible.length === 0) return FISH_TYPES[0]; // fallback sardine
  // Weighted random — rarer fish less likely, prophecy boosts rare
  let rareMult = (state.prophecy && state.prophecy.type === 'rarefish') ? 3 : 1;
  if (typeof getFishingLuckBonus === 'function') rareMult *= getFishingLuckBonus();
  // Weather and golden hour boost rare fish chances
  rareMult *= getWeatherFishingMult();
  if (isGoldenHour()) rareMult *= 1.8;
  let weights = eligible.map(f => f.weight > 2 ? (1 / f.weight) * rareMult : 1 / f.weight);
  let total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  let sum = 0;
  for (let i = 0; i < eligible.length; i++) {
    sum += weights[i];
    if (r <= sum) return eligible[i];
  }
  return eligible[0];
}

// ─── NATURALIST CODEX FISH DATA ───────────────────────────────────────────
const NAT_FISH_DATA = {
  'sardine':          { label: 'Sardine',          rarity: 'Common',   desc: 'A humble staple of the Mediterranean catch.',         season: 'All Year', time: 'Any' },
  'tuna':             { label: 'Tuna',              rarity: 'Common',   desc: 'Prized by fishermen for its size and flavor.',         season: 'All Year', time: 'Dawn-Dusk' },
  'octopus':          { label: 'Octopus',           rarity: 'Uncommon', desc: 'Emerges at night under the summer moon.',              season: 'Summer',   time: 'Night' },
  'eel':              { label: 'Eel',               rarity: 'Uncommon', desc: 'Slippery and elusive, it hunts only after dark.',       season: 'All Year', time: 'Night' },
  'goldfish':         { label: 'Goldfish',          rarity: 'Rare',     desc: 'A glittering rarity born in the noontime spring.',     season: 'Spring',   time: 'Midday' },
  'mackerel':         { label: 'Mackerel',          rarity: 'Common',   desc: 'Schools in abundance near the shallows at dawn.',      season: 'All Year', time: 'Morning' },
  'sea bass':         { label: 'Sea Bass',          rarity: 'Common',   desc: 'A reliable catch for any patient angler.',             season: 'All Year', time: 'Morning' },
  'anchovy':          { label: 'Anchovy',           rarity: 'Common',   desc: 'Tiny but plentiful -- the salt of Roman cuisine.',     season: 'All Year', time: 'Any' },
  'swordfish':        { label: 'Swordfish',         rarity: 'Uncommon', desc: 'A fierce fighter requiring strength to reel in.',      season: 'Summer',   time: 'Day' },
  'golden bream':     { label: 'Golden Bream',      rarity: 'Rare',     desc: 'Its golden scales shimmer like scattered coins.',      season: 'All Year', time: 'Midday' },
  'electric ray':     { label: 'Electric Ray',      rarity: 'Rare',     desc: 'Crackles with strange energy on autumn nights.',       season: 'Autumn',   time: 'Night' },
  'cuttlefish':       { label: 'Cuttlefish',        rarity: 'Uncommon', desc: 'Its ink stains the water like a dark prophecy.',       season: 'All Year', time: 'Dusk' },
  'red mullet':       { label: 'Red Mullet',        rarity: 'Uncommon', desc: 'A sacred fish offered at spring festivals.',           season: 'Spring',   time: 'Morning' },
  "poseidon's catch": { label: "Poseidon's Catch",  rarity: 'Legendary',desc: 'Only the storm-tossed sea yields this ancient beast.', season: 'Storm',    time: 'Any' },
  'silver eel':       { label: 'Silver Eel',        rarity: 'Rare',     desc: 'A shimmering eel drawn to the surface by storm currents.', season: 'Storm', time: 'Any' },
  'fog crab':         { label: 'Fog Crab',           rarity: 'Rare',     desc: 'Emerges only when the sea mist is thickest.',            season: 'Fog',   time: 'Any' },
  'moon jellyfish':   { label: 'Moon Jellyfish',     rarity: 'Uncommon', desc: 'Drifts like a ghost beneath the moonlit surface.',       season: 'All Year', time: 'Night' },
  'imperial sturgeon':{ label: 'Imperial Sturgeon',  rarity: 'Rare',     desc: 'Once reserved for Caesar\'s table alone.',               season: 'Autumn',   time: 'Dawn' },
  'volcanic snapper': { label: 'Volcanic Snapper',   rarity: 'Rare',     desc: 'Its red scales recall the fires of Vesuvius.',           season: 'Summer',   time: 'Day' },
  'phantom squid':    { label: 'Phantom Squid',      rarity: 'Legendary',desc: 'A deep-sea horror surfaced only by violent storms.',     season: 'Storm',    time: 'Night' },
  'bronze wrasse':    { label: 'Bronze Wrasse',      rarity: 'Uncommon', desc: 'Its metallic sheen earned it the name of bronze.',       season: 'Spring',   time: 'Day' },
};

function updateFishing(dt) {
  let f = state.fishing;
  if (!f || !f.active) return;

  if (f.phase === 'cast') {
    f.phaseTimer -= dt;
    if (f.phaseTimer <= 0) {
      f.phase = 'wait';
      let rodBonus = state.tools.ironRod ? 0.7 : state.tools.copperRod ? 0.85 : 1.0;
      let _natFishBonus = typeof getNatFishingSpeedBonus === 'function' ? getNatFishingSpeedBonus() : 1.0;
      let weatherBonus = (state.weather && (state.weather.type === 'rain' || state.weather.type === 'storm')) ? 0.7 : 1.0;
      let goldenBonus = isGoldenHour() ? 0.8 : 1.0;
      f.waitDuration = floor(random(90, 300) * rodBonus / _natFishBonus * weatherBonus * goldenBonus);
      // Day 1 first fish: guaranteed quick bite
      if (typeof shouldGuaranteeFish === 'function' && shouldGuaranteeFish()) f.waitDuration = floor(f.waitDuration * 0.3);
      f.phaseTimer = f.waitDuration;
      f.nibbleTimer = floor(random(25, 45));
      f.splashRings = [{r: 0, a: 200}, {r: 0, a: 150}]; // expanding water rings on plop
      spawnParticles(f.bobberX, f.bobberY, 'build', 6);
      if (snd) snd.playSFX('bobber_plop');
    }
  } else if (f.phase === 'wait') {
    f.phaseTimer -= dt;
    f.nibbleTimer -= dt;
    // Gentle bobbing
    f.bobberDip = sin(frameCount * 0.08) * 3;
    // Nibble dips
    if (f.nibbleTimer <= 0 && f.phaseTimer > 72) {
      f.bobberDip = -5;
      f.nibbleTimer = floor(random(25, 45));
      if (!f.splashRings) f.splashRings = [];
      f.splashRings.push({r: 0, a: 80}); // subtle ring on nibble
    }
    // Net auto-catches at strike
    if (f.phaseTimer <= 0) {
      f.phase = 'strike';
      let _strikeWindow = 72; // 1.2 second window
      // Day 1 first fish: much wider strike window
      if (typeof shouldGuaranteeFish === 'function' && shouldGuaranteeFish()) _strikeWindow = 180;
      f.phaseTimer = _strikeWindow;
      f.bobberDip = -12;
      f.bite = true;
      f.strikeWindowEnd = frameCount + _strikeWindow;
      f.splashRings = [{r: 0, a: 255}, {r: 0, a: 220}, {r: 0, a: 180}, {r: 0, a: 140}, {r: 0, a: 100}]; // dramatic splash on bite
      if (snd) snd.playSFX('fish_bite');
      triggerScreenShake(3, 6);
      spawnParticles(f.bobberX, f.bobberY, 'build', 8);
      if (state.tools.net) {
        reelFish();
        return;
      }
    }
  } else if (f.phase === 'strike') {
    f.phaseTimer -= dt;
    f.bobberDip = -12 + sin(frameCount * 0.15) * 2;
    if (f.phaseTimer <= 0) {
      // Player missed
      let missLines = ['Too slow!', 'It got away!', 'Nearly had it!',
        'The line went slack.', 'A cunning fish.',
        'Should have struck!', 'Next time.', 'The sea is patient.'];
      f.missLine = missLines[floor(random(missLines.length))];
      addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, f.missLine, '#ff8866');
      f.phase = 'cooldown';
      f.phaseTimer = 180;
      f.bobberDip = 0;
      f.bite = false;
      f.streak = 0;
      if (snd) snd.playSFX('water');
      triggerScreenShake(1, 3);
    }
  } else if (f.phase === 'reel') {
    f.phaseTimer -= dt;
    if (f.phaseTimer <= 0) {
      f.active = false;
      f.phase = null;
      f.bite = false;
    }
  } else if (f.phase === 'cooldown') {
    f.phaseTimer -= dt;
    if (f.phaseTimer <= 0) {
      f.active = false;
      f.phase = null;
      f.bite = false;
    }
  }
}

function startFishing() {
  let edgeDist = islandEdgeDist(state.player.x, state.player.y);
  if (edgeDist > -0.08) {
    let f = state.fishing;
    f.active = true;
    f.phase = 'cast';
    f.phaseTimer = 30; // 0.5 second cast
    f.timer = 0;
    f.bite = false;
    f.caught = false;
    f.bobberDip = 0;
    f.missLine = '';
    f.streak = f.streak || 0;
    // Bobber lands outward from island center (toward water)
    let castAngle = atan2(state.player.y - WORLD.islandCY, state.player.x - WORLD.islandCX);
    f.bobberX = state.player.x + cos(castAngle) * 45;
    f.bobberY = state.player.y + sin(castAngle) * 30;
    f.castAngle = castAngle;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.moving = false;
    state.player.targetX = null;
    state.player.targetY = null;
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, 'Casting line...', '#66ccff');
    if (isGoldenHour()) addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 48, 'Golden hour!', '#ffcc33');
    if (state.weather && state.weather.type === 'rain') addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 60, 'Rain bonus!', '#88bbdd');
    // Tidal zone indicator
    let _tb = getTidalBonus(state.player.x, state.player.y);
    if (_tb >= 2.0) addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 72, 'Peak Tide! 2x fish', '#44ddff');
    else if (_tb >= 1.3) addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 72, 'Rising Tide 1.3x', '#88bbcc');
  } else {
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, 'Go to island edge to fish!', C.buildInvalid);
  }
}

function reelFish() {
  if (!state.fishing) return;
  let f = state.fishing;
  if (f.active && (f.bite || f.phase === 'strike')) {
    f.streak = (f.streak || 0) + 1;
    let fishType = rollFishType();
    let amt = fishType.weight >= 3 ? 2 : 1;

    // Perfect catch — reel within first 12 frames of strike for 2x value
    let isPerfect = false;
    if (f.strikeWindowEnd && (f.strikeWindowEnd - frameCount) > 60) {
      isPerfect = true;
      amt *= 2;
    }

    // Tidal zone bonus
    let _tidalMult = getTidalBonus(state.player.x, state.player.y);
    if (_tidalMult > 1) amt = floor(amt * _tidalMult);
    // Weather fishing multiplier
    if (typeof getWeatherEffects === 'function') amt = floor(amt * getWeatherEffects().fishMult);
    // Event fish multiplier (whale sighting = 2x)
    if (typeof getEventFishMult === 'function') amt = floor(amt * getEventFishMult());
    if (state.heartRewards && state.heartRewards.includes('golden')) amt *= 2;
    if (state.prophecy && state.prophecy.type === 'fish') amt += 1;
    let fest = getFestival();
    if (fest && fest.effect.fish) amt *= fest.effect.fish;
    // Streak bonus: +1 fish at streak 3+
    if (f.streak >= 3) amt += 1;
    // Lighthouse bonus: +20% fishing yield
    if (state.buildings && state.buildings.some(b => b.type === 'lighthouse')) amt = floor(amt * 1.2);
    // Faction fishing bonus
    if (typeof getFactionData === 'function') amt = floor(amt * (getFactionData().fishYieldMult || 1));
    state.fish += amt;
    if (state.score) state.score.fishCaught += amt;
    if (snd) snd.playSFX('fish_catch');
    if (state.dailyActivities) state.dailyActivities.fished += amt;
    if (typeof trackStat === 'function') trackStat('fishCaught', amt);
    if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('fish', amt);
    if (typeof stormActive !== 'undefined' && stormActive && typeof unlockAchievement === 'function') unlockAchievement('storm_fisher');
    checkQuestProgress('fish', amt);
    if (typeof triggerNPCReaction === 'function') triggerNPCReaction('fish', state.player.x, state.player.y);
    if (typeof grantXP === 'function') grantXP(fishType.weight * (isPerfect ? 10 : 5));
    if (!state.codex) state.codex = {};
    if (!state.codex.fishCaught) state.codex.fishCaught = {};
    if (!state.codex.fish) state.codex.fish = {};
    state.codex.fishCaught[fishType.name.toLowerCase()] = true;
    let _fk = fishType.name.toLowerCase();
    let _isFirstCatch = !state.codex.fish[_fk];
    if (!state.codex.fish[_fk]) state.codex.fish[_fk] = { caught: true, count: 0, firstDay: state.day };
    state.codex.fish[_fk].count += amt;
    state.codex.fish[_fk].caught = true;
    // Codex discovery + catch card
    if (_isFirstCatch && typeof markCodexDiscovery === 'function') markCodexDiscovery('fish', _fk);
    let _fishRarity = NAT_FISH_DATA[_fk] ? NAT_FISH_DATA[_fk].rarity : 'Common';
    if (typeof showCatchCard === 'function') showCatchCard(fishType.name, _fishRarity, fishType.weight, _isFirstCatch);
    unlockJournal('first_fish');
    let _fishSx = w2sX(state.player.x), _fishSy = w2sY(state.player.y);
    addFloatingText(_fishSx, _fishSy - 40, '+' + amt + ' ' + fishType.name + '!', fishType.color);
    if (_tidalMult >= 2.0) addFloatingText(_fishSx, _fishSy - 88, 'Tide Bonus! 2x', '#44ddff');
    else if (_tidalMult >= 1.3) addFloatingText(_fishSx, _fishSy - 88, 'Tide +30%', '#88bbcc');
    if (isPerfect) {
      addFloatingText(_fishSx, _fishSy - 72, 'PERFECT CATCH!', '#ffee00');
      triggerScreenShake(5, 8);
      spawnParticles(state.player.x, state.player.y, 'build', 14);
      // Burst of golden sparkles for perfect catch
      for (let s = 0; s < 8; s++) {
        spawnParticles(state.player.x + random(-15, 15), state.player.y + random(-15, 15), 'build', 2);
      }
    }
    // Arc fish reward to HUD
    if (typeof spawnHarvestArc === 'function') spawnHarvestArc(_fishSx, _fishSy - 40, '+' + amt, fishType.color, 'fish');
    if (f.streak >= 3) {
      addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 58, '+' + f.streak + ' streak!', '#ffdd55');
    }
    spawnParticles(state.player.x, state.player.y, 'build', 6);
    triggerScreenShake(3, 5);
    // Transition to reel phase (brief celebration)
    f.phase = 'reel';
    f.phaseTimer = 40;
    f.bite = false;
    f.bobberDip = 0;
    f.reelStart = frameCount;
    f.reelBobberStartX = f.bobberX;
    f.reelBobberStartY = f.bobberY;
  }
}

function drawFishing() {
  let f = state.fishing;
  if (!f || !f.active || !f.phase) return;
  let px = w2sX(state.player.x);
  let py = w2sY(state.player.y);
  // Fishing rod from player — points toward water (away from island center)
  stroke(140, 100, 40);
  strokeWeight(2);
  let castA = f.castAngle || atan2(state.player.y - WORLD.islandCY, state.player.x - WORLD.islandCX);
  let rodEndX = px + cos(castA) * 30;
  let rodEndY = py - 20 + sin(castA) * 10;
  line(px, py - 10, rodEndX, rodEndY);

  if (f.phase === 'cooldown') { noStroke(); return; }

  // Bobber position in screen coords
  let bx = w2sX(f.bobberX);
  let by = w2sY(f.bobberY) + f.bobberDip;

  // Cast animation: bobber flies from rod to target
  if (f.phase === 'cast') {
    let t = 1 - (f.phaseTimer / 30);
    bx = lerp(rodEndX, w2sX(f.bobberX), t);
    by = lerp(rodEndY, w2sY(f.bobberY), t) - sin(t * PI) * 20;
  }

  // Reel phase: bobber zips back toward player, line goes taut
  if (f.phase === 'reel') {
    let reelT = min(1, (frameCount - (f.reelStart || frameCount)) / 30);
    let reelEase = reelT * reelT; // ease-in for snap feel
    bx = lerp(w2sX(f.reelBobberStartX || f.bobberX), rodEndX, reelEase);
    by = lerp(w2sY(f.reelBobberStartY || f.bobberY), rodEndY, reelEase);
    // Taut line — straight, no sag
    stroke(220, 220, 220, 220);
    strokeWeight(1.4);
    line(rodEndX, rodEndY, bx, by);
    noStroke();
    // Fish pixel sprite along the line
    let fishX = bx + (rodEndX > bx ? 6 : -6);
    let fishY = by;
    fill(100, 180, 255);
    rect(floor(fishX) - 3, floor(fishY) - 1, 6, 3);  // body
    fill(80, 150, 220);
    rect(floor(fishX) + (rodEndX > bx ? -5 : 3), floor(fishY) - 2, 2, 4);  // tail
    // Water droplets flung during reel
    fill(150, 200, 255, 180 - reelT * 150);
    for (let d = 0; d < 3; d++) {
      let dx = lerp(bx, rodEndX, reelT * 0.5 + d * 0.15);
      let dy = by - 4 - random(2, 8);
      rect(floor(dx), floor(dy), 2, 2);
    }
    noStroke();
    return; // skip normal bobber draw during reel
  }

  // Fishing line from rod tip to bobber
  let lineTension = f.phase === 'strike' ? 0.6 : 1.0;
  stroke(200, 200, 200, 150);
  strokeWeight(f.phase === 'strike' ? 1.0 : 0.8);
  let midX = (rodEndX + bx) / 2;
  let midY = (rodEndY + by) / 2 + 8 * lineTension;
  noFill();
  beginShape();
  vertex(rodEndX, rodEndY);
  quadraticVertex(midX, midY, bx, by);
  endShape();
  noStroke();

  // Bobber — white top, red bottom, pixel-art 4x6 block
  if (f.phase === 'strike') {
    // Agitated bobber — partially submerged, darker red
    fill(200, 50, 30);
    rect(floor(bx) - 2, floor(by), 4, 3);
    fill(255, 255, 255, 180);
    rect(floor(bx) - 1, floor(by), 2, 1);
  } else {
    fill(255, 60, 60);
    rect(floor(bx) - 2, floor(by) - 2, 4, 4);
    fill(255, 255, 255);
    rect(floor(bx) - 1, floor(by) - 4, 2, 3); // white stick above
  }

  // Expanding splash rings (on plop and bite)
  if (f.splashRings && f.splashRings.length > 0) {
    noFill();
    for (let i = f.splashRings.length - 1; i >= 0; i--) {
      let ring = f.splashRings[i];
      ring.r += 0.6;
      ring.a -= 4;
      if (ring.a <= 0) { f.splashRings.splice(i, 1); continue; }
      stroke(255, 255, 255, ring.a);
      strokeWeight(0.7);
      ellipse(bx, by + 3, ring.r * 2, ring.r * 0.7);
    }
    noStroke();
  }

  // Ambient water ripples around bobber
  if (f.phase !== 'cast') {
    noFill();
    stroke(255, 255, 255, 30 + sin(frameCount * 0.1) * 15);
    strokeWeight(0.5);
    ellipse(bx, by + 3, 14 + sin(frameCount * 0.08) * 3, 5);
    if (f.phase === 'wait') {
      // Second subtle ripple, offset phase
      stroke(255, 255, 255, 15 + sin(frameCount * 0.07 + 2) * 10);
      ellipse(bx, by + 3, 20 + sin(frameCount * 0.06 + 1) * 4, 7);
    }
    noStroke();
  }

  // Strike indicator
  if (f.phase === 'strike') {
    let flash = sin(frameCount * 0.3) > 0;
    if (flash) {
      fill(255, 220, 40);
      textSize(14);
      textAlign(CENTER, BOTTOM);
      text('!', floor(bx), floor(by) - 12);
    }
    fill(255, 200, 40, 150 + floor(sin(frameCount * 0.3) * 100));
    textSize(10);
    textAlign(CENTER, BOTTOM);
    text('PRESS F', floor(px), floor(py) - 50);
    // Splash pixels — dramatic burst
    fill(100, 180, 255, 160);
    for (let s = 0; s < 10; s++) {
      let sx = floor(bx) + floor(random(-12, 12));
      let sy = floor(by) + floor(random(-8, 4));
      rect(sx, sy, 2, 2);
    }
    // Water spray upward — tall arcing droplets
    for (let s = 0; s < 7; s++) {
      let sprayPhase = (frameCount * 0.15 + s * 1.2);
      let sprayAlpha = 120 + sin(sprayPhase) * 50;
      fill(180, 230, 255, sprayAlpha);
      let sprayX = floor(bx) + floor(random(-8, 8));
      let sprayY = floor(by) - 6 - floor(random(4, 16));
      rect(sprayX, sprayY, 2, 3);
    }
    // White foam at base
    fill(255, 255, 255, 60 + sin(frameCount * 0.25) * 30);
    rect(floor(bx) - 6, floor(by) + 1, 12, 2);
    // Perfect catch window indicator — bright gold flash in first 12 frames
    if (f.strikeWindowEnd && (f.strikeWindowEnd - frameCount) > 60) {
      fill(255, 240, 80, 100 + sin(frameCount * 0.4) * 60);
      rect(floor(bx) - 10, floor(by) - 10, 20, 20);
    }
  }
  noStroke();
}

// ─── TIDAL FISHING ZONES ────────────────────────────────────────────────
// Fishing yield changes based on time of day and shore location around the island.
function getPlayerShore(px, py) {
  let angle = atan2(py - WORLD.islandCY, px - WORLD.islandCX);
  if (angle < -PI / 4 && angle > -3 * PI / 4) return 'north';
  if (angle >= -PI / 4 && angle < PI / 4) return 'east';
  if (angle >= PI / 4 && angle < 3 * PI / 4) return 'south';
  return 'west';
}

function getTidalBonus(px, py) {
  let shore = getPlayerShore(px, py);
  let hour = state.time / 60;
  if (shore === 'north' && hour >= 6 && hour <= 8) return 2.0;
  if (shore === 'east' && hour >= 11 && hour <= 13) return 2.0;
  if (shore === 'south' && hour >= 17 && hour <= 19) return 2.0;
  if (shore === 'west' && (hour >= 22 || hour <= 2)) return 2.0;
  // Partial bonus when 1 hour outside peak
  if (shore === 'north' && (hour >= 5 && hour <= 9)) return 1.3;
  if (shore === 'east' && (hour >= 10 && hour <= 14)) return 1.3;
  if (shore === 'south' && (hour >= 16 && hour <= 20)) return 1.3;
  if (shore === 'west' && (hour >= 21 || hour <= 3)) return 1.3;
  return 1.0;
}

function getTidalLabel(px, py) {
  let shore = getPlayerShore(px, py);
  let bonus = getTidalBonus(px, py);
  let shoreNames = { north: 'North Shore', east: 'East Shore', south: 'South Shore', west: 'West Shore' };
  let peakTimes = { north: 'Dawn', east: 'Noon', south: 'Dusk', west: 'Night' };
  let name = shoreNames[shore];
  if (bonus >= 2.0) return name + ' - ' + peakTimes[shore] + ' Tide (2x)';
  if (bonus >= 1.3) return name + ' - Rising Tide (1.3x)';
  return name + ' - Low Tide';
}

function getTidalColor(bonus) {
  if (bonus >= 2.0) return '#44ddff';
  if (bonus >= 1.3) return '#88bbcc';
  return '#667788';
}

function drawTidalHUD() {
  let edgeDist = islandEdgeDist(state.player.x, state.player.y);
  if (edgeDist > -0.15) {
    let bonus = getTidalBonus(state.player.x, state.player.y);
    let label = getTidalLabel(state.player.x, state.player.y);
    let col = getTidalColor(bonus);
    fill(col);
    textSize(8);
    textAlign(CENTER, BOTTOM);
    text(label, width / 2, height - 24);
    // Wave icon
    if (bonus >= 2.0) {
      let waveX = width / 2 - textWidth(label) / 2 - 12;
      let waveY = height - 30;
      stroke(col);
      strokeWeight(1);
      noFill();
      for (let i = 0; i < 3; i++) {
        let wx = waveX + i * 5;
        let wy = waveY + sin(frameCount * 0.1 + i) * 2;
        line(wx, wy, wx + 3, wy - 2);
        line(wx + 3, wy - 2, wx + 5, wy);
      }
      noStroke();
    }
  }
}
