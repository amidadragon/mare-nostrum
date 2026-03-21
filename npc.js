// ─── NPC DIALOGUES ───────────────────────────────────────────────────────
const MARCUS_LINES = [
  "Looking to trade? I don't do charity.",
  "These waters are tricky. I've sailed worse, but not by much.",
  "Don't touch the merchandise. Just... point and I'll hand it to you.",
  "Your island's got potential. Not that I care. I care about gold.",
  "Been trading thirty years. The sea is the only honest thing left.",
  "I had a ship. A real one. Three-masted. She was called Fortuna.",
  "Storm took her. Five years ago. I don't talk about it.",
  "Hmph. You're better at this than I expected. For a farmer.",
  "Bring me something good next time. Not seeds. Something with substance.",
  "...See you next trip, then.",
];
const MARCUS_LINES_MID = [
  "Your fishing's improving. I've been watching.",
  "The octopus here are cunning. Respect them.",
  "Lucia's wine isn't bad. Don't tell her I said that.",
  "I carved Fortuna's name into the dock. Old superstition.",
  "The sea brought me here. I stayed because... the trade routes are good.",
];
const MARCUS_LINES_HIGH = [
  "I'm building a stall. Don't make a big deal about it.",
  "If I'm going to be here, might as well have a proper setup.",
  "I've been thinking about trade routes. Passive income. Interested?",
  "I used to dream about Fortuna sinking. Not anymore.",
  "I'm staying because I'm tired of leaving.",
];

const VESTA_LINES = [
  "The temple welcomes all seekers. I am Vesta. I tend the flame.",
  "You carry the scent of the mainland. It fades.",
  "The crystals are the island's memory. Handle them with reverence.",
  "I speak with the stars. They speak back.",
  "Time moves differently here. You've noticed?",
  "The blessings are not mine to give. I merely ask. The island decides.",
  "I came here before any of you. How long ago? Longer than you'd believe.",
  "Pray when you feel lost. The answer won't come immediately. But it will.",
  "The cats understand the island better than any of us.",
  "Come again. The temple is always open.",
];
const VESTA_LINES_MID = [
  "I was not always a priestess. I was a potter's daughter.",
  "I dreamed of this island for seven years before I found it.",
  "The crystals sing if you hold them long enough. A low tone.",
  "Your tone is... hopeful. Yes. That's the word.",
  "The island has moods. Today it's contemplative. Can you feel it?",
];
const VESTA_LINES_HIGH = [
  "The temple is changing. Growing. You've seen the columns straightening?",
  "This island was not always floating. It was lifted by an act of love.",
  "The crystals are the god's tears. Or their laughter.",
  "The island remembers love. It rewards it.",
  "Take this flame. It will never go out. Like the love that raised this island.",
];

const FELIX_LINES = [
  "Ah! A visitor! Don't touch anything. Especially the scrolls.",
  "I'm Felix. Former senator, current researcher. Retired, technically.",
  "These ruins are Pre-Republican, possibly. The stonework suggests--",
  "I came here to study simplicity. Instead I found cats.",
  "That grey cat? I've named her Minerva. She ignores me. Accurately named.",
  "Lucia brings me food because she thinks I forget to eat. She's correct.",
  "The ruins have carvings. Most are decorative. One chamber has writing I can't translate.",
  "Felix tried to pay me in 'knowledge' once. His name is also Felix. That's me.",
  "You're building things. Good. Civilization requires infrastructure. And cats.",
  "I had a villa on the mainland. Forty rooms. I was miserable.",
];
const FELIX_LINES_MID = [
  "I was a terrible senator. I kept proposing library funding.",
  "They laughed at my proposal for a public cat sanctuary.",
  "The calico brought me a dead mouse. In cat society, highest honor.",
  "I'm rewriting my manuscript. Title: 'The Song of Floating Stones.'",
  "Lucia read the first chapter. She cried. I've never been more terrified.",
];
const FELIX_LINES_HIGH = [
  "The library is built. My books are shelved. The cats claimed every corner.",
  "My manuscript is finished. I dedicated it to the island. And to you.",
  "I thought I came here to study simplicity. The most complex thing I found was friendship.",
  "The cats are wearing togas now. I didn't do this.",
  "Read this key. Inside is everything I know about this island.",
];

function getNPCDialogue(npc, lines, linesMid, linesHigh, npcName) {
  // Check for memory-based greeting (30% chance if memory exists)
  if (npcName && typeof random === 'function' && random() < 0.3) {
    let memLine = getMemoryGreeting(npcName);
    if (memLine) return memLine;
  }
  if (npc.hearts >= 7) {
    let idx = npc.lineIndex % linesHigh.length;
    npc.lineIndex++;
    return linesHigh[idx];
  } else if (npc.hearts >= 4) {
    let idx = npc.lineIndex % linesMid.length;
    npc.lineIndex++;
    return linesMid[idx];
  } else {
    let idx = npc.lineIndex % lines.length;
    npc.lineIndex++;
    return lines[idx];
  }
}

// ─── NPC DAILY WANTS + FAVOR ─────────────────────────────────────────────
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function resetDailyWantsIfNeeded() {
  let today = getTodayDateString();
  if (state.lastWantDate !== today) {
    state.lastWantDate = today;
    state.todayWantsSatisfied = [];
    state.zonesVisitedToday = [];
  }
}

function getNPCDailyWant(npcName) {
  if (typeof getDailyWant === 'function') return getDailyWant(npcName);
  let daySeed = Math.floor(Date.now() / 86400000);
  let offsets = { livia: 0, marcus: 3, vesta: 5, felix: 7 };
  let gifts = { livia: 'flower', marcus: 'fish', vesta: 'harvest', felix: 'gold' };
  let offset = offsets[npcName] || 0;
  return { type: 'gift', resource: gifts[npcName], label: npcName + ' wants a gift' };
}

function checkNPCWantSatisfied(npcName) {
  resetDailyWantsIfNeeded();
  if (state.todayWantsSatisfied.includes(npcName)) return false;

  let want = getNPCDailyWant(npcName);
  if (!want) return false;

  let satisfied = false;
  if (want.type === 'gift') {
    let res = want.resource;
    if (state[res] && state[res] >= 1) {
      state[res]--;
      satisfied = true;
    }
  } else if (want.type === 'favor') {
    satisfied = state.zonesVisitedToday && state.zonesVisitedToday.includes(want.zone);
  } else if (want.type === 'activity') {
    satisfied = true;
  }

  if (satisfied) {
    state.todayWantsSatisfied.push(npcName);
    let currentFavor = state.npcFavor[npcName] || 0;
    let atMax = currentFavor >= 30;
    if (!atMax) {
      let favorAmt = 1;
      // Tech: rhetoric +20% NPC favor gain (rounds to extra point on every 5th gift)
      if (typeof hasTech === 'function' && hasTech('rhetoric')) favorAmt += (Math.random() < 0.2 ? 1 : 0);
      // Faction NPC favor bonus
      let _nfm = (typeof getFactionData === 'function') ? (getFactionData().npcFavorMult || 1) : 1;
      if (_nfm > 1 && Math.random() < (_nfm - 1)) favorAmt += 1;
      state.npcFavor[npcName] = Math.min(30, currentFavor + favorAmt);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('favor_up');
      addFloatingText(width / 2, height * 0.3, npcName.charAt(0).toUpperCase() + npcName.slice(1) + ' is pleased! +1 Favor', '#ffdd44');
    } else {
      // Max favor — still accept gifts, give endgame reward
      let reward = getMaxFavorReward(npcName);
      if (reward) {
        state[reward.resource] = (state[reward.resource] || 0) + reward.amount;
        addFloatingText(width / 2, height * 0.3, npcName.charAt(0).toUpperCase() + npcName.slice(1) + ' gives you ' + reward.amount + ' ' + reward.label + '!', '#88ddff');
      } else {
        addFloatingText(width / 2, height * 0.3, npcName.charAt(0).toUpperCase() + npcName.slice(1) + ' is grateful!', '#ffdd44');
      }
    }
    spawnParticles(state.player.x, state.player.y - 10, 'harvest', 8);

    let favor = state.npcFavor[npcName];
    if (favor === 10 || favor === 20 || favor === 30) {
      addNotification('New dialogue unlocked with ' + npcName.charAt(0).toUpperCase() + npcName.slice(1) + '!', '#ffaaff');
    }
    return true;
  }
  return false;
}

function drawNPCWantBubble(npcScreenX, npcScreenY, npcName) {
  resetDailyWantsIfNeeded();
  if (state.todayWantsSatisfied.includes(npcName)) return;

  let want = getNPCDailyWant(npcName);
  if (!want) return;

  let bx = npcScreenX, by = npcScreenY - 28;
  let bob = sin(frameCount * 0.06 + npcScreenX * 0.01) * 2;

  noStroke();
  fill(255, 250, 235);
  rect(bx - 8, by - 8 + bob, 16, 14, 3);
  fill(255, 250, 235);
  beginShape();
  vertex(bx - 2, by + 6 + bob);
  vertex(bx + 2, by + 6 + bob);
  vertex(bx, by + 10 + bob);
  endShape(CLOSE);

  if (want.type === 'gift') {
    fill(200, 160, 80);
    rect(bx - 4, by - 4 + bob, 8, 6);
    fill(220, 180, 100);
    rect(bx - 5, by - 5 + bob, 10, 2);
    fill(180, 50, 40);
    rect(bx - 1, by - 4 + bob, 2, 6);
  } else if (want.type === 'favor') {
    fill(140, 120, 90);
    ellipse(bx - 2, by - 1 + bob, 4, 6);
    ellipse(bx + 2, by + 1 + bob, 3, 5);
  } else if (want.type === 'activity') {
    fill(240, 200, 60);
    ellipse(bx, by - 1 + bob, 7, 7);
    fill(255, 220, 80);
    ellipse(bx, by - 1 + bob, 4, 4);
  }
}

