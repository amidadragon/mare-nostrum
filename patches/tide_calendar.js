// ═══════════════════════════════════════════════════════════════════════
// TIDE CALENDAR — natural-cycle mechanics layer for Mare Nostrum (legacy)
// Adds a tide and a historically-real diurnal wind on top of the existing
// day/night + weather, with gameplay hooks. ZERO core file edits.
//
//   · TideMN  — sea level breathes twice a day; "slack water" at the turns
//   · WindMN  — offshore at night/morning, onshore in the afternoon;
//               storms and rain strengthen it, heatwaves becalm it
//   · Hook    — fishing bites come ~2x faster at slack water (stacks with
//               golden hour / rain bonuses the game already has)
//   · FX      — subtle wind streaks over the scene, strength-scaled
//
// The Horologium (patches/horologium_ui.js) renders these on its dial.
// ═══════════════════════════════════════════════════════════════════════

const TideMN = {
  CYCLES_PER_DAY: 2,
  PHI: 1.0,

  _t() { // continuous day-time in days
    const day = (state && state.day) || 0;
    const mins = (state && state.time) || 0;
    return day + mins / 1440;
  },

  level() { // -1 low .. +1 high
    return Math.sin(Math.PI * 2 * this.CYCLES_PER_DAY * this._t() + this.PHI);
  },

  isRising() {
    return Math.cos(Math.PI * 2 * this.CYCLES_PER_DAY * this._t() + this.PHI) > 0;
  },

  isSlack() { // the turn of the tide — prime fishing
    return Math.abs(Math.cos(Math.PI * 2 * this.CYCLES_PER_DAY * this._t() + this.PHI)) < 0.22;
  },
};

const WindMN = {
  angle() { // 0 = offshore (east/out to sea), PI = onshore (west/landward)
    const h = ((state && state.time) || 0) / 60;
    const a = ((h + 20) % 24) / 24; // 0 at 04:00
    const swing = 0.5 - 0.5 * Math.cos(a * Math.PI * 2);
    const wob = (typeof noise === 'function' ? noise(this._wt() * 6) - 0.5 : 0) * 0.6;
    return Math.PI * swing + wob;
  },

  strength() { // 0..1, weather-aware
    const h = ((state && state.time) || 0) / 60;
    let s = 0.18;
    if (h > 7 && h < 23) s += 0.55 * Math.max(0, Math.sin(((h - 7) / 16) * Math.PI));
    const w = (state && state.weather && state.weather.type) || 'clear';
    if (w === 'storm') s = Math.min(1, s + 0.45);
    else if (w === 'rain') s = Math.min(1, s + 0.2);
    else if (w === 'heatwave') s *= 0.35;
    if (typeof noise === 'function') s += (noise(this._wt() * 9 + 50) - 0.5) * 0.15;
    return Math.max(0.05, Math.min(1, s));
  },

  _wt() {
    const day = (state && state.day) || 0;
    return day + ((state && state.time) || 0) / 1440;
  },

  isOnshore() {
    const a = this.angle();
    return a > Math.PI * 0.5 && a < Math.PI * 1.5;
  },

  label() { return this.isOnshore() ? 'ONSHORE' : 'OFFSHORE'; },
};

// ─── GAMEPLAY HOOK: slack-water fishing ─────────────────────────────────
// Wrap updateFishing: when a cast transitions into the 'wait' phase, scale
// the wait down at slack tide. Pure wrapper — original logic untouched.
(function hookFishing() {
  const iv = setInterval(function () {
    if (typeof window.updateFishing !== 'function' || typeof state === 'undefined') return;
    clearInterval(iv);
    const orig = window.updateFishing;
    window.updateFishing = function (dt) {
      const f = state.fishing;
      const wasCast = f && f.active && f.phase === 'cast';
      orig.apply(this, arguments);
      if (wasCast && f.phase === 'wait' && TideMN.isSlack()) {
        f.phaseTimer = Math.max(30, Math.floor(f.phaseTimer * 0.5));
        f.waitDuration = f.phaseTimer;
        if (typeof addFloatingText === 'function' && state.player) {
          addFloatingText(state.player.x, state.player.y - 30, 'Slack water — they’re biting', [120, 200, 230]);
        }
      }
    };
    console.log('[Tide Calendar] ✓ slack-water fishing hook active');
  }, 500);
})();

// ─── FX: wind streaks (screen-space, very subtle) ───────────────────────
const WindFxMN = {
  ps: [],
  update() {
    const s = WindMN.strength();
    if (this.ps.length < 26 && Math.random() < s * 0.4) {
      this.ps.push({
        x: Math.random() * width, y: Math.random() * height,
        t: 0, life: 40 + Math.random() * 30,
      });
    }
    const a = WindMN.angle();
    for (const p of this.ps) {
      p.t++;
      p.x += Math.cos(a) * (4 + s * 6);
      p.y += Math.sin(a) * 0.3 * (4 + s * 6);
    }
    this.ps = this.ps.filter((p) => p.t < p.life);
  },
  draw() {
    if (photoMode || screenshotMode) return;
    const s = WindMN.strength();
    if (s < 0.3) return; // calm air shows nothing
    const a = WindMN.angle();
    push();
    noFill();
    for (const p of this.ps) {
      const k = 1 - p.t / p.life;
      stroke(255, 255, 255, 26 * k * s);
      strokeWeight(1.2);
      const L = 18 + s * 26;
      bezier(p.x, p.y,
             p.x + Math.cos(a) * L * 0.4, p.y + Math.sin(a) * L * 0.4 - 2,
             p.x + Math.cos(a) * L * 0.7, p.y + Math.sin(a) * L * 0.7 + 2,
             p.x + Math.cos(a) * L, p.y + Math.sin(a) * L);
    }
    pop();
  },
};

// ─── WIRE INTO DRAW LOOP (same pattern as sandbox_compass) ──────────────
(function wireTideCalendar() {
  const iv = setInterval(function () {
    if (typeof window.draw === 'function' && typeof state !== 'undefined') {
      clearInterval(iv);
      const orig = window.draw;
      window.draw = function () {
        orig.apply(this, arguments);
        try {
          if (gameScreen === 'game') { WindFxMN.update(); WindFxMN.draw(); }
        } catch (e) { /* fail silently */ }
      };
      console.log('[Tide Calendar] ✓ tide + wind cycles active');
    }
  }, 500);
})();
