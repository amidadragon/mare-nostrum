// Clock — the master timepiece. Owns game time; everything else READS it.
// t is measured in DAYS (float). One real-time day = DAY_SECONDS.

const Clock = {
  DAY_SECONDS: 150,          // one in-game day in real seconds
  SEASON_DAYS: 6,
  SEASONS: ['VER', 'AESTAS', 'AVTVMNVS', 'HIEMS'],
  SEASON_COLORS: [
    [140, 195, 110],         // Ver — spring green
    [230, 180, 80],          // Aestas — summer gold
    [200, 120, 70],          // Autumnus — harvest rust
    [150, 180, 210],         // Hiems — winter slate
  ],

  t: 0.25,                   // start at 06:00, day 1
  _lastDay: 1,
  onNewDay: [],              // subscribers: fn(dayNumber)

  update() {
    const dt = Math.min(deltaTime, 100) / 1000; // seconds, capped vs tab-sleep
    this.t += dt / this.DAY_SECONDS;
    const d = this.day();
    if (d !== this._lastDay) {
      this._lastDay = d;
      for (const fn of this.onNewDay) fn(d);
    }
  },

  day() { return Math.floor(this.t) + 1; },
  dayFrac() { return this.t - Math.floor(this.t); },
  hour() { return this.dayFrac() * 24; },

  seasonIndex() {
    return Math.floor((this.day() - 1) / this.SEASON_DAYS) % 4;
  },
  seasonName() { return this.SEASONS[this.seasonIndex()]; },
  seasonColor() { return this.SEASON_COLORS[this.seasonIndex()]; },
  dayOfSeason() { return ((this.day() - 1) % this.SEASON_DAYS) + 1; },

  // 0 at night -> 1 at midday, smooth.
  sunlight() {
    const h = this.hour();
    if (h < 5 || h > 21) return 0;
    return Math.pow(Math.sin(((h - 5) / 16) * Math.PI), 1.5);
  },

  isDawn() { const h = this.hour(); return h >= 5 && h < 8; },
  isDusk() { const h = this.hour(); return h >= 17 && h < 20; },
  isNight() { const h = this.hour(); return h < 5 || h >= 21; },

  // 'III · VER' style banner text
  romanDay() {
    const R = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
               'XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
    const d = this.day();
    return R[d - 1] || String(d);
  },

  hhmm() {
    const h = this.hour();
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  },
};