function drawFavorStars(x, y, npcName) {
  let favor = state.npcFavor[npcName] || 0;
  let fullStars = Math.floor(favor / 6);
  let partialFill = (favor % 6) / 6;

  for (let i = 0; i < 5; i++) {
    let sx = x + i * 14;
    if (i < fullStars) {
      fill(240, 200, 60);
    } else if (i === fullStars && partialFill > 0) {
      fill(lerp(120, 240, partialFill), lerp(110, 200, partialFill), lerp(90, 60, partialFill));
    } else {
      fill(120, 110, 90);
    }
    noStroke();
    beginShape();
    vertex(sx, y - 4);
    vertex(sx + 3, y);
    vertex(sx, y + 4);
    vertex(sx - 3, y);
    endShape(CLOSE);
  }
}

// ─── MAX FAVOR ENDGAME REWARDS ───────────────────────────────────────────
function getMaxFavorReward(npcName) {
  let daySeed = Math.floor(Date.now() / 86400000);
  let npcOffset = { livia: 0, marcus: 3, vesta: 5, felix: 7 }[npcName] || 0;
  let rewards = {
    livia: [
      { resource: 'seeds', amount: 3, label: 'seeds' },
      { resource: 'harvest', amount: 2, label: 'harvest' },
      { resource: 'wine', amount: 1, label: 'wine' },
    ],
    marcus: [
      { resource: 'ironOre', amount: 2, label: 'iron' },
      { resource: 'gold', amount: 5, label: 'gold' },
      { resource: 'fish', amount: 3, label: 'fish' },
    ],
    vesta: [
      { resource: 'crystals', amount: 2, label: 'crystals' },
      { resource: 'gold', amount: 3, label: 'gold' },
      { resource: 'seeds', amount: 4, label: 'seeds' },
    ],
    felix: [
      { resource: 'gold', amount: 4, label: 'gold' },
      { resource: 'crystals', amount: 1, label: 'crystal' },
      { resource: 'wood', amount: 3, label: 'wood' },
    ],
  };
  let pool = rewards[npcName];
  if (!pool) return null;
  return pool[(daySeed + npcOffset) % pool.length];
}

function updateZoneVisits() {
  if (!state.zonesVisitedToday) state.zonesVisitedToday = [];
  let px = state.player.x, py = state.player.y;

  if (state.pyramid && dist(px, py, state.pyramid.x, state.pyramid.y) < 80) {
    if (!state.zonesVisitedToday.includes('temple')) state.zonesVisitedToday.push('temple');
  }
  let farmX = getFarmCenterX(), farmY = getFarmCenterY();
  if (dist(px, py, farmX, farmY) < 100) {
    if (!state.zonesVisitedToday.includes('farm')) state.zonesVisitedToday.push('farm');
  }
  let port = getPortPosition();
  if (dist(px, py, port.x, port.y) < 60) {
    if (!state.zonesVisitedToday.includes('port')) state.zonesVisitedToday.push('port');
  }
  if (state.legia && state.legia.castrumX) {
    if (dist(px, py, state.legia.castrumX, state.legia.castrumY) < 70) {
      if (!state.zonesVisitedToday.includes('castrum')) state.zonesVisitedToday.push('castrum');
    }
  }
  if (state.ruins && state.ruins.length > 0) {
    state.ruins.forEach(r => {
      if (dist(px, py, r.x, r.y) < 50) {
        if (!state.zonesVisitedToday.includes('ruins')) state.zonesVisitedToday.push('ruins');
      }
    });
  }
  if (state.crystalShrine) {
    if (dist(px, py, state.crystalShrine.x, state.crystalShrine.y) < 50) {
      if (!state.zonesVisitedToday.includes('shrine')) state.zonesVisitedToday.push('shrine');
    }
  }
}

