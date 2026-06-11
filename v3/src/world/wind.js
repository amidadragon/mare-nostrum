// Wind — the historically real Mediterranean diurnal breeze.
// Offshore (land -> sea, blowing east) at night/morning; onshore (sea -> land,
// blowing west) in the afternoon. Drives pollination, FX, and the merchant.
// Pure reader of Clock. Offshore = angle 0 (+x, out to the eastern sea).

const Wind = {
  // angle in radians: 0 = blowing east (offshore), PI = blowing west (onshore)
  angle() {
    const h = Clock.hour();
    const a = ((h + 20) % 24) / 24;           // 0 at 04:00
    const swing = 0.5 - 0.5 * Math.cos(a * TWO_PI); // 0 @04:00 -> 1 @16:00 -> 0
    const wobble = (noise(Clock.t * 6) - 0.5) * 0.6;
    return Math.PI * swing + wobble;
  },

  // 0..1; calm nights, lively mid-afternoon
  strength() {
    const h = Clock.hour();
    let s = 0.18;
    if (h > 7 && h < 23) s += 0.62 * Math.max(0, Math.sin(((h - 7) / 16) * Math.PI));
    s += (noise(Clock.t * 9 + 50) - 0.5) * 0.18;
    return constrain(s, 0.05, 1);
  },

  vec() {
    const a = this.angle(), s = this.strength();
    return { x: Math.cos(a) * s, y: Math.sin(a) * 0.25 * s, a, s };
  },

  isOnshore() {
    const a = this.angle();
    return a > Math.PI * 0.5 && a < Math.PI * 1.5;
  },

  label() {
    return this.isOnshore() ? 'ONSHORE' : 'OFFSHORE';
  },
};
