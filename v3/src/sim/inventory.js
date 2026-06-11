// Inventory — owns item counts, seeds, and the selected seed. Nothing else
// writes these; systems call add/spend.

const Inventory = {
  items: {},                  // itemKey -> count
  seeds: { wheat: 6, poppy: 4, vine: 2 },
  selectedSeed: 'wheat',
  _pulse: {},                 // itemKey -> frames remaining (HUD animation)

  count(k) { return this.items[k] || 0; },

  add(k, n = 1) {
    this.items[k] = (this.items[k] || 0) + n;
    this._pulse[k] = 22;
  },

  spend(k, n = 1) {
    if (this.count(k) < n) return false;
    this.items[k] -= n;
    this._pulse[k] = 22;
    return true;
  },

  addSeed(crop, n = 1) { this.seeds[crop] = (this.seeds[crop] || 0) + n; },

  spendSeed(crop) {
    if ((this.seeds[crop] || 0) <= 0) return false;
    this.seeds[crop]--;
    return true;
  },

  selectSeedByKey(keyChar) {
    for (const [id, c] of Object.entries(CROPS)) {
      if (c.seedKey === keyChar) { this.selectedSeed = id; return true; }
    }
    return false;
  },

  gold() { return this.count('denarii'); },

  pulseT(k) { return this._pulse[k] || 0; },

  update() {
    for (const k of Object.keys(this._pulse)) {
      if (this._pulse[k] > 0) this._pulse[k]--;
    }
  },
};