// ─── NPC ──────────────────────────────────────────────────────────────────
function drawNPC() {
  let n = state.npc;
  let sx = w2sX(n.x);
  let sy = w2sY(n.y);
  let bob = sin(frameCount * 0.03) * 1.2;
  let breathe = sin(frameCount * 0.04) * 0.4;
  let pDist = dist(state.player.x, state.player.y, n.x, n.y);
  let faceDir = (pDist < 100 && state.player.x < n.x) ? -1 : 1;

  push();
  translate(floor(sx), floor(sy + bob));

  // Natural elliptical shadow
  noStroke();
  fill(0, 0, 0, 35);
  ellipse(0, 17, 18, 5);

  scale(0.72 * faceDir, 0.72);
  translate(0, -2);

  noStroke();
  // Pixel gold sandals
  fill(200, 170, 70);
  rect(-8, 20, 5, 3);
  rect(3, 20, 5, 3);
  // Ankle tie pixels
  fill(190, 160, 60);
  rect(-6, 18, 1, 2);
  rect(5, 18, 1, 2);

  // Pixel stola — ivory silk
  fill(248, 240, 225);
  rect(-10, -5, 20, 26);
  // Thigh slit — show skin on right side
  fill(220, 185, 150);
  rect(5, 12, 4, 9);
  // Dress highlight — right panel
  fill(255, 250, 240, 100);
  rect(4, -4, 6, 24);

  // Pixel palla — crimson drape over left shoulder
  fill(140, 30, 50, 200);
  rect(-10, -6, 14, 14);
  // Palla tail flowing
  fill(120, 25, 40, 160);
  rect(-12, 8, 4, 14);

  // Pixel gold belt
  fill(220, 190, 60);
  rect(-10, 3, 20, 2);
  // Belt details
  fill(200, 170, 50);
  rect(-8, 3, 2, 2);
  rect(-2, 3, 2, 2);
  rect(4, 3, 2, 2);
  // Ruby medallion
  fill(160, 25, 50);
  rect(-1, 3, 2, 2);

  // Gold neckline trim
  fill(220, 190, 60);
  rect(-10, -6, 2, 1);
  rect(-8, -5, 2, 1);
  rect(-6, -4, 2, 1);
  rect(4, -4, 2, 1);
  rect(6, -5, 2, 1);
  rect(8, -6, 2, 1);

  // Pixel arms — bare shoulders
  fill(220, 185, 150);
  rect(-12, -2, 2, 8);
  rect(10, -2, 2, 8);
  // Gold bracelets
  fill(210, 180, 60);
  rect(-12, 4, 2, 1);
  rect(10, 4, 2, 1);

  // Pixel amphora in left hand
  fill(180, 110, 65);
  rect(-15, -4, 4, 6);
  fill(160, 95, 50);
  rect(-15, -6, 3, 2); // neck
  rect(-16, -4, 1, 3); // handle

  // Pixel neck
  fill(220, 185, 150);
  rect(-4, -9, 8, 4);

  // Pixel head
  fill(220, 185, 150);
  rect(-8, -22, 16, 14);

  // Pixel blonde hair — flowing golden locks
  fill(215, 185, 105);
  // Top volume
  rect(-9, -24, 18, 6);
  // Left flowing locks
  rect(-10, -20, 3, 18);
  rect(-11, -14, 2, 12);
  // Right flowing locks
  rect(7, -20, 3, 18);
  rect(9, -14, 2, 12);
  // Hair wave animation
  let hairSway = floor(sin(frameCount * 0.03) * 1);
  rect(-11 + hairSway, -6, 2, 4);
  rect(9 - hairSway, -6, 2, 4);
  // Darker roots / depth
  fill(190, 160, 85);
  rect(-9, -22, 18, 2);
  rect(-10, -18, 3, 4);
  rect(7, -18, 3, 4);
  // Sun-lit highlight strands
  fill(240, 215, 140, 120);
  rect(-8, -24, 3, 2);
  rect(5, -23, 3, 2);
  rect(-4, -25, 4, 1);
  // Forehead strand
  fill(225, 195, 115);
  rect(2, -22, 4, 2);
  rect(-3, -23, 3, 1);

  // Pixel gold laurel crown — ornate with leaves
  fill(220, 195, 60);
  rect(-6, -25, 4, 2);
  rect(-2, -26, 4, 2);
  rect(2, -25, 4, 2);
  // Crown shimmer
  let crownShimmer = sin(frameCount * 0.05) * 0.3 + 0.7;
  fill(245, 225, 100, 60 * crownShimmer);
  rect(-2, -26, 4, 2);
  // Green olive leaves
  fill(90, 140, 50);
  rect(-8, -24, 2, 2);
  rect(6, -24, 2, 2);
  fill(75, 120, 40);
  rect(-7, -25, 2, 1);
  rect(5, -25, 2, 1);
  // Tiny ruby centerpiece
  fill(180, 30, 50);
  rect(-1, -25, 2, 2);
  fill(210, 50, 70, 100);
  rect(0, -25, 1, 1);

  // Pixel eyes — large, warm, expressive (with blink)
  let npcBlink = (frameCount % 300 > 292);
  if (npcBlink) {
    // Closed eyes — serene smile
    fill(200, 165, 135);
    rect(-6, -16, 4, 1);
    rect(2, -16, 4, 1);
    // Kohl eyeliner still visible
    fill(20, 15, 10);
    rect(-7, -17, 5, 1);
    rect(2, -17, 5, 1);
    // Happy crescent hint when blinking
    fill(220, 185, 150);
    rect(-5, -15, 2, 1);
    rect(3, -15, 2, 1);
  } else {
    fill(255);
    rect(-6, -17, 4, 3);
    rect(2, -17, 4, 3);
    // Iris — warm blue-green
    fill(45, 85, 95);
    rect(-5, -17, 2, 2);
    rect(3, -17, 2, 2);
    // Pupil
    fill(25, 45, 50);
    rect(-4, -16, 1, 1);
    rect(4, -16, 1, 1);
    // Highlights — bright sparkle
    fill(255, 255, 255, 240);
    rect(-5, -17, 1, 1);
    rect(3, -17, 1, 1);
    // Second smaller highlight
    fill(255, 255, 255, 120);
    rect(-3, -16, 1, 1);
    rect(5, -16, 1, 1);
    // Kohl eyeliner — elegant dark frame
    fill(20, 15, 10);
    rect(-7, -18, 5, 1);
    rect(2, -18, 5, 1);
    // Long lashes
    rect(-7, -19, 1, 1);
    rect(-6, -19, 1, 1);
    rect(5, -19, 1, 1);
    rect(6, -19, 1, 1);
  }

  // Pixel eyebrows
  fill(45, 28, 15);
  rect(-6, -20, 4, 1);
  rect(2, -20, 4, 1);

  // Pixel nose
  fill(200, 165, 135);
  rect(0, -14, 1, 2);

  // Pixel lips — crimson
  fill(195, 65, 75);
  rect(-2, -12, 4, 1); // upper lip
  fill(180, 55, 65);
  rect(-3, -11, 6, 2); // lower lip
  // Lip shine
  fill(220, 100, 110, 80);
  rect(0, -12, 1, 1);

  // Pixel blush
  fill(220, 130, 120, 50);
  rect(-7, -14, 3, 2);
  rect(4, -14, 3, 2);

  // Pixel beauty mark
  fill(60, 30, 20);
  rect(5, -13, 1, 1);

  // Pixel gold earrings
  fill(220, 195, 60);
  rect(-9, -16, 2, 2);
  rect(7, -16, 2, 2);
  // Dangling gems
  let earOff = floor(sin(frameCount * 0.06) * 1);
  fill(220, 195, 60);
  rect(-9 + earOff, -14, 1, 2);
  rect(8 - earOff, -14, 1, 2);
  fill(140, 20, 50);
  rect(-9 + earOff, -12, 1, 1);
  rect(8 - earOff, -12, 1, 1);

  // Pixel gold necklace
  fill(210, 180, 60);
  rect(-5, -8, 2, 1);
  rect(-3, -7, 2, 1);
  rect(1, -7, 2, 1);
  rect(3, -8, 2, 1);
  // Pendant
  fill(210, 180, 60);
  rect(-1, -6, 2, 2);
  fill(0, 140, 100, 180);
  rect(-1, -6, 1, 1);

  // Counter-scale for UI elements (dialog, prompt, hearts)
  // Undo both size AND facing flip so text reads left-to-right
  let invS = 1 / (0.72 * faceDir);
  push();
  scale(invS, 1 / 0.72);

  if (n.currentLine !== -1 && n.currentLine !== null) {
    let ln = (typeof n.currentLine === 'string') ? n.currentLine : n.lines[n.currentLine];
    drawDialogBubble(0, -34, ln);
    n.dialogTimer--;
    if (n.dialogTimer <= 0) n.currentLine = -1;
  } else {
    let p = state.player;
    let d = dist2(p.x, p.y, n.x, n.y);
    if (d < 80) {
      noStroke();
      fill(color(C.hudBg));
      stroke(color(C.hudBorder));
      strokeWeight(1);
      rect(-16, -30, 32, 14, 3);
      noStroke();
      fill(color(C.crystalGlow));
      textAlign(CENTER, CENTER);
      textSize(9);
      text('[E]', 0, -23);
    }
  }

  for (let h = 0; h < n.hearts; h++) {
    fill(200, 50, 80, 180);
    drawHeart(h * 12 - (n.hearts * 6) + 6, -26 - (n.currentLine !== -1 && n.currentLine !== null ? 28 : 0), 4);
  }
  // Relationship tier label
  if (typeof getRelationshipTier === 'function' && n.hearts > 0) {
    let tier = getRelationshipTier(n.hearts);
    fill(color(tier.color)); textAlign(CENTER, CENTER); textSize(9);
    text(tier.title, 0, -34 - (n.currentLine !== -1 && n.currentLine !== null ? 28 : 0));
    textAlign(LEFT, TOP);
  }
  // Favor stars below hearts
  drawFavorStars(-(5 * 14) / 2, -38 - (n.currentLine !== -1 && n.currentLine !== null ? 28 : 0), 'livia');

  pop(); // counter-scale

  // Want bubble (drawn outside counter-scale, in screen coords)
  drawNPCWantBubble(0, -20, 'livia');

  pop(); // main translate
}

// ─── CITIZEN SYSTEM ───────────────────────────────────────────────────────

// Urban waypoints — road intersections and gathering spots (world coords)
function getCitizenWaypoints() {
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let rx = getSurfaceRX(), ry = getSurfaceRY();
  let avenueY = cy - 8;          // Decumanus Y
  let cardoX = cx + rx * 0.05;   // Cardo X
  return [
    // Decumanus (E-W road) points
    { x: cx - rx * 0.60, y: avenueY, tag: 'road' },     // west decumanus
    { x: cx - rx * 0.35, y: avenueY, tag: 'road' },     // mid-west
    { x: cx,             y: avenueY, tag: 'road' },      // center decumanus
    { x: cardoX,         y: avenueY, tag: 'forum' },     // forum intersection
    { x: cx + rx * 0.30, y: avenueY, tag: 'market' },    // east market area
    { x: cx + rx * 0.55, y: avenueY, tag: 'market' },    // far east market
    // Cardo (N-S road) points
    { x: cardoX, y: cy - ry * 0.45, tag: 'road' },      // north cardo
    { x: cardoX, y: cy - ry * 0.15, tag: 'road' },      // upper cardo
    { x: cardoX, y: cy + ry * 0.25, tag: 'road' },      // lower cardo
    { x: cardoX, y: cy + ry * 0.45, tag: 'road' },      // south cardo
    // Via Sacra (NE diagonal) midpoint
    { x: (cardoX + cx + rx * 0.5) * 0.5, y: (avenueY + cy - ry * 0.35) * 0.5, tag: 'road' },
    // Via Militaris (SE diagonal) midpoint
    { x: (cardoX + cx + rx * 0.45) * 0.5, y: (avenueY + cy + ry * 0.5) * 0.5, tag: 'road' },
    // Port area
    { x: cx + rx * 0.70, y: avenueY + 10, tag: 'port' },
    // Residential cluster (north of decumanus)
    { x: cx - rx * 0.15, y: cy - ry * 0.30, tag: 'home' },
    { x: cx + rx * 0.15, y: cy - ry * 0.25, tag: 'home' },
  ];
}

// Road Y values for snap-to-road behavior
function getNearestRoadY(x, y) {
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let rx = getSurfaceRX(), ry = getSurfaceRY();
  let avenueY = cy - 8;
  let cardoX = cx + rx * 0.05;
  // Decumanus — always available
  let bestY = avenueY;
  let bestDist = abs(y - avenueY);
  // Cardo — only snap if near the cardo X
  if (abs(x - cardoX) < 30) return y; // on cardo, don't force Y
  // Via Sacra line: from (cardoX, avenueY) to (cx+rx*0.5, cy-ry*0.35)
  let vsEndX = cx + rx * 0.5, vsEndY = cy - ry * 0.35;
  if (x > cardoX && x < vsEndX) {
    let t = (x - cardoX) / (vsEndX - cardoX);
    let roadY = lerp(avenueY, vsEndY, t);
    if (abs(y - roadY) < bestDist) { bestY = roadY; bestDist = abs(y - roadY); }
  }
  // Via Militaris line: from (cardoX, avenueY) to (cx+rx*0.45, cy+ry*0.5)
  let vmEndX = cx + rx * 0.45, vmEndY = cy + ry * 0.5;
  if (x > cardoX && x < vmEndX) {
    let t = (x - cardoX) / (vmEndX - cardoX);
    let roadY = lerp(avenueY, vmEndY, t);
    if (abs(y - roadY) < bestDist) { bestY = roadY; bestDist = abs(y - roadY); }
  }
  return bestDist < 30 ? bestY : y;
}

function pickCitizenTarget(c) {
  let waypoints = getCitizenWaypoints();
  let hour = (state.time || 0) / 60;
  // Filter by time of day
  let preferred;
  if (hour >= 6 && hour < 10) {
    // Morning — market area
    preferred = waypoints.filter(w => w.tag === 'market' || w.tag === 'road');
  } else if (hour >= 10 && hour < 16) {
    // Midday — forum / center
    preferred = waypoints.filter(w => w.tag === 'forum' || w.tag === 'road' || w.tag === 'market');
  } else if (hour >= 16 && hour < 20) {
    // Afternoon — port, roads
    preferred = waypoints.filter(w => w.tag === 'port' || w.tag === 'road' || w.tag === 'forum');
  } else {
    // Night — head home
    preferred = waypoints.filter(w => w.tag === 'home' || w.tag === 'road');
  }
  if (preferred.length === 0) preferred = waypoints;
  let wp = preferred[floor(random(preferred.length))];
  // Add small random offset so citizens don't stack exactly
  let tx = wp.x + random(-15, 15);
  let ty = wp.y + random(-10, 10);
  // Snap Y to nearest road if close
  ty = getNearestRoadY(tx, ty);
  return { x: tx, y: ty };
}

