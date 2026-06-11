// Interact — the single dispatcher for contextual actions. Resolves what the
// player is standing near, exposes ONE prompt for the HUD, and consumes the
// E/F keypresses (so exactly one system acts per press).

// The Shrine — daily laurel + a line of lore. Small enough to live here.
const Shrine = {
  available: true,
  LORE: [
    'The sea gives twice a day. Take only once.',
    'Wind carries more than ships.',
    'Salt is the patience of water.',
    'What the tide hides, the tide returns.',
    'Even Neptune naps at slack water.',
  ],
  init() { Clock.onNewDay.push(() => { this.available = true; }); },
  collect() {
    if (!this.available) return false;
    this.available = false;
    Inventory.add('laurel', 1);
    const line = this.LORE[(Clock.day() - 1) % this.LORE.length];
    HUD.toast('A laurel sprig — "' + line + '"');
    Fx.sparkle(Island.ISLET.cx, Island.ISLET.cy - 24);
    return true;
  },
};

const Interact = {
  prompt: null,   // { key: 'E'|'F', label: string } | null
  _action: null,  // fn to run if E pressed

  update() {
    const px = Player.x, py = Player.y;
    this.prompt = null;
    this._action = null;

    // ---- E-target resolution, nearest-wins by priority ----
    // 1. ripe/empty plot
    const plot = Farming.nearest(px, py, 44);
    if (plot) {
      if (Farming.isRipe(plot)) {
        this._set('E', 'Harvest ' + CROPS[plot.crop].name + (plot.hybrid >= 1 ? ' ✦' : ''),
          () => {
            const r = Farming.harvest(plot);
            if (r) HUD.toast('+' + r.n + ' ' + r.name + (r.hybridSeed ? ' — and a GOLDBLOOM seed!' : ''));
          });
      } else if (plot.crop) {
        const c = CROPS[plot.crop];
        const pct = Math.round(Farming.progress(plot) * 100);
        const state = Farming.isFlowering(plot) ? 'flowering' : 'growing';
        this.prompt = { key: null, label: c.name + ' — ' + state + ' ' + pct + '%'
          + (plot.hybrid >= 1 ? ' ✦ crossed' : plot.hybrid > 0.15 ? ' · pollen ' + Math.round(plot.hybrid * 100) + '%' : '') };
      } else {
        const s = Inventory.selectedSeed;
        const have = Inventory.seeds[s] || 0;
        this._set('E', 'Sow ' + CROPS[s].name + ' (' + have + ')',
          () => {
            if (!Farming.sow(plot, s)) HUD.toast('No ' + CROPS[s].name + ' seeds');
          });
      }
    }

    // 2. salt pan ready
    if (!this.prompt) {
      const pan = Saltworks.nearestPan(px, py, 52);
      if (pan && pan.state === 'salt') {
        this._set('E', 'Gather Salt', () => {
          if (Saltworks.collectPan(pan)) HUD.toast('+2 Salt');
        });
      } else if (pan && pan.state === 'brine') {
        this.prompt = { key: null, label: 'Brine — the sun is working…' };
      }
    }

    // 3. garum vat
    if (!this.prompt && Saltworks.nearVat(px, py, 46)) {
      const v = Saltworks.vat;
      const label = v.state === 'ready' ? 'Collect Garum'
        : v.state === 'ferment' ? 'Fermenting…'
        : 'Start Garum (2 fish + 1 salt)';
      this._set('E', label, () => {
        const r = Saltworks.vatAction();
        if (r === 'started') HUD.toast('Garum set to ferment — ready tomorrow');
        else if (r === 'collected') HUD.toast('+1 Garum — liquid gold');
        else if (r === 'missing') HUD.toast('Need 2 fish and 1 salt');
      });
    }

    // 4. merchant
    if (!this.prompt && Merchant.canTrade(px, py)) {
      this._set('E', 'Sell goods', () => Merchant.sellAll());
    }

    // 5. shrine
    if (!this.prompt && Island.isOnIslet(px, py) && Shrine.available
        && Math.hypot(px - Island.ISLET.cx, py - Island.ISLET.cy) < 60) {
      this._set('E', 'Pray at the shrine', () => Shrine.collect());
    }

    // 6. tidal forage
    if (!this.prompt) {
      const it = Tide.nearestItem(px, py, 34);
      if (it) {
        this._set('E', 'Gather ' + ITEMS[it.kind].name, () => {
          const got = Tide.collectNear(px, py, 34);
          if (got) { Inventory.add(got.kind, 1); Fx.sparkle(got.x, got.y); }
        });
      }
    }

    // ---- F: fishing prompt (independent of E) ----
    const canF = Fishing.state === 'idle' && Fishing.canFish(px, py);

    // consume presses
    if (Input.consume('e') && this._action) this._action();
    if (Input.consume('f')) {
      if (Fishing.state === 'waiting' || Fishing.state === 'bite') Fishing.reel();
      else if (canF) Fishing.cast(px, py);
    }
    // seed hotkeys
    for (const ch of ['1', '2', '3', '4']) {
      if (Input.consume(ch)) Inventory.selectSeedByKey(ch);
    }

    // fishing overrides the displayed prompt while active
    if (Fishing.state === 'bite') this.prompt = { key: 'F', label: 'NOW — strike!' };
    else if (Fishing.state === 'waiting') this.prompt = { key: null, label: 'Waiting for a bite…' };
    else if (!this.prompt && canF) this.prompt = { key: 'F', label: 'Cast a line' };

    // moving cancels a waiting cast
    if (Player.moving && (Fishing.state === 'waiting' || Fishing.state === 'bite')) {
      Fishing.cancel();
    }
  },

  _set(key, label, fn) {
    this.prompt = { key, label };
    this._action = fn;
  },
};