function updateCitizens(dt) {
  if (!state.citizens) return;
  let srx = getSurfaceRX(), sry = getSurfaceRY();
  let cx = WORLD.islandCX, cy = WORLD.islandCY;

  state.citizens.forEach(c => {
    c.timer -= dt;
    if (c.state === 'idle') {
      if (c.timer <= 0) {
        let target = pickCitizenTarget(c);
        c.targetX = target.x;
        c.targetY = target.y;
        c.state = 'walking';
        c.timer = floor(random(180, 500));
      }
    } else if (c.state === 'walking') {
      let dx = c.targetX - c.x, dy = c.targetY - c.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d < 5 || c.timer <= 0) {
        c.state = 'idle';
        c.timer = floor(random(60, 180));  // pause at destination
        c.vx = 0; c.vy = 0;
      } else {
        c.vx = (dx / d) * c.speed;
        c.vy = (dy / d) * c.speed;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.facing = c.vx > 0 ? 1 : -1;
      }
    }
    // Clamp to island
    let ex = (c.x - cx) / srx, ey = (c.y - cy) / sry;
    if (ex * ex + ey * ey > 0.7) {
      c.x = cx + (c.x - cx) * 0.95;
      c.y = cy + (c.y - cy) * 0.95;
      c.state = 'idle';
      c.timer = floor(random(60, 200));
    }
  });
}

function initCitizens() {
  state.citizens = [];
  let cap = state.islandLevel <= 4 ? 0 : min(floor(state.islandLevel * 1.2), 30);
  // Tech: democratic_governance +50% population
  if (typeof hasTech === 'function' && hasTech('democratic_governance')) cap = floor(cap * 1.5);
  for (let i = 0; i < cap; i++) spawnCitizen();
}

function spawnCitizen() {
  spawnVariedCitizen();
}

function drawOneCitizen(c) {
  let sx = w2sX(c.x), sy = w2sY(c.y);
  if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) return;

  push();
  translate(sx, sy);
  scale(c.facing, 1);
  noStroke();

  let lvl = state.islandLevel;
  let colors = getCitizenColors(c.variant, lvl, c);
  let walking = c.state === 'walking';
  let phase = c.walkBobPhase || 0;
  let step = sin(frameCount * 0.15 + phase) * 2;
  let bob = walking ? abs(sin(frameCount * 0.15 + phase)) * 0.5 : 0;

  // Idle animation variety
  if (!walking && c.idleAnim !== undefined) {
    if (c.idleAnim === 1) {
      // Look around — subtle head turn
      let lookDir = sin(frameCount * 0.02 + phase) * 0.5;
      translate(lookDir, 0);
    } else if (c.idleAnim === 2) {
      // Arms crossed — handled in arm drawing below via flag
    }
  }

  // Shadow
  fill(0, 0, 0, 30);
  ellipse(0, 4, 10, 4);

  // Sandals — dark brown
  fill(90, 65, 40);
  if (walking) {
    rect(-3, 2 - bob, 2, 2);
    rect(1 + step * 0.3, 2 + bob, 2, 2);
  } else {
    rect(-3, 2, 2, 2);
    rect(1, 2, 2, 2);
  }

  // Legs — skin tone
  fill(colors.skin[0], colors.skin[1], colors.skin[2]);
  if (walking) {
    rect(-2, -1 - bob, 2, 4);
    rect(1 + step * 0.2, -1 + bob, 2, 4);
  } else {
    rect(-2, -1, 2, 4);
    rect(1, -1, 2, 4);
  }

  // Tunic body
  fill(colors.tunic[0], colors.tunic[1], colors.tunic[2]);
  rect(-4, -8, 8, 8);
  // Tunic hem — slightly darker
  fill(colors.tunic[0] - 15, colors.tunic[1] - 15, colors.tunic[2] - 10);
  rect(-4, -1, 8, 1);

  // Belt
  fill(colors.tunic[0] - 35, colors.tunic[1] - 30, colors.tunic[2] - 20);
  rect(-4, -4, 8, 1);

  // Arms — skin, with simple swing when walking
  fill(colors.skin[0], colors.skin[1], colors.skin[2]);
  let armSwing = walking ? floor(sin(frameCount * 0.15 + (c.walkBobPhase || 0)) * 1.5) : 0;
  if (!walking && c.idleAnim === 2) {
    // Arms crossed pose
    rect(-4, -6, 1, 3);
    rect(3, -6, 1, 3);
    rect(-3, -5, 6, 1);
  } else {
    rect(-5, -7 + armSwing, 1, 4);
    rect(4, -7 - armSwing, 1, 4);
  }

  // Neck
  fill(colors.skin[0], colors.skin[1], colors.skin[2]);
  rect(-1, -10, 2, 2);

  // Head
  fill(colors.skin[0], colors.skin[1], colors.skin[2]);
  rect(-3, -14, 6, 5);

  // Hair
  fill(colors.hair[0], colors.hair[1], colors.hair[2]);
  rect(-3, -15, 6, 3);
  // Side hair
  rect(-3, -13, 1, 2);
  rect(2, -13, 1, 2);

  // Eyes — tiny dark dots
  fill(40, 30, 25);
  rect(-1, -12, 1, 1);
  rect(1, -12, 1, 1);

  // Variant-specific detail
  if (c.variant === 'soldier') {
    // Spear
    stroke(100, 80, 60);
    strokeWeight(1);
    line(5, -16, 5, 3);
    noStroke();
    // Spear tip
    fill(180, 175, 165);
    rect(4, -17, 2, 2);
    // Red cape snippet
    fill(140, 40, 35);
    rect(3, -7, 2, 4);
    // Helmet crest
    fill(140, 40, 35);
    rect(-2, -16, 4, 1);
  } else if (c.variant === 'merchant') {
    // Sack/bundle carried
    fill(colors.tunic[0] + 25, colors.tunic[1] + 15, colors.tunic[2] - 5);
    rect(4, -7, 3, 3);
    rect(4, -8, 2, 1);
    // Slightly richer tunic trim
    fill(200, 170, 60);
    rect(-4, -4, 8, 1);
  } else if (c.variant === 'priest') {
    // White stole over tunic
    fill(240, 235, 225);
    rect(-1, -8, 2, 7);
    // Laurel/headband
    fill(90, 130, 50);
    rect(-3, -15, 6, 1);
  } else {
    // Farmer — straw hat
    fill(200, 180, 120);
    rect(-4, -16, 8, 2);
    rect(-3, -17, 6, 1);
  }

  pop();
}

function getCitizenColors(variant, lvl, citizen) {
  // Use per-citizen variety if available
  if (citizen && citizen.skinTone) {
    return { skin: citizen.skinTone, tunic: citizen.tunicColor || [150, 140, 120], hair: citizen.hairColor || [70, 60, 45] };
  }
  let skin = [195, 165, 130];

  if (lvl <= 8) {
    if (variant === 'farmer')   return { skin, tunic: [140, 120, 80],  hair: [80, 60, 40] };
    if (variant === 'merchant') return { skin, tunic: [160, 130, 70],  hair: [70, 50, 35] };
    if (variant === 'soldier')  return { skin, tunic: [120, 100, 70],  hair: [90, 70, 50] };
    if (variant === 'priest')   return { skin, tunic: [180, 170, 140], hair: [60, 50, 40] };
  } else if (lvl <= 17) {
    if (variant === 'farmer')   return { skin, tunic: [160, 140, 100], hair: [70, 55, 35] };
    if (variant === 'merchant') return { skin, tunic: [180, 150, 80],  hair: [60, 45, 30] };
    if (variant === 'soldier')  return { skin, tunic: [160, 50, 40],   hair: [100, 85, 65] };
    if (variant === 'priest')   return { skin, tunic: [230, 225, 210], hair: [50, 40, 30] };
  } else {
    if (variant === 'farmer')   return { skin, tunic: [140, 160, 130], hair: [65, 55, 40] };
    if (variant === 'merchant') return { skin, tunic: [170, 165, 120], hair: [55, 45, 35] };
    if (variant === 'soldier')  return { skin, tunic: [140, 60, 50],   hair: [80, 180, 170] };
    if (variant === 'priest')   return { skin, tunic: [210, 230, 225], hair: [60, 160, 150] };
  }
  return { skin, tunic: [150, 140, 120], hair: [70, 60, 45] };
}

// ─── NEW NPCs ─────────────────────────────────────────────────────
function updateNPCAnim(npc) {
  if (!npc.anim) npc.anim = { blinkTimer: 200, blinkFrame: 0, breathe: 0 };
  let a = npc.anim;
  a.breathe = sin(frameCount * 0.04 + npc.x * 0.01) * 0.5;
  a.blinkTimer--;
  if (a.blinkTimer <= 0) {
    a.blinkFrame = 6; // blink for 6 frames
    a.blinkTimer = floor(random(180, 320));
  }
  if (a.blinkFrame > 0) a.blinkFrame--;
}

// Vesta auto-collects crystals — scales with hearts
function updateVestaCrystalGathering(dt) {
  if (!state.vesta || !state.crystalNodes) return;
  let v = state.vesta;
  let h = v.hearts || 0;
  // Scale interval and max crystals with favor
  let interval, maxCrystals;
  if (h >= 4)      { interval = 240; maxCrystals = 8; }
  else if (h >= 2) { interval = 300; maxCrystals = 5; }
  else             { interval = 360; maxCrystals = 3; }

  if (!v._crystalTimer) v._crystalTimer = 0;
  v._crystalTimer -= dt;
  if (v._crystalTimer > 0) return;
  v._crystalTimer = interval;

  // Find nearest charged crystal node — island-wide range (Vesta walks to them)
  let best = null, bestD = 9999;
  state.crystalNodes.forEach(cn => {
    if (cn.charge <= 0 || cn.respawnTimer > 0) return;
    let d = dist(v.x, v.y, cn.x, cn.y);
    if (d < bestD) { bestD = d; best = cn; }
  });

  if (best) {
    let amount = min(best.charge, maxCrystals);
    best.charge -= amount;
    state.crystals += amount;
    addFloatingText(w2sX(v.x), w2sY(v.y) - 25, '+' + amount + ' Crystal', '#88ffff');
    spawnParticles(v.x, v.y - 10, 'harvest', 6 + h);
    spawnParticles(v.x, v.y - 14, 'sundust', 3);
    if (best.charge <= 0) best.respawnTimer = 1800; // 30 second respawn
  }
}

function npcHeartPop(npc) {
  // Burst of heart particles on gift receive
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: npc.x + random(-6, 6), y: npc.y - 18 + random(-4, 4),
      vx: random(-1, 1), vy: random(-1.5, -0.3),
      life: random(20, 35), maxLife: 35,
      type: 'sundust', size: random(1, 3),
      r: 255, g: 100, b: 130, phase: random(TWO_PI), world: true,
    });
  }
  addFloatingText(w2sX(npc.x), w2sY(npc.y) - 30, '\u2665', '#ff6688');
}

function drawNewNPC(npc, type) {
  let sx = w2sX(npc.x), sy = w2sY(npc.y);
  updateNPCAnim(npc);
  let a = npc.anim;
  let bob = floor(sin(frameCount * 0.03 + npc.x * 0.1) + a.breathe) * 1;
  let blinking = a.blinkFrame > 0;
  let pDist = dist(state.player.x, state.player.y, npc.x, npc.y);
  let npcFace = (pDist < 100 && state.player.x < npc.x) ? -1 : 1;

  push();
  translate(floor(sx), floor(sy + bob));
  if (npcFace < 0) scale(-1, 1);
  noStroke();

  // Elliptical shadow — natural
  fill(0, 0, 0, 30);
  ellipse(0, 13, 20, 5);

  // Hover glow when player is near — warm aura
  let pd = dist2(state.player.x, state.player.y, npc.x, npc.y);
  if (pd < 80 && npc.dialogTimer <= 0) {
    let ga = 12 + floor(sin(frameCount * 0.08) * 6);
    fill(255, 220, 150, ga);
    ellipse(0, 0, 24, 30);
  }

  if (type === 'marcus') {
    // ─── MARCUS — Centurion with Flowing Cape ───
    // Flowing red cape behind
    let cWave = floor(sin(frameCount * 0.05) * 2);
    let cLen = 18 + cWave;
    fill(140, 30, 25, 160);
    rect(5, -4, 4, cLen);
    fill(175, 40, 32, 190);
    rect(4, -5, 4, cLen - 1);
    fill(120, 25, 20, 80);
    rect(5, -5 + cLen - 2, 2, 2);

    // Heavy military sandals
    fill(90, 60, 25);
    rect(-5, 9, 4, 3);
    rect(1, 9, 4, 3);
    fill(75, 48, 18);
    rect(-5, 11, 4, 1);
    rect(1, 11, 4, 1);
    // Muscular legs
    fill(200, 165, 130);
    rect(-4, 4, 3, 6);
    rect(1, 4, 3, 6);
    // Red tunica base
    fill(155, 35, 30);
    rect(-7, -4, 14, 10);
    // Pteruges
    fill(130, 95, 40);
    for (let i = -2; i <= 2; i++) rect(i * 3 - 1, 5, 2, 3);
    // Lorica segmentata — riveted plate armor
    fill(170, 168, 175);
    rect(-6, -4, 12, 6);
    fill(145, 142, 152);
    rect(-6, -2, 12, 1);
    rect(-6, 0, 12, 1);
    fill(200, 198, 205);
    rect(-5, -3, 1, 1); rect(4, -3, 1, 1);
    rect(-5, -1, 1, 1); rect(4, -1, 1, 1);
    fill(195, 193, 200, 80);
    rect(-5, -4, 4, 2);
    // Gold belt with phalerae
    fill(190, 160, 50);
    rect(-6, 1, 12, 2);
    fill(210, 180, 60);
    rect(-2, 1, 4, 2);
    // Larger pauldrons
    fill(160, 158, 168);
    rect(-9, -5, 4, 4);
    rect(5, -5, 4, 4);
    fill(175, 173, 180, 80);
    rect(-8, -5, 2, 1);
    rect(6, -5, 2, 1);
    // Muscular arms
    fill(200, 165, 130);
    rect(-9, -1, 2, 5);
    rect(7, -1, 2, 5);
    // Scutum — large shield with eagle
    fill(155, 30, 25);
    rect(-13, -5, 5, 12);
    fill(190, 165, 55);
    rect(-12, -1, 3, 1); rect(-11, -2, 1, 1); rect(-11, 0, 1, 1);
    fill(200, 175, 60);
    rect(-12, 1, 3, 2);
    fill(190, 165, 55);
    rect(-13, -5, 5, 1); rect(-13, 6, 5, 1);
    // Gladius — sheathed
    fill(100, 80, 40);
    rect(7, 1, 2, 7);
    fill(180, 180, 190);
    rect(7, 0, 2, 2);
    fill(200, 170, 60);
    rect(7, 0, 2, 1);
    // Neck
    fill(200, 165, 130);
    rect(-3, -7, 6, 3);
    // Head
    fill(200, 165, 130);
    rect(-5, -14, 10, 8);
    // Bronze galea with tall crest
    fill(170, 145, 60);
    rect(-6, -16, 12, 5);
    fill(180, 155, 65);
    rect(-6, -12, 12, 1);
    // Cheek guards
    fill(160, 135, 55);
    rect(-6, -12, 2, 4);
    rect(4, -12, 2, 4);
    // Tall transverse crest — centurion
    fill(185, 35, 28);
    let cf = floor(sin(frameCount * 0.09) * 1);
    rect(-4, -18, 8, 2);
    rect(-3 + cf, -19, 6, 2);
    rect(-2 + cf, -20, 4, 1);
    fill(165, 28, 22);
    rect(-3 + cf, -18, 2, 1);
    // Jaw / stubble
    fill(180, 148, 115, 90);
    rect(-4, -8, 8, 2);
    // Eyes — stern
    if (blinking) {
      fill(180, 148, 115);
      rect(-3, -11, 2, 1);
      rect(1, -11, 2, 1);
    } else {
      fill(255);
      rect(-3, -12, 2, 2);
      rect(1, -12, 2, 2);
      fill(40, 30, 20);
      rect(-2, -12, 1, 1);
      rect(2, -12, 1, 1);
    }
    // Battle scar
    fill(190, 140, 120);
    rect(-4, -10, 1, 3);
    // Strong furrowed brow
    fill(150, 120, 90);
    rect(-4, -13, 3, 1);
    rect(1, -13, 3, 1);
    // Stern mouth
    fill(160, 130, 105);
    rect(-2, -8, 4, 1);

  } else if (type === 'vesta') {
    // ─── VESTA — Beautiful Priestess in White ───
    // Elegant gold sandals
    fill(210, 180, 80);
    rect(-4, 10, 3, 2);
    rect(1, 10, 3, 2);
    fill(190, 160, 60);
    rect(-4, 11, 3, 1);
    rect(1, 11, 3, 1);
    // Flowing white dress — elegant, form-fitting
    fill(245, 240, 232);
    rect(-6, -4, 12, 17);
    // Dress shadow fold — left side deeper
    fill(225, 218, 208);
    rect(-6, -4, 4, 17);
    // Dress highlight — right side catches light
    fill(252, 248, 242);
    rect(2, -3, 4, 15);
    // Cinched waist — gold belt
    fill(215, 185, 70);
    rect(-6, 1, 12, 2);
    // Belt medallion — sacred flame
    fill(235, 205, 80);
    rect(-2, 0, 4, 3);
    fill(255, 180, 50, 160);
    rect(-1, 0, 2, 2);
    // Dress draping — flowing hem
    fill(238, 232, 222);
    rect(-7, 9, 3, 4);
    rect(4, 9, 3, 4);
    // Bare shoulders + arms — graceful
    fill(225, 195, 165);
    rect(-8, -3, 2, 6);
    rect(6, -3, 2, 6);
    // Delicate hands
    fill(220, 190, 158);
    rect(-8, 3, 2, 2);
    rect(6, 3, 2, 2);
    // Gold armlets
    fill(215, 185, 70);
    rect(-8, -2, 2, 1);
    rect(6, -2, 2, 1);
    // Neckline — draped white with gold clasp
    fill(248, 244, 236);
    rect(-4, -5, 8, 2);
    fill(220, 190, 80);
    rect(-1, -5, 2, 2);
    // Crystal staff in right hand
    fill(130, 110, 72);
    rect(7, -18, 2, 20);
    fill(145, 125, 85);
    rect(7, -18, 1, 20);
    // Crystal at top — amethyst, pulsing
    let crystPulse = sin(frameCount * 0.06) * 0.3 + 0.7;
    fill(160, 80, 200, 220);
    rect(6, -22, 4, 4);
    fill(190, 120, 235, 180);
    rect(7, -23, 2, 2);
    // Crystal glow
    fill(170, 110, 230, floor(12 * crystPulse));
    ellipse(8, -20, 14, 14);
    // Long flowing hair — dark with highlights
    fill(45, 30, 22);
    rect(-5, -12, 10, 8);
    // Hair falls past shoulders
    rect(-6, -8, 2, 8);
    rect(4, -8, 2, 8);
    // Hair sheen highlights
    fill(70, 48, 35, 120);
    rect(-4, -12, 2, 6);
    rect(2, -11, 2, 5);
    // Face — beautiful, warm skin
    fill(225, 198, 172);
    rect(-4, -12, 8, 7);
    // Delicate features
    fill(210, 180, 155);
    rect(-3, -8, 6, 1); // jaw line
    // Lips — soft rose
    fill(200, 120, 110);
    rect(-1, -7, 2, 1);
    // Gold circlet on forehead
    fill(220, 195, 80);
    rect(-4, -13, 8, 1);
    // Circlet gem
    fill(160, 90, 210);
    rect(-1, -13, 2, 1);
    // Eyes — deep green, serene
    if (blinking) {
      fill(210, 185, 162);
      rect(-3, -9, 2, 1);
      rect(1, -9, 2, 1);
    } else {
      fill(55, 110, 75);
      rect(-3, -10, 2, 2);
      rect(1, -10, 2, 2);
      // Eye highlights
      fill(120, 180, 140, 180);
      rect(-3, -10, 1, 1);
      rect(1, -10, 1, 1);
    }
    // Serene smile
    fill(190, 140, 130, 80);
    rect(-1, -7, 2, 1);
    // Subtle glow aura behind
    fill(200, 180, 255, 8 + floor(sin(frameCount * 0.04) * 6));
    rect(-10, -16, 20, 30);

  } else if (type === 'felix') {
    // ─── FELIX — Humble Farmer ───
    // Bare feet — calloused
    fill(160, 120, 80);
    rect(-4, 10, 3, 2);
    rect(1, 10, 3, 2);
    // Toe detail
    fill(150, 110, 70);
    rect(-3, 10, 1, 1);
    rect(2, 10, 1, 1);
    // Legs
    fill(180, 150, 110);
    rect(-4, 4, 3, 7);
    rect(1, 4, 3, 7);
    // Earth-brown tunic
    fill(140, 105, 65);
    rect(-6, -3, 12, 9);
    // Tunic lighter center
    fill(155, 118, 75);
    rect(-3, -2, 6, 8);
    // Olive green apron
    fill(85, 110, 50);
    rect(-5, 1, 10, 7);
    // Rope belt
    fill(120, 90, 50);
    rect(-6, 0, 12, 1);
    // Belt knot
    fill(130, 100, 55);
    rect(3, 0, 2, 2);
    // Arms — sun-weathered skin
    fill(175, 140, 100);
    rect(-8, -1, 2, 6);
    rect(6, -1, 2, 6);
    // Sickle in right hand — curved blade + wood handle
    fill(80, 55, 25);
    rect(7, -4, 2, 10); // handle
    fill(95, 68, 32);
    rect(7, -4, 2, 2); // handle grip
    // Curved sickle blade
    fill(170, 170, 180);
    rect(8, -6, 2, 3);
    rect(9, -8, 2, 2);
    rect(10, -9, 2, 2);
    // Blade edge highlight
    fill(195, 195, 205);
    rect(10, -9, 1, 2);
    // Neck
    fill(175, 140, 100);
    rect(-3, -6, 6, 3);
    // Head — ruddy and sun-worn
    fill(185, 148, 108);
    rect(-5, -14, 10, 9);
    // Sun-weathered highlight
    fill(195, 158, 118, 80);
    rect(-4, -13, 4, 4);
    // Straw hat — wide brim
    fill(195, 175, 105);
    rect(-8, -16, 16, 3);
    // Hat crown
    fill(185, 165, 95);
    rect(-5, -19, 10, 3);
    // Hat band
    fill(140, 100, 55);
    rect(-5, -16, 10, 1);
    // Wispy gray-brown hair under hat
    fill(150, 135, 115);
    rect(-5, -14, 2, 3);
    rect(3, -14, 2, 3);
    // Short beard — grizzled
    fill(160, 145, 125);
    rect(-3, -5, 6, 2);
    rect(-2, -3, 4, 1);
    // Eyes — warm brown, crinkled
    if (blinking) {
      fill(170, 135, 100);
      rect(-3, -11, 2, 1);
      rect(1, -11, 2, 1);
    } else {
      fill(60, 40, 25);
      rect(-3, -12, 2, 2);
      rect(1, -12, 2, 2);
      // Warm highlight
      fill(90, 65, 40);
      rect(-3, -12, 1, 1);
      rect(1, -12, 1, 1);
    }
    // Crow's feet (smile wrinkles)
    fill(165, 130, 95, 80);
    rect(-5, -11, 1, 1);
    rect(4, -11, 1, 1);
    // Ruddy nose
    fill(195, 140, 110);
    rect(-1, -10, 2, 2);
    // Kind smile
    fill(145, 105, 80, 100);
    rect(-1, -7, 2, 1);
  }

  // Undo facing flip for UI text (so text always reads left-to-right)
  if (npcFace < 0) scale(-1, 1);

  // Hearts above head
  for (let h = 0; h < min(npc.hearts, 10); h++) {
    let hx = h * 7 - (min(npc.hearts, 10) * 3.5) + 3.5;
    fill(h < npc.hearts ? '#ff6688' : '#443344');
    drawHeart(hx, -22, 3);
  }
  // Relationship tier label
  if (typeof getRelationshipTier === 'function' && npc.hearts > 0) {
    let _tier = getRelationshipTier(npc.hearts);
    fill(color(_tier.color)); textAlign(CENTER, CENTER); textSize(9);
    text(_tier.title, 0, -28);
    textAlign(LEFT, TOP);
  }
  // Favor stars below hearts
  drawFavorStars(-(5 * 14) / 2, -32, type);
  // Want bubble above NPC
  drawNPCWantBubble(0, -20, type);

  // Dialog bubble
  if (npc.dialogTimer > 0) {
    npc.dialogTimer--;
    fill(0, 0, 0, 160);
    rect(-70, -52, 140, 22, 4);
    fill(255);
    textSize(9);
    textAlign(CENTER, CENTER);
    let line = npc.currentLine >= 0 ? npc.currentLine : '';
    text(line, 0, -41);
    textAlign(LEFT, TOP);
  }

  // Ambient idle chatter — NPC mutters when player is at medium range
  if (npc.dialogTimer <= 0 && pd > 80 && pd < 200) {
    if (!npc._ambientTimer) npc._ambientTimer = floor(random(300, 600));
    npc._ambientTimer--;
    if (npc._ambientTimer <= 0) {
      npc._ambientTimer = floor(random(400, 900));
      let ambLine = getAmbientLine(type);
      if (ambLine) {
        npc.currentLine = ambLine;
        npc.dialogTimer = 150;
      }
    }
  }

  // [E] prompt when player is near — with warm glow
  if (pd < 80 && npc.dialogTimer <= 0 && !(type === 'marcus' && !npc.present)) {
    fill(255, 230, 180, 180);
    textSize(10);
    textAlign(CENTER, CENTER);
    text('[E]', 0, -27);
    textAlign(LEFT, TOP);
  }

  pop();
}

// ─── NPC DAILY SCHEDULES ──────────────────────────────────────────────────
// Returns target world position for a named NPC based on time of day.
const NPC_SCHEDULES = {
  livia: [
    { start: 6, end: 11, x: 280, y: 380 },       // morning: farm plots
    { start: 11, end: 15, x: 600, y: 400 },       // midday: well/center
    { start: 15, end: 20, x: 600, y: 480 },       // evening: forum area
    { start: 20, end: 24, x: 540, y: 420 },       // night: home
    { start: 0, end: 6, x: 540, y: 420 },
  ],
  marcus: [
    { start: 6, end: 11, x: 1000, y: 430 },       // morning: port
    { start: 11, end: 15, x: 870, y: 370 },       // midday: market/center
    { start: 15, end: 20, x: 700, y: 450 },       // evening: tavern area
    { start: 20, end: 24, x: 1040, y: 440 },      // night: home
    { start: 0, end: 6, x: 1040, y: 440 },
  ],
  vesta: [
    { start: 6, end: 11, x: 840, y: 310 },        // morning: temple area
    { start: 11, end: 15, x: 400, y: 350 },       // midday: garden
    { start: 15, end: 20, x: 600, y: 400 },       // evening: center
    { start: 20, end: 24, x: 180, y: 395 },       // night: home
    { start: 0, end: 6, x: 180, y: 395 },
  ],
  felix: [
    { start: 6, end: 11, x: 350, y: 300 },        // morning: roaming/ruins
    { start: 11, end: 15, x: 600, y: 400 },       // midday: center
    { start: 15, end: 20, x: 950, y: 420 },       // evening: port
    { start: 20, end: 24, x: 400, y: 390 },       // night: home
    { start: 0, end: 6, x: 400, y: 390 },
  ],
};

function getNPCSchedulePos(npcName, hour) {
  let schedule = NPC_SCHEDULES[npcName];
  if (!schedule) return null;
  for (let i = 0; i < schedule.length; i++) {
    let s = schedule[i];
    if (hour >= s.start && hour < s.end) return { x: s.x, y: s.y };
  }
  let last = schedule[schedule.length - 1];
  return { x: last.x, y: last.y };
}

function updateNPCSchedule(npc, npcName, dt) {
  let hour = (typeof state !== 'undefined' && state.time != null) ? state.time / 60 : 12;
  let target = getNPCSchedulePos(npcName, hour);
  if (!target) return;
  let dx = target.x - npc.x;
  let dy = target.y - npc.y;
  let d = Math.sqrt(dx * dx + dy * dy);
  if (d < 3) return;
  let speed = 0.5;
  let step = speed * dt;
  if (step > d) step = d;
  npc.x += (dx / d) * step;
  npc.y += (dy / d) * step;
  if (Math.abs(dx) > 1) npc._schedFacing = dx > 0 ? 1 : -1;
}

function updateAllNPCSchedules(dt) {
  if (typeof state === 'undefined') return;
  if (state.npc) updateNPCSchedule(state.npc, 'livia', dt);
  if (state.marcus && state.marcus.present !== false) updateNPCSchedule(state.marcus, 'marcus', dt);
  if (state.vesta) updateNPCSchedule(state.vesta, 'vesta', dt);
  if (state.felix) updateNPCSchedule(state.felix, 'felix', dt);
}

// ─── NPC AMBIENT DIALOGUE ────────────────────────────────────────────────
// Time-of-day / weather / season sensitive idle chatter per NPC.
// Returns a string. Called by drawNewNPC idle-bubble system.

const NPC_AMBIENT_LINES = {
  livia: {
    morning: [
      "The soil smells rich today. Good for planting.",
      "I like the quiet before the forum fills up.",
      "Morning dew on the olives... perfect harvest weather.",
      "Did you sleep well? The island was restless last night.",
    ],
    noon: [
      "The forum is lively. I traded honey for cloth earlier.",
      "Sun's high. The crops are drinking deep.",
      "Have you eaten? I made bread this morning.",
      "Everyone seems in good spirits today.",
    ],
    evening: [
      "The sunset colors remind me of the mainland. Almost.",
      "Time to bring the tools in. A good day's work.",
      "The cats always gather at dusk. They know something we don't.",
      "I can smell someone cooking fish. Jealous.",
    ],
    night: [
      "The stars here are brighter than anywhere I've lived.",
      "Rest well. Tomorrow the fields need us again.",
      "I hear the waves... soothing, isn't it?",
      "Quiet nights like this make it all worth it.",
    ],
    rain: [
      "Rain! The crops will love this.",
      "I don't mind getting wet. The plants need it more than I need dry hair.",
    ],
    storm: [
      "Stay safe... the wind is fierce tonight.",
      "Storms pass. They always do.",
    ],
    winter: [
      "Brr. I miss the summer warmth already.",
      "The frost makes the island look like crystal.",
    ],
    summer: [
      "The heat! I could drink the whole well dry.",
      "Summer grapes are coming in beautifully.",
    ],
  },
  marcus: {
    morning: [
      "Another day, another shipment to check.",
      "The harbor looks clear. Good sailing weather.",
      "I counted the inventory twice. Old habit.",
      "Morning drills keep the mind sharp.",
    ],
    noon: [
      "Midday trade is the busiest. Everyone wants something.",
      "The merchants from the east had interesting wares today.",
      "I've seen three new faces at the port already.",
      "Market prices are holding steady. For now.",
    ],
    evening: [
      "The port quiets down at dusk. I like it.",
      "A drink wouldn't hurt. Don't look at me like that.",
      "Ships look beautiful heading into the sunset.",
      "I'm recounting the day's trades. Give me a moment.",
    ],
    night: [
      "Guard duty used to be my life. Some habits stay.",
      "The sea at night... you can hear it thinking.",
      "I should sleep. I won't, but I should.",
      "Quiet. Good. I don't trust quiet, but good.",
    ],
    rain: [
      "Rain keeps the amateur sailors in port. Fine by me.",
      "Wet wood warps. I'll need to check the crates.",
    ],
    storm: [
      "I've sailed through worse. Not by much though.",
      "Storms remind me of Fortuna's last night. Forget I said that.",
    ],
    winter: [
      "Cold makes the joints ache. Getting old is a battle.",
      "Trade slows in winter. Time to repair gear.",
    ],
    summer: [
      "Hot enough to cook fish on the dock stones.",
      "Summer winds are good for trade routes.",
    ],
  },
  vesta: {
    morning: [
      "The flame burned steady all night. A blessing.",
      "Morning prayers are the sweetest. The island listens.",
      "I gathered herbs at dawn. The dew makes them potent.",
      "The crystals hum louder in the morning. Do you hear it?",
    ],
    noon: [
      "The sun feeds the sacred flame. They are sisters.",
      "I walked the garden. Every plant is a small prayer.",
      "The temple steps are warm. Sit with me a moment.",
      "Midday is for contemplation. The soul needs stillness.",
    ],
    evening: [
      "The twilight hour is sacred. Between light and dark.",
      "I'll tend the flame through dusk. It needs me most now.",
      "The stars are waking. I greet each one by name.",
      "Evening blessings for the island. And for you.",
    ],
    night: [
      "The flame never sleeps. Neither do I, some nights.",
      "Night is when the island dreams. I guard those dreams.",
      "The crystals glow brightest in darkness. Like hope.",
      "Sleep, little one. The gods keep watch.",
    ],
    rain: [
      "Rain is the sky weeping with joy. Or sadness. Both are sacred.",
      "The flame dances differently in the rain. Watch closely.",
    ],
    storm: [
      "Even storms are blessings, if you know where to look.",
      "The temple has stood through worse. Faith is stronger than stone.",
    ],
    winter: [
      "Winter teaches patience. The earth rests. So should we.",
      "I keep the flame higher in winter. The island needs warmth.",
    ],
    summer: [
      "The island is most alive in summer. Can you feel it breathing?",
      "Summer festivals honor the gods of abundance.",
    ],
  },
  felix: {
    morning: [
      "I found a new inscription near the ruins. Fascinating!",
      "Minerva brought me a mouse this morning. Charming.",
      "Morning light reveals details the afternoon hides.",
      "I've been cataloguing since dawn. Three new entries!",
    ],
    noon: [
      "Lunch? Oh. I forgot again. Thank you for reminding me.",
      "The forum has interesting acoustics. I measured them.",
      "Did you know the island tilts 0.3 degrees eastward at noon?",
      "I'm cross-referencing two texts. They contradict beautifully.",
    ],
    evening: [
      "The sunset casts long shadows on the ruins. Perfect for measuring.",
      "I should organize my scrolls. Tomorrow. Definitely tomorrow.",
      "The cats have claimed my reading chair again.",
      "Evening is when the best ideas arrive uninvited.",
    ],
    night: [
      "I can't sleep when there's a puzzle unsolved.",
      "The stars are a map. I'm still learning to read them.",
      "Minerva is nocturnal. She keeps me company.",
      "One more chapter... I've been saying that for three hours.",
    ],
    rain: [
      "Perfect weather for reading! The ink stays wet longer too.",
      "Rain on old stone makes the carvings easier to trace.",
    ],
    storm: [
      "I hope my scrolls are covered! ...They're not, are they.",
      "Storms erode the ruins. I document what I can before it's lost.",
    ],
    winter: [
      "Cold hands make poor writing. I need fingerless gloves.",
      "The library is warmest in winter. Come visit.",
    ],
    summer: [
      "Summer heat warps parchment. I keep the scrolls in shade.",
      "I found a beetle in my manuscript. New species? Probably not.",
    ],
  },
};

function getAmbientLine(npcName) {
  let lines = NPC_AMBIENT_LINES[npcName];
  if (!lines) return null;

  let hour = (state.time || 0) / 60;
  let weather = (state.weather && state.weather.type) ? state.weather.type : 'clear';
  let season = (typeof getSeason === 'function') ? getSeason() : 0;

  // Weather-specific lines take priority sometimes
  if ((weather === 'rain' || weather === 'storm') && lines[weather] && random() < 0.4) {
    let pool = lines[weather];
    return pool[floor(random(pool.length))];
  }

  // Season-specific lines sometimes
  let seasonKey = ['spring', 'summer', 'autumn', 'winter'][season];
  if (lines[seasonKey] && random() < 0.25) {
    let pool = lines[seasonKey];
    return pool[floor(random(pool.length))];
  }

  // Time-of-day lines
  let timeKey;
  if (hour >= 6 && hour < 12) timeKey = 'morning';
  else if (hour >= 12 && hour < 18) timeKey = 'noon';
  else if (hour >= 18 && hour < 22) timeKey = 'evening';
  else timeKey = 'night';

  let pool = lines[timeKey];
  if (!pool || pool.length === 0) return null;
  return pool[floor(random(pool.length))];
}

// ─── NPC REACTION TRIGGERS ───────────────────────────────────────────────
// Call these from sketch.js hooks (placeBuilding, harvest, combat return).
// They make nearby NPCs comment on player actions.

function triggerNPCReaction(eventType, wx, wy) {
  if (typeof state === 'undefined') return;
  let npcs = [];
  if (state.npc) npcs.push({ npc: state.npc, name: 'livia' });
  if (state.marcus && state.marcus.present !== false) npcs.push({ npc: state.marcus, name: 'marcus' });
  if (state.vesta) npcs.push({ npc: state.vesta, name: 'vesta' });
  if (state.felix) npcs.push({ npc: state.felix, name: 'felix' });

  npcs.forEach(entry => {
    let n = entry.npc;
    if (n.dialogTimer > 0) return; // already talking
    let d = dist(n.x, n.y, wx || state.player.x, wy || state.player.y);
    if (d > 150) return; // too far to notice
    let line = getNPCReactionLine(entry.name, eventType);
    if (!line) return;
    n.currentLine = line;
    n.dialogTimer = 180;
  });
}

const NPC_REACTIONS = {
  livia: {
    build:   ["Another building! The island grows.", "Good placement. I like it.", "You're shaping this place into a real home."],
    harvest: ["A fine harvest! The soil loves you.", "Look at that yield! Well done.", "The crops are thriving under your care."],
    combat:  ["You're back safe. That's what matters.", "Rest now. The farm can wait.", "I worried. Don't make a habit of it."],
    fish:    ["Fresh catch? I'll cook tonight!", "The sea provides. As always."],
  },
  marcus: {
    build:   ["Sturdy work. I approve.", "Infrastructure. Smart investment.", "That'll hold. I've seen worse on the mainland."],
    harvest: ["Good. We can trade the surplus.", "The colonies need food. This helps.", "Not bad for a farmer."],
    combat:  ["How were the odds? ...You look intact.", "Victory looks good on you, soldier.", "Report. How many? Never mind, you're alive."],
    fish:    ["Bring it to market. I know buyers.", "Fish means trade. Trade means gold."],
  },
  vesta: {
    build:   ["The island welcomes new structures. I feel it.", "You build with purpose. The gods notice.", "A blessing on this new creation."],
    harvest: ["The earth gives freely to those who tend it.", "A bountiful harvest. The island rewards faith.", "Each seed planted is a prayer answered."],
    combat:  ["The flame flickered while you fought. It sensed danger.", "You returned. The island still needs you.", "I prayed for your safety. It seems it worked."],
    fish:    ["The sea offered a gift. Accept it with gratitude.", "Poseidon smiles today."],
  },
  felix: {
    build:   ["Interesting architecture! Can I document the design?", "Another data point for my urban development chapter.", "The cats need more structures to lounge on. This helps."],
    harvest: ["Fascinating growth patterns this season.", "I should note the yield in my agricultural appendix.", "Minerva approves. She was eyeing the grain."],
    combat:  ["You survived! Excellent. I have questions about the terrain.", "Welcome back! Did you find any inscriptions out there?", "Combat data is hard to gather firsthand. Thank you for... surviving."],
    fish:    ["Is that a new species? Let me see! ...No, just a bass.", "I'm writing a fish taxonomy chapter. May I sketch it?"],
  },
};

function getNPCReactionLine(npcName, eventType) {
  let reactions = NPC_REACTIONS[npcName];
  if (!reactions || !reactions[eventType]) return null;
  let pool = reactions[eventType];
  return pool[floor(random(pool.length))];
}

// ─── NPC MEMORY ──────────────────────────────────────────────────────────
// NPCs remember recent interactions and reference them in dialogue.
// Stored in state.npcMemory = { livia: [{type, day, detail}], ... }

function initNPCMemory() {
  if (!state.npcMemory) state.npcMemory = {};
  ['livia', 'marcus', 'vesta', 'felix'].forEach(name => {
    if (!state.npcMemory[name]) state.npcMemory[name] = [];
  });
}

function addNPCMemory(npcName, type, detail) {
  initNPCMemory();
  let mem = state.npcMemory[npcName];
  if (!mem) return;
  mem.push({ type: type, day: state.day || 0, detail: detail || '' });
  // Keep only last 10 memories per NPC
  if (mem.length > 10) mem.shift();
}

function getMemoryGreeting(npcName) {
  initNPCMemory();
  let mem = state.npcMemory[npcName];
  if (!mem || mem.length === 0) return null;
  let today = state.day || 0;

  // Check most recent memory first
  for (let i = mem.length - 1; i >= 0; i--) {
    let m = mem[i];
    let daysAgo = today - m.day;
    if (daysAgo < 0 || daysAgo > 3) continue; // only reference last 3 days

    let when = daysAgo === 0 ? 'earlier' : daysAgo === 1 ? 'yesterday' : 'the other day';

    if (m.type === 'gift') {
      return NPC_MEMORY_LINES[npcName] && NPC_MEMORY_LINES[npcName].gift
        ? NPC_MEMORY_LINES[npcName].gift.replace('{when}', when)
        : null;
    }
    if (m.type === 'chat') {
      return NPC_MEMORY_LINES[npcName] && NPC_MEMORY_LINES[npcName].chat
        ? NPC_MEMORY_LINES[npcName].chat.replace('{when}', when)
        : null;
    }
    if (m.type === 'quest') {
      return NPC_MEMORY_LINES[npcName] && NPC_MEMORY_LINES[npcName].quest
        ? NPC_MEMORY_LINES[npcName].quest.replace('{when}', when)
        : null;
    }
  }
  return null;
}

const NPC_MEMORY_LINES = {
  livia: {
    gift: "That gift you brought {when}... it made my day. Truly.",
    chat: "I was thinking about what we talked about {when}.",
    quest: "You helped me {when}. I haven't forgotten.",
  },
  marcus: {
    gift: "That thing you gave me {when}. Not bad. ...Don't let it go to your head.",
    chat: "About what you said {when}... I've been mulling it over.",
    quest: "You came through {when}. Respect.",
  },
  vesta: {
    gift: "The offering you brought {when} pleased the spirits. I could feel it.",
    chat: "Our conversation {when} stayed with me. The island listened too.",
    quest: "Your devotion {when} was noted by the gods. And by me.",
  },
  felix: {
    gift: "I catalogued that gift from {when}. Page 47, subsection C. I'm joking. Page 48.",
    chat: "I wrote down our discussion from {when}. Fascinating insights!",
    quest: "That task you completed {when}... I'm still analyzing the implications.",
  },
};

// ─── AMBIENT CITIZEN VARIETY ─────────────────────────────────────────────
// Adds skin tone, clothing color, and speed variation to citizens.

const CITIZEN_SKIN_TONES = [
  [225, 195, 160],  // fair
  [195, 165, 130],  // olive (original)
  [175, 140, 100],  // tan
  [150, 115, 80],   // bronze
  [120, 85, 60],    // dark
  [210, 180, 145],  // warm light
];

const CITIZEN_TUNIC_HUES = [
  [140, 120, 80],   // earthy brown
  [120, 90, 70],    // dark brown
  [160, 140, 100],  // sand
  [100, 120, 90],   // olive green
  [130, 100, 110],  // muted plum
  [110, 110, 130],  // dusty blue
  [150, 130, 90],   // wheat
  [140, 80, 70],    // terracotta
];

const CITIZEN_HAIR_COLORS = [
  [80, 60, 40],     // brown
  [50, 35, 25],     // dark brown
  [110, 85, 55],    // light brown
  [40, 30, 20],     // near-black
  [160, 130, 80],   // sandy blonde
  [90, 65, 45],     // auburn
];

function spawnVariedCitizen() {
  let waypoints = getCitizenWaypoints();
  let wp = waypoints[floor(random(waypoints.length))];
  let x = wp.x + random(-12, 12);
  let y = wp.y + random(-8, 8);
  if (!isOnIsland(x, y)) { x = wp.x; y = wp.y; }
  let variants = ['farmer', 'merchant', 'soldier', 'priest'];
  let weights = state.islandLevel <= 8 ? [4,2,1,1] : state.islandLevel <= 17 ? [2,3,2,1] : [1,2,3,2];
  let totalW = weights.reduce((a,b) => a+b, 0);
  let roll = floor(random(totalW));
  let vi = 0, acc = 0;
  for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (roll < acc) { vi = i; break; } }

  let skinIdx = floor(random(CITIZEN_SKIN_TONES.length));
  let tunicIdx = floor(random(CITIZEN_TUNIC_HUES.length));
  let hairIdx = floor(random(CITIZEN_HAIR_COLORS.length));

  state.citizens.push({
    x: x, y: y, vx: 0, vy: 0,
    variant: variants[vi],
    facing: random() > 0.5 ? 1 : -1,
    state: 'idle',
    timer: floor(random(60, 300)),
    speed: 0.3 + random(0.4),
    targetX: x, targetY: y,
    skinTone: CITIZEN_SKIN_TONES[skinIdx],
    tunicColor: CITIZEN_TUNIC_HUES[tunicIdx],
    hairColor: CITIZEN_HAIR_COLORS[hairIdx],
    idleAnim: floor(random(3)), // 0=stand, 1=look around, 2=arms crossed
    walkBobPhase: random(TWO_PI),
  });
}
