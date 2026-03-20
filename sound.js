// ═══════════════════════════════════════════════════════════════
// SOUND MANAGER — Procedural audio for Mare Nostrum
// Extracted from sketch.js for maintainability
// ═══════════════════════════════════════════════════════════════

let snd = null; // global SoundManager instance

class SoundManager {
  constructor() {
    this.ready = false;
    this.vol = { master: 0.5, sfx: 0.7, ambient: 0.5, music: 0.4 };
    this._loadVolume();
    // Ambient layers
    this._waveNoise = null;
    this._waveFilter = null;
    this._waveGain = null;
    this._windNoise = null;
    this._windFilter = null;
    this._windGain = null;
    // Bird chirp oscillator (reused)
    this._birdOsc = null;
    this._birdGain = null;
    this._birdTimer = 0;
    // Cricket oscillators (3 virtual crickets for organic sound)
    this._crickets = []; // [{osc, gain, timer}]
    // Dawn/dusk transition tracking
    this._lastTimeSlot = null; // 'day', 'night', 'dawn', 'dusk'
    // SFX oscillator pool (4 reusable)
    this._sfxPool = [];
    this._sfxIdx = 0;
    // Throttle: prevent same SFX from spamming
    this._lastPlay = {};
    this._minInterval = 80; // ms between same SFX
    // Lyre music system
    this._lyreVoices = [];   // 3 oscillator voices
    this._lyreGains = [];
    this._lyreActive = false;
    this._lyreNoteIdx = 0;
    this._lyreTimer = 0;
    this._lyrePhrase = 0;
    this._lyreMode = 'peaceful'; // 'peaceful', 'tense', 'eerie'
    // Island-specific ambient state
    this._islandAmbient = 'home';
    // Vulcan rumble
    this._rumbleNoise = null;
    this._rumbleFilter = null;
    this._rumbleGain = null;
    // Hyperborea wind howl
    this._howlNoise = null;
    this._howlFilter = null;
    this._howlGain = null;
    // Plenty: second tropical bird
    this._bird2Osc = null;
    this._bird2Gain = null;
    this._bird2Timer = 0;
    // Necropolis: eerie pulse
    this._eerieOsc = null;
    this._eerieGain = null;
    // Diving underwater state
    this._divingActive = false;
    // Underwater ambient layers
    this._uwRumbleOsc = null;
    this._uwRumbleGain = null;
    this._whaleOsc = null;
    this._whaleGain = null;
    this._whaleTimer = 0;
    // Storm ambient
    this._thunderTimer = 0;
    // Bass drone oscillator (foundation for harmony)
    this._droneOsc = null;
    this._droneGain = null;
    this._droneTarget = 0;
    // Rhythmic pulse oscillator (subtle heartbeat underneath music)
    this._pulseOsc = null;
    this._pulseGain = null;
    this._pulseTimer = 0;
    // Mode crossfade
    this._lyreVolMult = 1.0;
    this._lyreFadeDir = 0; // -1 fading out, 1 fading in, 0 steady
    this._lyrePendingMode = null;
    // Dynamic context
    this._lyreContext = 'default'; // farming, combat, night, rain, ocean, dawn
    // Harmony layer: 4th oscillator doubles melody note at interval
    this._harmOsc = null;
    this._harmGain = null;
    // Rain ambient (filtered white noise)
    this._rainNoise = null;
    this._rainFilter = null;
    this._rainGain = null;
    // Context tempo multiplier
    this._tempoMult = 1.0;
    // Campfire crackle (filtered noise bursts)
    this._fireNoise = null;
    this._fireFilter = null;
    this._fireGain = null;
    this._fireTimer = 0;
    // Extra wave oscillators for organic ocean
    this._wave2Noise = null;
    this._wave2Filter = null;
    this._wave2Gain = null;
    this._wave3Noise = null;
    this._wave3Filter = null;
    this._wave3Gain = null;
  }

  init() {
    try {
      // Ambient: sea waves (white noise → bandpass)
      this._waveNoise = new p5.Noise('white');
      this._waveFilter = new p5.BandPass();
      this._waveFilter.freq(300);
      this._waveFilter.res(1.5);
      this._waveNoise.disconnect();
      this._waveNoise.connect(this._waveFilter);
      this._waveGain = new p5.Gain();
      this._waveFilter.connect(this._waveGain);
      this._waveGain.connect();
      this._waveGain.amp(0);
      this._waveNoise.start();
      this._waveNoise.amp(0.15);

      // Ambient: wind (pink noise → bandpass)
      this._windNoise = new p5.Noise('pink');
      this._windFilter = new p5.BandPass();
      this._windFilter.freq(500);
      this._windFilter.res(0.8);
      this._windNoise.disconnect();
      this._windNoise.connect(this._windFilter);
      this._windGain = new p5.Gain();
      this._windFilter.connect(this._windGain);
      this._windGain.connect();
      this._windGain.amp(0);
      this._windNoise.start();
      this._windNoise.amp(0.08);

      // Bird chirp (sine, reused)
      this._birdOsc = new p5.Oscillator('sine');
      this._birdGain = new p5.Gain();
      this._birdOsc.disconnect();
      this._birdOsc.connect(this._birdGain);
      this._birdGain.connect();
      this._birdGain.amp(0);
      this._birdOsc.start();
      this._birdOsc.amp(0);

      // Crickets (3 virtual crickets with independent timing)
      for (let ci = 0; ci < 3; ci++) {
        let osc = new p5.Oscillator('sine');
        let gain = new p5.Gain();
        osc.disconnect();
        osc.connect(gain);
        gain.connect();
        gain.amp(0);
        osc.start();
        osc.freq(4000 + ci * 200); // slightly different base pitch each
        osc.amp(0);
        this._crickets.push({ osc, gain, timer: floor(random(30, 120)), baseFreq: 4000 + ci * 200 });
      }

      // Lyre: 3 sine voices for polyphonic plucked strings
      for (let i = 0; i < 3; i++) {
        let osc = new p5.Oscillator('sine');
        let gain = new p5.Gain();
        osc.disconnect();
        osc.connect(gain);
        gain.connect();
        gain.amp(0);
        osc.start();
        osc.amp(1.0);
        this._lyreVoices.push(osc);
        this._lyreGains.push(gain);
      }

      // Bass drone: triangle oscillator for warm harmonic foundation
      this._droneOsc = new p5.Oscillator('triangle');
      this._droneGain = new p5.Gain();
      this._droneOsc.disconnect();
      this._droneOsc.connect(this._droneGain);
      this._droneGain.connect();
      this._droneGain.amp(0);
      this._droneOsc.start();
      this._droneOsc.freq(146.8); // D3 — one octave below lyre root
      this._droneOsc.amp(1.0);

      // Rhythmic pulse: sine sub-tone for gentle heartbeat feel
      this._pulseOsc = new p5.Oscillator('sine');
      this._pulseGain = new p5.Gain();
      this._pulseOsc.disconnect();
      this._pulseOsc.connect(this._pulseGain);
      this._pulseGain.connect();
      this._pulseGain.amp(0);
      this._pulseOsc.start();
      this._pulseOsc.freq(146.8);
      this._pulseOsc.amp(1.0);

      // SFX pool: 6 oscillators (osc at full amp, volume via gain node only)
      for (let i = 0; i < 6; i++) {
        let osc = new p5.Oscillator('sine');
        let gain = new p5.Gain();
        osc.disconnect();
        osc.connect(gain);
        gain.connect();
        gain.amp(0);   // gain starts silent
        osc.start();
        osc.amp(1.0);  // osc at full — gain controls volume
        this._sfxPool.push({ osc, gain, busy: false, _vol: 0 });
      }

      // Vulcan: sub-bass rumble (white noise → lowpass ~60Hz)
      this._rumbleNoise = new p5.Noise('white');
      this._rumbleFilter = new p5.LowPass();
      this._rumbleFilter.freq(60);
      this._rumbleFilter.res(8);
      this._rumbleNoise.disconnect();
      this._rumbleNoise.connect(this._rumbleFilter);
      this._rumbleGain = new p5.Gain();
      this._rumbleFilter.connect(this._rumbleGain);
      this._rumbleGain.connect();
      this._rumbleGain.amp(0);
      this._rumbleNoise.start();
      this._rumbleNoise.amp(0.2);

      // Hyperborea: wind howl (pink noise → bandpass ~1200Hz, high resonance)
      this._howlNoise = new p5.Noise('pink');
      this._howlFilter = new p5.BandPass();
      this._howlFilter.freq(1200);
      this._howlFilter.res(12);
      this._howlNoise.disconnect();
      this._howlNoise.connect(this._howlFilter);
      this._howlGain = new p5.Gain();
      this._howlFilter.connect(this._howlGain);
      this._howlGain.connect();
      this._howlGain.amp(0);
      this._howlNoise.start();
      this._howlNoise.amp(0.12);

      // Plenty: second tropical bird voice (different freq range)
      this._bird2Osc = new p5.Oscillator('sine');
      this._bird2Gain = new p5.Gain();
      this._bird2Osc.disconnect();
      this._bird2Osc.connect(this._bird2Gain);
      this._bird2Gain.connect();
      this._bird2Gain.amp(0);
      this._bird2Osc.start();
      this._bird2Osc.amp(0);

      // Necropolis: eerie low pulse (sine at 60Hz, slow amplitude modulation)
      this._eerieOsc = new p5.Oscillator('sine');
      this._eerieGain = new p5.Gain();
      this._eerieOsc.disconnect();
      this._eerieOsc.connect(this._eerieGain);
      this._eerieGain.connect();
      this._eerieGain.amp(0);
      this._eerieOsc.start();
      this._eerieOsc.freq(60);
      this._eerieOsc.amp(1.0);

      // Underwater: low rumble oscillator (triangle for warmth)
      this._uwRumbleOsc = new p5.Oscillator('triangle');
      this._uwRumbleGain = new p5.Gain();
      this._uwRumbleOsc.disconnect();
      this._uwRumbleOsc.connect(this._uwRumbleGain);
      this._uwRumbleGain.connect();
      this._uwRumbleGain.amp(0);
      this._uwRumbleOsc.start();
      this._uwRumbleOsc.freq(55);
      this._uwRumbleOsc.amp(1.0);

      // Underwater: whale-like sweep (sine, slow pitch glide)
      this._whaleOsc = new p5.Oscillator('sine');
      this._whaleGain = new p5.Gain();
      this._whaleOsc.disconnect();
      this._whaleOsc.connect(this._whaleGain);
      this._whaleGain.connect();
      this._whaleGain.amp(0);
      this._whaleOsc.start();
      this._whaleOsc.amp(1.0);

      // Harmony layer: sine oscillator that doubles melody at an interval
      this._harmOsc = new p5.Oscillator('sine');
      this._harmGain = new p5.Gain();
      this._harmOsc.disconnect();
      this._harmOsc.connect(this._harmGain);
      this._harmGain.connect();
      this._harmGain.amp(0);
      this._harmOsc.start();
      this._harmOsc.amp(1.0);

      // Rain ambient: filtered white noise for rainfall
      this._rainNoise = new p5.Noise('white');
      this._rainFilter = new p5.BandPass();
      this._rainFilter.freq(2000);
      this._rainFilter.res(2);
      this._rainNoise.disconnect();
      this._rainNoise.connect(this._rainFilter);
      this._rainGain = new p5.Gain();
      this._rainFilter.connect(this._rainGain);
      this._rainGain.connect();
      this._rainGain.amp(0);
      this._rainNoise.start();
      this._rainNoise.amp(0.12);

      // Campfire: filtered noise bursts for crackle
      this._fireNoise = new p5.Noise('white');
      this._fireFilter = new p5.BandPass();
      this._fireFilter.freq(1800);
      this._fireFilter.res(3);
      this._fireNoise.disconnect();
      this._fireNoise.connect(this._fireFilter);
      this._fireGain = new p5.Gain();
      this._fireFilter.connect(this._fireGain);
      this._fireGain.connect();
      this._fireGain.amp(0);
      this._fireNoise.start();
      this._fireNoise.amp(0.15);

      // Extra wave oscillators for organic ocean (detuned layers)
      this._wave2Noise = new p5.Noise('white');
      this._wave2Filter = new p5.BandPass();
      this._wave2Filter.freq(340);
      this._wave2Filter.res(1.2);
      this._wave2Noise.disconnect();
      this._wave2Noise.connect(this._wave2Filter);
      this._wave2Gain = new p5.Gain();
      this._wave2Filter.connect(this._wave2Gain);
      this._wave2Gain.connect();
      this._wave2Gain.amp(0);
      this._wave2Noise.start();
      this._wave2Noise.amp(0.12);

      this._wave3Noise = new p5.Noise('pink');
      this._wave3Filter = new p5.BandPass();
      this._wave3Filter.freq(260);
      this._wave3Filter.res(1.8);
      this._wave3Noise.disconnect();
      this._wave3Noise.connect(this._wave3Filter);
      this._wave3Gain = new p5.Gain();
      this._wave3Filter.connect(this._wave3Gain);
      this._wave3Gain.connect();
      this._wave3Gain.amp(0);
      this._wave3Noise.start();
      this._wave3Noise.amp(0.10);

      this.ready = true;
      console.log('[SoundManager] init OK — 3 lyre voices + harmony, 6 sfx slots, campfire + layered ocean ready');
    } catch (e) {
      console.warn('SoundManager init failed:', e.message);
    }
  }

  // ─── AMBIENT UPDATE (call every frame) ───
  updateAmbient() {
    if (!this.ready) return;
    let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;
    let masterVol = this.vol.master * this.vol.ambient;

    // Detect current island
    let island = 'home';
    if (typeof state !== 'undefined') {
      if (state.vulcan && state.vulcan.active) island = 'vulcan';
      else if (state.hyperborea && state.hyperborea.active) island = 'hyperborea';
      else if (state.plenty && state.plenty.active) island = 'plenty';
      else if (state.necropolis && state.necropolis.active) island = 'necropolis';
    }
    this._islandAmbient = island;

    // Diving underwater state
    let diving = typeof state !== 'undefined' && state.diving && state.diving.active;
    this._divingActive = diving;

    // Imperial Bridge detection — exposed causeway between islands
    let onBridge = typeof state !== 'undefined' && typeof isOnImperialBridge === 'function'
      && state.imperialBridge && state.imperialBridge.built
      && isOnImperialBridge(state.player.x, state.player.y);

    // ─── Waves (3 detuned layers for organic sound) ───
    let waveMute = (island === 'hyperborea' || island === 'necropolis');
    let waveVol = waveMute ? 0 : (0.06 + (1 - bright) * 0.04) * masterVol;
    if (diving) waveVol = 0.12 * masterVol;
    if (onBridge) waveVol = 0.10 * masterVol;
    this._waveGain.amp(waveVol, 0.3);
    let waveFreq = 300 + sin(frameCount * 0.003) * 80;
    if (diving) waveFreq = 180 + sin(frameCount * 0.002) * 40;
    if (onBridge) waveFreq = 220 + sin(frameCount * 0.004) * 60;
    this._waveFilter.freq(waveFreq);
    // Layer 2: slightly higher freq, different LFO rate
    if (this._wave2Gain) {
      this._wave2Gain.amp(waveVol * 0.7, 0.4);
      this._wave2Filter.freq(waveFreq * 1.15 + sin(frameCount * 0.0047) * 60);
    }
    // Layer 3: lower freq, slowest LFO for deep swells
    if (this._wave3Gain) {
      this._wave3Gain.amp(waveVol * 0.5, 0.5);
      this._wave3Filter.freq(waveFreq * 0.78 + sin(frameCount * 0.0019) * 45);
    }

    // ─── Wind ───
    let windVol = (0.03 + sin(frameCount * 0.001) * 0.015) * masterVol;
    let windFreq = 500 + sin(frameCount * 0.002) * 150;
    if (island === 'vulcan') windFreq = 800 + sin(frameCount * 0.002) * 100;
    if (diving) { windVol *= 0.2; windFreq = 120; }
    if (onBridge) { windVol = 0.07 * masterVol; windFreq = 280 + sin(frameCount * 0.0015) * 80; } // exposed wind, lower pitch
    this._windGain.amp(max(0, windVol), 0.5);
    this._windFilter.freq(windFreq);

    // Storm boost — slightly louder wind, rare thunder
    if (typeof stormActive !== 'undefined' && stormActive && !diving) {
      this._windGain.amp(windVol * 1.3, 0.5);
      this._windFilter.freq(350);
      // Thunder — every 20-40 seconds, with initial delay
      if (this._thunderTimer <= 0) {
        this._thunderTimer = floor(random(1200, 2400)); // initial delay
      }
      this._thunderTimer--;
      if (this._thunderTimer === 1) {
        this.playSFX('thunder');
        this._thunderTimer = floor(random(1200, 2400)); // reset for next
      }
    } else {
      this._thunderTimer = 0; // reset when storm ends
    }

    // ─── Rain ambient (filtered noise) ───
    if (this._rainGain) {
      let isRaining = (typeof stormActive !== 'undefined' && stormActive) ||
        (typeof state !== 'undefined' && state.weather && state.weather.type === 'rain');
      let rainVol = isRaining ? 0.05 * masterVol : 0;
      if (typeof state !== 'undefined' && state.weather && state.weather.intensity) {
        rainVol *= (0.6 + state.weather.intensity * 0.4);
      }
      if (typeof stormActive !== 'undefined' && stormActive) rainVol = 0.07 * masterVol;
      if (diving) rainVol *= 0.2;
      this._rainGain.amp(max(0, rainVol), 0.5);
      // Modulate filter frequency for variation
      if (isRaining && this._rainFilter) {
        this._rainFilter.freq(1800 + sin(frameCount * 0.006) * 400);
      }
    }

    // ─── Bird chirps ───
    let birdMute = (island === 'necropolis' || diving || onBridge);
    let birdChance = 0.008;
    if (island === 'vulcan') birdChance = 0.003;
    if (island === 'plenty') birdChance = 0.018;
    this._birdTimer--;
    if (!birdMute && bright > 0.3 && this._birdTimer <= 0 && random() < birdChance) {
      this._birdTimer = island === 'plenty' ? floor(random(30, 90)) : floor(random(60, 180));
      let birdFreq = random(2200, 3800);
      let birdVol = random(0.02, 0.06) * masterVol;
      this._birdOsc.freq(birdFreq);
      this._birdGain.amp(birdVol, 0.01);
      setTimeout(() => {
        if (this._birdGain) this._birdGain.amp(0, 0.05);
      }, 40 + random(30));
      if (random() < 0.5) {
        setTimeout(() => {
          if (this._birdOsc && this._birdGain) {
            this._birdOsc.freq(birdFreq * (random() < 0.5 ? 1.2 : 0.85));
            this._birdGain.amp(birdVol * 0.7, 0.01);
            setTimeout(() => { if (this._birdGain) this._birdGain.amp(0, 0.04); }, 35);
          }
        }, 80);
      }
    }

    // ─── Plenty: second tropical bird (lower warble ~1200-1800Hz) ───
    if (this._bird2Osc) {
      this._bird2Timer--;
      if (island === 'plenty' && !diving && bright > 0.3 && this._bird2Timer <= 0 && random() < 0.012) {
        this._bird2Timer = floor(random(50, 120));
        let f = random(1200, 1800);
        let v = random(0.02, 0.05) * masterVol;
        this._bird2Osc.freq(f);
        this._bird2Gain.amp(v, 0.01);
        let trillCount = floor(random(3, 6));
        for (let i = 0; i < trillCount; i++) {
          ((idx) => {
            setTimeout(() => {
              if (this._bird2Osc && this._bird2Gain) {
                this._bird2Osc.freq(f * (1 + (idx % 2 === 0 ? 0.15 : -0.1)));
                this._bird2Gain.amp(v * (1 - idx / (trillCount + 1)), 0.01);
              }
            }, 50 * idx);
          })(i);
        }
        setTimeout(() => { if (this._bird2Gain) this._bird2Gain.amp(0, 0.04); }, 50 * trillCount + 30);
      } else if (island !== 'plenty') {
        this._bird2Gain.amp(0, 0.1);
      }
    }

    // ─── Crickets (3 virtual crickets, organic timing) ───
    let cricketVol = bright < 0.3 ? (0.3 - bright) * 0.08 * masterVol : 0;
    if (diving) cricketVol = 0;
    for (let ci = 0; ci < this._crickets.length; ci++) {
      let c = this._crickets[ci];
      c.timer--;
      if (c.timer <= 0 && cricketVol > 0) {
        // Chirp: quick on-off burst with slight pitch variation
        let pitchVar = c.baseFreq + random(-150, 150);
        c.osc.freq(pitchVar);
        c.gain.amp(cricketVol * random(0.6, 1.0), 0.005);
        // Chirp duration 30-60ms, then silence
        let chirpMs = random(30, 60);
        setTimeout(() => { if (c.gain) c.gain.amp(0, 0.01); }, chirpMs);
        // Next chirp: random interval 0.5-2s (30-120 frames at 60fps)
        c.timer = floor(random(30, 120));
      } else if (cricketVol <= 0) {
        c.gain.amp(0, 0.05);
        c.timer = floor(random(30, 60)); // reset for when they come back
      }
    }

    // ─── Vulcan: sub-bass rumble ───
    if (this._rumbleGain) {
      let rumbleVol = island === 'vulcan' ? 0.08 * masterVol : 0;
      if (island === 'vulcan') rumbleVol *= (0.7 + sin(frameCount * 0.005) * 0.3);
      this._rumbleGain.amp(max(0, rumbleVol), 0.5);
      if (island === 'vulcan') this._rumbleFilter.freq(60 + sin(frameCount * 0.003) * 15);
    }

    // ─── Hyperborea: wind howl ───
    if (this._howlGain) {
      let howlVol = island === 'hyperborea' ? 0.10 * masterVol : 0;
      if (island === 'hyperborea') {
        howlVol *= (0.5 + sin(frameCount * 0.007) * 0.3 + sin(frameCount * 0.013) * 0.2);
        this._howlFilter.freq(1200 + sin(frameCount * 0.004) * 300);
      }
      this._howlGain.amp(max(0, howlVol), 0.5);
    }

    // ─── Necropolis: eerie low pulse ───
    if (this._eerieGain) {
      let eerieVol = island === 'necropolis' ? 0.07 * masterVol : 0;
      if (island === 'necropolis') eerieVol *= (0.4 + sin(frameCount * 0.02) * 0.6);
      this._eerieGain.amp(max(0, eerieVol), 0.3);
    }

    // ─── Underwater: rumble + whale calls ───
    if (this._uwRumbleGain) {
      let uwVol = diving ? 0.09 * masterVol : 0;
      this._uwRumbleGain.amp(uwVol, 0.5);
      if (diving) this._uwRumbleOsc.freq(55 + sin(frameCount * 0.004) * 10);
    }
    if (this._whaleGain) {
      this._whaleTimer--;
      if (diving && this._whaleTimer <= 0 && random() < 0.004) {
        this._whaleTimer = floor(random(300, 600));
        let startF = random(120, 200);
        let endF = random(80, 140);
        let whaleVol = random(0.04, 0.08) * masterVol;
        let dur = floor(random(80, 150));
        let step = 0;
        this._whaleOsc.freq(startF);
        this._whaleGain.amp(whaleVol, 0.3);
        let whaleTick = () => {
          step++;
          let t = step / dur;
          if (t >= 1) { this._whaleGain.amp(0, 0.5); return; }
          try {
            this._whaleOsc.freq(lerp(startF, endF, t) + sin(step * 0.15) * 8);
            let env = sin(t * PI) * whaleVol;
            this._whaleGain.amp(max(0, env), 0.03);
          } catch(e) {}
          setTimeout(whaleTick, 30);
        };
        setTimeout(whaleTick, 30);
      } else if (!diving) {
        this._whaleGain.amp(0, 0.3);
      }
    }

    // ─── Home island: chicken clucks & cat meows ───
    if (island === 'home' && !diving && typeof state !== 'undefined') {
      if (state.chickens && state.chickens.length > 0 && frameCount % 400 < 1 && random() < 0.5) {
        this.playSFX('chicken_cluck');
      }
      if (state.cats && state.cats.length > 0 && frameCount % 600 < 1 && random() < 0.4) {
        this.playSFX('cat_meow');
      }
    }

    // ─── Campfire crackle (warm noise bursts near campfire/hearth) ───
    if (this._fireGain && typeof state !== 'undefined' && !diving) {
      let nearFire = false;
      let px = state.player ? state.player.x : 0;
      let py = state.player ? state.player.y : 0;
      if (state.buildings) {
        for (let i = 0; i < state.buildings.length; i++) {
          let b = state.buildings[i];
          if ((b.type === 'campfire' || b.type === 'hearth' || b.type === 'firepit') && dist(px, py, b.x, b.y) < 120) {
            nearFire = true; break;
          }
        }
      }
      if (nearFire) {
        this._fireTimer--;
        if (this._fireTimer <= 0) {
          // Random crackle burst: short pop of filtered noise
          let intensity = random(0.04, 0.10) * masterVol;
          let popDur = random(20, 60); // ms
          this._fireFilter.freq(random(1200, 3000));
          this._fireFilter.res(random(2, 5));
          this._fireGain.amp(intensity, 0.005);
          setTimeout(() => {
            if (this._fireGain) this._fireGain.amp(intensity * 0.3, popDur / 2000);
          }, popDur * 0.4);
          setTimeout(() => {
            if (this._fireGain) this._fireGain.amp(0, 0.03);
          }, popDur);
          // Random interval between crackles: 3-12 frames (cozy, not sparse)
          this._fireTimer = floor(random(3, 12));
        }
      } else {
        this._fireGain.amp(0, 0.2);
        this._fireTimer = 0;
      }
    }

    // ─── Dawn/Dusk transition sounds (one-shot per transition) ───
    if (typeof state !== 'undefined') {
      let h = state.time / 60;
      let slot;
      if (h >= 5 && h < 7) slot = 'dawn';
      else if (h >= 17 && h < 19) slot = 'dusk';
      else if (h >= 7 && h < 17) slot = 'day';
      else slot = 'night';
      if (this._lastTimeSlot !== null && this._lastTimeSlot !== slot) {
        if (slot === 'dawn') this.playSFX('dawn_transition');
        else if (slot === 'dusk') this.playSFX('dusk_transition');
      }
      this._lastTimeSlot = slot;
    }
  }

  // --- LYRE MODE API (with crossfade) ---
  setLyreMode(mode) {
    if (mode === this._lyreMode && !this._lyrePendingMode) return;
    if (this._lyrePendingMode === mode) return;
    // Start fade-out, then switch
    this._lyrePendingMode = mode;
    this._lyreFadeDir = -1;
  }

  // --- ROMAN LYRE --- Procedural background music ---
  updateLyre() {
    if (!this.ready || this._lyreVoices.length < 3) return;
    let musicVol = this.vol.master * this.vol.music;
    if (musicVol < 0.01) return;

    // Auto-detect lyre mode from game state
    if (typeof gameScreen !== 'undefined' && (gameScreen === 'menu' || gameScreen === 'settings' || gameScreen === 'credits')) {
      if (this._lyreMode !== 'menu' && !this._lyrePendingMode) this.setLyreMode('menu');
    } else if (typeof state !== 'undefined') {
      let target = 'peaceful';
      if (state.necropolis && state.necropolis.active) target = 'eerie';
      else if (state.conquest && state.conquest.active) target = 'tense';
      else if (state.festival) target = 'celebration';
      else if (state.rowing && state.rowing.active) target = 'sailing';
      else if (state.time >= 1200 || state.time < 300) target = 'night';
      if (this._lyreMode !== target && !this._lyrePendingMode) this.setLyreMode(target);
    }

    // Detect gameplay context for dynamic ornaments
    if (typeof state !== 'undefined') {
      let ctx = 'default';
      if (state.conquest && state.conquest.active) ctx = 'combat';
      else if (typeof stormActive !== 'undefined' && stormActive) ctx = 'rain';
      else if (state.weather && state.weather.type === 'rain') ctx = 'rain';
      else if (state.rowing && state.rowing.active) ctx = 'ocean';
      else if (state.time >= 1200 || state.time < 300) ctx = 'night';
      else if (state.time >= 300 && state.time < 480) ctx = 'dawn';
      else if (state.farming && state.farming.growing > 0) ctx = 'farming';
      this._lyreContext = ctx;
    }

    // Context-based tempo multiplier (smooth transition)
    let targetTempo = 1.0;
    if (this._lyreContext === 'combat') targetTempo = 0.7;
    else if (this._lyreContext === 'rain') targetTempo = 1.3;
    else if (this._lyreContext === 'night') targetTempo = 1.2;
    else if (this._lyreContext === 'dawn') targetTempo = 1.1;
    else if (this._lyreContext === 'farming') targetTempo = 0.95;
    this._tempoMult += (targetTempo - this._tempoMult) * 0.02;

    // Handle crossfade
    if (this._lyreFadeDir === -1) {
      this._lyreVolMult = max(0, this._lyreVolMult - 0.04);
      if (this._lyreVolMult <= 0) {
        // Switch mode at silence
        this._lyreMode = this._lyrePendingMode || this._lyreMode;
        this._lyrePendingMode = null;
        this._lyreNoteIdx = 0;
        this._lyrePhrase = 0;
        this._lyreTimer = 8;
        this._lyreFadeDir = 1;
      }
    } else if (this._lyreFadeDir === 1) {
      this._lyreVolMult = min(1, this._lyreVolMult + 0.03);
      if (this._lyreVolMult >= 1) this._lyreFadeDir = 0;
    }

    // Update bass drone
    this._updateDrone(musicVol);
    // Update rhythmic pulse
    this._updatePulse(musicVol);

    this._lyreTimer--;
    if (this._lyreTimer > 0) return;

    // D Dorian: D E F G A B C (extended two octaves)
    let dorian = [293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3, 587.3, 659.3, 698.5, 784.0, 880.0];
    // D Phrygian: D Eb F G A Bb C
    let phrygian = [293.7, 311.1, 349.2, 392.0, 440.0, 466.2, 523.3, 587.3, 622.3, 698.5, 784.0, 880.0];
    // D Aeolian (natural minor): D E F G A Bb C — for eerie
    let aeolian = [293.7, 329.6, 349.2, 392.0, 440.0, 466.2, 523.3, 587.3, 659.3, 698.5, 784.0, 880.0];

    let scale, phrases;

    if (this._lyreMode === 'menu') {
      scale = dorian;
      // Contemplative standalone piece — beautiful slow phrases with harmonic depth
      phrases = [
        // Opening: gentle D-A open fifth, then melodic descent
        [[0,100,0.30,0],[4,100,0.20,1],[-1,60,0,0],[7,90,0.25,0],[-1,50,0,0],
         [5,80,0.22,1],[4,90,0.28,0],[-1,40,0,0],[3,85,0.24,0],[2,95,0.20,1],[-1,70,0,0],
         [0,120,0.26,0],[4,120,0.18,2],[-1,200,0,0]],
        // Rising hope: stepwise ascent with thirds harmony
        [[0,90,0.25,0],[2,90,0.18,1],[-1,40,0,0],[2,80,0.26,0],[4,80,0.18,1],[-1,35,0,0],
         [4,90,0.28,0],[5,90,0.20,1],[-1,30,0,0],[5,85,0.25,0],[7,85,0.18,1],[-1,50,0,0],
         [4,100,0.22,0],[2,110,0.18,1],[0,130,0.26,0],[-1,220,0,0]],
        // Echoing question: voice 0 melody, voice 1 echoes 2 beats later
        [[4,80,0.28,0],[-1,30,0,0],[7,75,0.22,0],[4,80,0.18,1],[-1,25,0,0],
         [5,90,0.24,0],[7,75,0.16,1],[-1,40,0,0],[4,85,0.22,0],[5,90,0.15,1],[-1,50,0,0],
         [3,110,0.26,0],[0,130,0.20,2],[-1,250,0,0]],
        // Gentle waltz: flowing 3-feel with open voicing
        [[0,70,0.24,0],[4,70,0.16,1],[7,70,0.12,2],[-1,30,0,0],
         [5,65,0.22,0],[-1,30,0,0],[4,65,0.20,0],[-1,25,0,0],
         [3,70,0.24,0],[5,70,0.16,1],[7,70,0.12,2],[-1,30,0,0],
         [2,65,0.22,0],[-1,30,0,0],[0,80,0.26,0],[-1,180,0,0]],
        // Bittersweet: minor inflection with resolution
        [[4,95,0.26,0],[-1,40,0,0],[3,85,0.24,0],[2,85,0.18,1],[-1,35,0,0],
         [1,90,0.22,0],[-1,50,0,0],[2,80,0.24,0],[4,80,0.18,1],[-1,40,0,0],
         [0,120,0.28,0],[4,120,0.20,2],[-1,200,0,0]],
        // Spacious: widely spaced single notes, each one a jewel
        [[7,110,0.22,0],[-1,80,0,0],[4,100,0.20,1],[-1,90,0,0],
         [0,130,0.26,0],[-1,100,0,0],[3,100,0.22,0],[-1,80,0,0],
         [4,120,0.24,0],[0,120,0.16,2],[-1,280,0,0]],
        // Closing: descending arc, fading to silence
        [[7,80,0.24,0],[5,80,0.16,1],[-1,30,0,0],[5,75,0.22,0],[4,75,0.16,1],[-1,35,0,0],
         [4,80,0.24,0],[3,80,0.16,1],[-1,30,0,0],[3,75,0.22,0],[2,75,0.14,1],[-1,40,0,0],
         [0,130,0.28,0],[4,130,0.18,2],[-1,300,0,0]],
        // Arpeggio bloom: root position chord slowly arpeggiated
        [[0,90,0.22,0],[-1,20,0,0],[2,85,0.20,0],[-1,20,0,0],[4,80,0.24,0],[-1,20,0,0],
         [7,90,0.26,0],[4,90,0.18,1],[-1,60,0,0],
         [5,80,0.22,0],[-1,20,0,0],[3,85,0.20,0],[-1,20,0,0],[0,100,0.26,0],[-1,240,0,0]],
      ];
    } else if (this._lyreMode === 'tense') {
      scale = phrygian;
      // Driving Phrygian urgency — rhythmic, dark, relentless
      phrases = [
        // Hammered ostinato: repeated root with chromatic neighbor
        [[0,20,0.75,0],[1,20,0.55,1],[0,20,0.70,0],[3,25,0.65,1],[4,30,0.80,0],[-1,8,0,0],
         [3,20,0.65,0],[1,20,0.55,1],[0,30,0.75,0],[-1,12,0,0],
         [0,20,0.70,0],[4,25,0.80,1],[7,30,0.90,0],[-1,25,0,0]],
        // Ascending menace: chromatic creep up with drone
        [[0,60,0.30,2],[0,20,0.65,0],[1,20,0.60,0],[3,20,0.70,0],[4,20,0.75,0],[-1,10,0,0],
         [5,25,0.70,0],[4,20,0.65,1],[3,20,0.60,0],[1,25,0.70,1],[0,30,0.75,0],[-1,20,0,0]],
        // Stabbing chords: parallel fifths moving down
        [[7,18,0.80,0],[4,18,0.65,1],[-1,6,0,0],[5,18,0.75,0],[3,18,0.60,1],[-1,6,0,0],
         [4,18,0.75,0],[1,18,0.60,1],[-1,6,0,0],[3,18,0.70,0],[0,18,0.65,1],[-1,10,0,0],
         [0,25,0.80,0],[4,25,0.65,1],[7,35,0.85,0],[-1,30,0,0]],
        // Driving rhythm: syncopated accents
        [[0,15,0.80,0],[-1,5,0,0],[0,15,0.50,1],[-1,10,0,0],[3,15,0.70,0],[4,20,0.80,1],[-1,5,0,0],
         [5,15,0.65,0],[-1,5,0,0],[4,15,0.70,0],[3,20,0.75,1],[0,25,0.80,0],[-1,8,0,0],
         [1,15,0.65,0],[0,30,0.80,1],[-1,25,0,0]],
        // Cascading descent: rapid falling scales
        [[7,15,0.80,0],[5,15,0.70,1],[4,15,0.75,0],[3,15,0.65,1],[1,15,0.70,0],[0,20,0.80,1],[-1,10,0,0],
         [0,80,0.25,2],[3,20,0.70,0],[4,20,0.75,1],[7,25,0.85,0],[5,20,0.70,1],[3,30,0.75,0],[-1,30,0,0]],
        // War march: heavy emphasis on beats 1 and 3
        [[0,25,0.85,0],[0,25,0.30,2],[-1,20,0,0],[3,20,0.60,1],[-1,5,0,0],
         [4,25,0.85,0],[-1,20,0,0],[1,20,0.60,1],[-1,5,0,0],
         [0,25,0.80,0],[7,25,0.65,1],[-1,8,0,0],[5,20,0.70,0],[3,25,0.75,1],[0,35,0.85,0],[-1,35,0,0]],
        // Flurry: rapid alternation building tension
        [[0,12,0.70,0],[1,12,0.60,1],[0,12,0.70,0],[1,12,0.60,1],[0,12,0.70,0],[3,12,0.65,1],[-1,5,0,0],
         [4,12,0.75,0],[5,12,0.65,1],[4,12,0.75,0],[5,12,0.65,1],[7,20,0.85,0],[4,20,0.70,1],[-1,8,0,0],
         [0,30,0.80,0],[-1,30,0,0]],
        // Resolution: brief moment of clarity before next assault
        [[4,30,0.70,0],[3,30,0.60,1],[0,40,0.75,0],[-1,20,0,0],
         [0,80,0.30,2],[3,25,0.65,0],[4,25,0.70,1],[7,30,0.80,0],[-1,15,0,0],
         [5,25,0.65,0],[4,20,0.60,1],[0,35,0.75,0],[-1,35,0,0]],
      ];
    } else if (this._lyreMode === 'eerie') {
      scale = aeolian;
      // Necropolis: sparse, unsettling, chromatic surprises
      phrases = [
        // Hollow fifths with dissonant neighbor
        [[0,100,0.35,0],[-1,60,0,0],[3,90,0.28,1],[-1,50,0,0],
         [1,110,0.32,0],[-1,70,0,0],[0,120,0.25,2],[-1,100,0,0]],
        // Ghost melody: high register, fading echoes
        [[7,80,0.25,0],[-1,50,0,0],[5,90,0.22,1],[-1,60,0,0],
         [4,100,0.20,0],[-1,80,0,0],[3,110,0.18,1],[-1,90,0,0],[0,130,0.22,0],[-1,120,0,0]],
        // Tritone tension: unsettling interval
        [[0,90,0.30,0],[0,150,0.12,2],[-1,40,0,0],[3,80,0.25,0],[-1,30,0,0],
         [6,100,0.28,1],[-1,70,0,0],[5,90,0.22,0],[-1,60,0,0],[0,110,0.25,1],[-1,130,0,0]],
        // Whispered notes: very quiet, barely there
        [[4,120,0.18,0],[-1,100,0,0],[3,110,0.15,1],[-1,80,0,0],
         [1,130,0.18,0],[-1,100,0,0],[0,150,0.15,2],[-1,150,0,0]],
        // Sudden loud note then silence
        [[0,60,0.40,0],[-1,120,0,0],[5,80,0.20,1],[-1,150,0,0],
         [4,70,0.35,0],[-1,200,0,0]],
        // Descending chromatic fragment
        [[5,80,0.28,0],[4,80,0.25,1],[-1,40,0,0],[3,80,0.22,0],[2,80,0.20,1],[-1,40,0,0],
         [1,90,0.25,0],[0,100,0.28,2],[-1,130,0,0]],
        // Two voices in dissonant seconds
        [[0,100,0.28,0],[1,100,0.22,1],[-1,80,0,0],[3,90,0.25,0],[4,90,0.20,1],[-1,70,0,0],
         [0,120,0.22,0],[-1,120,0,0]],
        // Low drone with isolated high pings
        [[0,180,0.15,2],[7,60,0.25,0],[-1,100,0,0],[9,50,0.20,0],[-1,120,0,0],
         [7,70,0.22,0],[-1,80,0,0],[4,80,0.20,1],[-1,130,0,0]],
      ];
    } else if (this._lyreMode === 'celebration') {
      scale = dorian;
      // Festival: fast, joyful, dancing rhythms with ornamental trills
      phrases = [
        // Opening dance: ascending melody with rhythmic bounce
        [[4,18,0.80,0],[7,18,0.65,1],[4,15,0.55,0],[5,18,0.70,1],[7,22,0.80,0],[9,18,0.65,1],[-1,8,0,0],
         [7,18,0.70,0],[5,15,0.55,1],[4,22,0.80,0],[2,18,0.55,0],[4,25,0.70,1],[-1,18,0,0]],
        // Leaping joy: wide intervals, bright register
        [[0,14,0.70,0],[4,14,0.55,1],[7,18,0.80,0],[9,18,0.65,1],[11,22,0.85,0],[-1,6,0,0],
         [9,14,0.65,0],[7,14,0.55,1],[4,18,0.70,0],[7,22,0.80,1],[9,28,0.85,0],[-1,22,0,0]],
        // Trill ornament: rapid neighbor-tone alternation
        [[4,10,0.70,0],[5,10,0.55,1],[4,10,0.70,0],[5,10,0.55,1],[4,10,0.70,0],[5,10,0.60,1],[-1,5,0,0],
         [7,14,0.80,0],[9,14,0.65,1],[11,18,0.85,0],[-1,6,0,0],[7,14,0.65,0],[4,18,0.80,1],[-1,18,0,0]],
        // Descending garland: cascading scale with harmony
        [[11,14,0.80,0],[9,14,0.65,1],[7,14,0.75,0],[5,14,0.60,1],[4,14,0.70,0],[2,14,0.55,1],[-1,6,0,0],
         [0,18,0.75,0],[4,18,0.60,1],[7,22,0.80,0],[9,18,0.65,1],[11,25,0.85,0],[-1,20,0,0]],
        // Stomping dance: heavy downbeats with pickup notes
        [[0,22,0.85,0],[4,22,0.60,1],[-1,10,0,0],[3,12,0.55,0],[4,22,0.85,1],[7,22,0.60,0],[-1,10,0,0],
         [5,12,0.55,0],[7,22,0.85,0],[4,22,0.60,1],[-1,10,0,0],[2,12,0.55,0],[0,25,0.80,1],[-1,18,0,0]],
        // Call and response: melody then answer
        [[4,14,0.70,0],[5,14,0.60,0],[7,18,0.80,0],[-1,12,0,0],
         [7,14,0.70,1],[5,14,0.60,1],[4,18,0.80,1],[-1,12,0,0],
         [4,14,0.70,0],[7,14,0.60,0],[9,18,0.80,0],[11,22,0.85,1],[-1,18,0,0]],
        // Spinning: circular melodic pattern
        [[4,12,0.70,0],[7,12,0.60,1],[9,12,0.70,0],[7,12,0.60,1],
         [4,12,0.70,0],[7,12,0.60,1],[9,12,0.70,0],[11,14,0.80,1],[-1,5,0,0],
         [9,12,0.65,0],[7,12,0.55,1],[4,14,0.70,0],[0,18,0.80,1],[-1,18,0,0]],
        // Grand finale: ascending octaves with full harmony
        [[0,12,0.80,0],[4,12,0.55,1],[7,12,0.40,2],[-1,5,0,0],
         [2,12,0.75,0],[5,12,0.55,1],[-1,5,0,0],
         [4,14,0.80,0],[7,14,0.60,1],[9,14,0.45,2],[-1,5,0,0],
         [7,14,0.85,0],[9,14,0.60,1],[11,18,0.90,0],[-1,8,0,0],
         [7,14,0.70,0],[4,18,0.80,1],[0,22,0.85,0],[-1,25,0,0]],
        // Drone dance: pedal tone underneath moving melody
        [[0,80,0.20,2],[4,14,0.70,0],[5,14,0.60,1],[7,14,0.70,0],[9,14,0.60,1],[-1,5,0,0],
         [7,14,0.70,0],[5,14,0.55,1],[4,14,0.70,0],[2,14,0.55,1],[-1,5,0,0],
         [4,18,0.80,0],[7,22,0.70,1],[-1,20,0,0]],
        // Ending flourish: fast ascending arpeggio
        [[0,10,0.60,0],[2,10,0.50,1],[4,10,0.65,0],[5,10,0.50,1],[7,10,0.70,0],[9,10,0.55,1],
         [11,14,0.85,0],[9,14,0.65,1],[7,14,0.70,0],[4,18,0.80,1],[0,22,0.85,0],[-1,25,0,0]],
        // Rhythmic clap: short-long pattern with accents
        [[4,8,0.70,0],[-1,4,0,0],[4,16,0.80,0],[7,16,0.60,1],[-1,8,0,0],
         [5,8,0.65,0],[-1,4,0,0],[5,16,0.75,0],[9,16,0.55,1],[-1,8,0,0],
         [7,8,0.70,0],[-1,4,0,0],[7,16,0.80,0],[11,16,0.60,1],[-1,6,0,0],
         [9,12,0.65,0],[7,12,0.55,1],[4,18,0.80,0],[-1,20,0,0]],
        // Wine toast: ascending major with held chord at top
        [[0,14,0.65,0],[2,14,0.50,1],[-1,6,0,0],[4,14,0.70,0],[5,14,0.55,1],[-1,6,0,0],
         [7,14,0.75,0],[9,14,0.55,1],[-1,6,0,0],
         [11,22,0.85,0],[9,22,0.65,1],[7,22,0.50,2],[-1,10,0,0],
         [9,12,0.60,0],[7,12,0.50,1],[4,18,0.70,0],[0,22,0.75,1],[-1,22,0,0]],
      ];
    } else if (this._lyreMode === 'night') {
      scale = dorian;
      // Night: haunting, sparse, minor-inflected, long sustains with bell-like quality
      phrases = [
        // Opening stillness: D drone with floating A above
        [[0,150,0.30,0],[0,220,0.10,2],[-1,80,0,0],[4,120,0.25,1],[-1,70,0,0],
         [3,130,0.22,0],[-1,60,0,0],[2,140,0.20,1],[0,160,0.18,2],[-1,150,0,0]],
        // Moonlit melody: gentle ascending then falling back
        [[0,120,0.28,0],[-1,50,0,0],[2,100,0.24,1],[-1,40,0,0],[4,110,0.26,0],[-1,50,0,0],
         [5,120,0.28,1],[-1,60,0,0],[4,130,0.24,0],[-1,50,0,0],[2,110,0.22,1],[-1,40,0,0],
         [0,160,0.26,0],[0,200,0.08,2],[-1,160,0,0]],
        // Lullaby fragment: two voices in gentle thirds
        [[4,110,0.24,0],[2,110,0.18,1],[-1,50,0,0],[3,100,0.22,0],[0,100,0.16,1],[-1,50,0,0],
         [2,110,0.24,0],[0,110,0.18,1],[-1,60,0,0],[0,140,0.26,0],[4,140,0.18,2],[-1,180,0,0]],
        // Starlight: isolated high notes over low drone
        [[0,200,0.10,2],[7,100,0.22,0],[-1,100,0,0],[5,90,0.18,1],[-1,120,0,0],
         [4,110,0.20,0],[-1,100,0,0],[7,120,0.22,1],[-1,160,0,0]],
        // Nocturne: flowing melody with wide intervals
        [[4,120,0.25,0],[-1,40,0,0],[7,100,0.22,1],[-1,50,0,0],[5,110,0.24,0],[-1,40,0,0],
         [3,120,0.22,1],[-1,50,0,0],[0,150,0.28,0],[4,150,0.18,2],[-1,180,0,0]],
        // Echo: each note repeated softer
        [[4,90,0.28,0],[-1,30,0,0],[4,90,0.14,1],[-1,50,0,0],
         [7,80,0.25,0],[-1,30,0,0],[7,80,0.12,1],[-1,60,0,0],
         [5,100,0.26,0],[-1,30,0,0],[5,100,0.13,1],[-1,70,0,0],
         [0,140,0.22,0],[-1,150,0,0]],
        // Deep night: very sparse, bass-heavy
        [[0,180,0.12,2],[-1,100,0,0],[3,140,0.20,0],[-1,120,0,0],
         [0,200,0.10,2],[-1,80,0,0],[4,120,0.18,1],[-1,150,0,0],[0,160,0.15,0],[-1,200,0,0]],
        // Wistful: minor seconds creating gentle tension
        [[4,100,0.24,0],[3,100,0.18,1],[-1,50,0,0],[2,110,0.22,0],[1,110,0.16,1],[-1,60,0,0],
         [0,140,0.26,0],[4,140,0.18,2],[-1,70,0,0],[2,120,0.20,0],[-1,80,0,0],
         [0,160,0.24,0],[-1,180,0,0]],
        // Firefly: tiny bright notes scattered high
        [[9,60,0.18,0],[-1,100,0,0],[7,70,0.16,1],[-1,90,0,0],
         [0,180,0.08,2],[11,50,0.15,0],[-1,120,0,0],[9,60,0.16,1],[-1,100,0,0],
         [7,80,0.18,0],[-1,80,0,0],[4,100,0.20,1],[0,130,0.22,0],[-1,200,0,0]],
        // Closing: descending to rest
        [[5,110,0.22,0],[-1,50,0,0],[4,100,0.20,1],[-1,50,0,0],
         [3,110,0.22,0],[-1,50,0,0],[2,100,0.18,1],[-1,50,0,0],
         [0,160,0.26,0],[0,160,0.14,2],[-1,220,0,0]],
        // Descending minor: Aeolian descent, melancholy and warm
        [[5,130,0.24,0],[-1,60,0,0],[4,120,0.22,1],[-1,50,0,0],
         [3,130,0.24,0],[-1,60,0,0],[2,120,0.20,1],[-1,50,0,0],
         [1,140,0.22,0],[-1,70,0,0],[0,180,0.26,0],[0,180,0.12,2],[-1,200,0,0]],
        // Embers: very low register, sparse warmth
        [[0,200,0.14,2],[-1,120,0,0],[1,150,0.20,0],[-1,80,0,0],
         [0,160,0.18,1],[-1,100,0,0],[3,140,0.20,0],[-1,70,0,0],
         [2,150,0.18,1],[-1,80,0,0],[0,200,0.22,0],[-1,200,0,0]],
        // Owl call: two-note motif repeated with variation
        [[4,80,0.22,0],[2,120,0.18,1],[-1,100,0,0],
         [4,80,0.20,0],[3,120,0.16,1],[-1,120,0,0],
         [4,80,0.22,0],[0,140,0.20,1],[-1,80,0,0],
         [0,180,0.15,2],[-1,180,0,0]],
      ];
    } else if (this._lyreMode === 'sailing') {
      scale = dorian;
      // Sailing: adventurous, pentatonic feel, wave-like contour, call of the sea
      phrases = [
        // Ascending horizon: rising momentum
        [[0,35,0.70,0],[1,30,0.55,1],[3,30,0.70,0],[4,35,0.75,1],[7,40,0.85,0],[-1,12,0,0],
         [4,30,0.55,0],[3,35,0.65,1],[4,40,0.75,0],[7,50,0.70,1],[-1,35,0,0]],
        // Wave rhythm: rolling up and down like the sea
        [[0,40,0.65,0],[3,35,0.55,0],[4,30,0.65,0],[7,35,0.75,0],[4,30,0.60,0],[3,35,0.55,0],[-1,10,0,0],
         [0,40,0.65,0],[4,35,0.55,1],[7,40,0.75,0],[9,45,0.70,1],[-1,35,0,0]],
        // Shanty call: bold melodic statement
        [[4,35,0.75,0],[4,35,0.55,1],[-1,10,0,0],[7,30,0.70,0],[9,35,0.80,0],[-1,12,0,0],
         [7,30,0.65,1],[4,35,0.70,0],[-1,10,0,0],[3,30,0.60,0],[0,40,0.70,1],[-1,15,0,0],
         [4,40,0.75,0],[7,45,0.80,1],[-1,40,0,0]],
        // Response: answering phrase, descending
        [[9,30,0.70,0],[7,30,0.60,1],[-1,8,0,0],[7,30,0.65,0],[4,30,0.55,1],[-1,8,0,0],
         [4,35,0.70,0],[3,30,0.55,0],[0,40,0.75,1],[-1,15,0,0],
         [3,30,0.60,0],[4,35,0.70,1],[7,45,0.80,0],[-1,45,0,0]],
        // Wind in sails: soaring high melody
        [[7,30,0.70,0],[9,30,0.60,1],[11,35,0.80,0],[-1,10,0,0],
         [9,28,0.65,0],[7,28,0.55,1],[4,30,0.70,0],[-1,8,0,0],
         [7,32,0.75,0],[9,35,0.80,1],[11,40,0.85,0],[-1,12,0,0],
         [9,30,0.65,0],[7,35,0.70,1],[4,45,0.65,0],[-1,45,0,0]],
        // Bass anchor: deep notes with dancing upper voice
        [[0,70,0.20,2],[4,25,0.65,0],[7,25,0.55,1],[4,25,0.65,0],[3,30,0.55,1],[-1,8,0,0],
         [4,25,0.65,0],[7,30,0.75,0],[9,35,0.65,1],[7,40,0.55,0],[-1,50,0,0]],
        // Arrival fanfare: triumphant ascending
        [[0,30,0.70,0],[4,30,0.55,1],[-1,8,0,0],[4,30,0.75,0],[7,30,0.55,1],[-1,8,0,0],
         [7,35,0.80,0],[9,35,0.60,1],[-1,8,0,0],[9,30,0.75,0],[11,35,0.85,0],[-1,10,0,0],
         [9,28,0.65,1],[7,30,0.70,0],[4,40,0.60,1],[0,50,0.70,0],[-1,60,0,0]],
        // Rocking lullaby: gentle sea sway
        [[4,45,0.60,0],[7,40,0.50,1],[-1,15,0,0],[5,40,0.55,0],[4,45,0.50,1],[-1,15,0,0],
         [3,45,0.60,0],[4,40,0.50,1],[-1,15,0,0],[0,50,0.65,0],[3,45,0.50,1],[-1,15,0,0],
         [4,55,0.70,0],[7,50,0.55,1],[-1,50,0,0]],
      ];
    } else {
      // Peaceful: warm Mediterranean lyre — beautiful flowing melodies
      scale = dorian;
      phrases = [
        // Morning theme: gentle ascending melody with thirds harmony
        [[4,50,0.70,0],[2,50,0.45,1],[-1,15,0,0],[5,45,0.65,0],[3,45,0.42,1],[-1,12,0,0],
         [7,50,0.75,0],[4,50,0.48,1],[-1,20,0,0],[5,45,0.60,0],[3,50,0.42,1],[-1,15,0,0],
         [4,55,0.70,0],[2,55,0.45,1],[0,70,0.75,0],[-1,80,0,0]],
        // Pastoral arc: rise and gentle fall over bass drone
        [[0,60,0.60,0],[0,120,0.22,2],[2,50,0.50,0],[4,50,0.65,0],[5,55,0.60,1],[7,65,0.75,0],[-1,20,0,0],
         [5,45,0.55,0],[4,50,0.60,1],[2,55,0.50,0],[0,70,0.65,0],[-1,80,0,0]],
        // Mediterranean dance: lilting rhythm, sixths and thirds
        [[7,40,0.70,0],[4,40,0.50,1],[-1,15,0,0],[5,35,0.60,0],[2,35,0.42,1],[-1,12,0,0],
         [7,40,0.70,0],[5,40,0.50,1],[-1,15,0,0],[4,35,0.60,0],[2,35,0.42,1],[-1,12,0,0],
         [3,45,0.65,0],[0,45,0.45,1],[0,80,0.70,0],[-1,90,0,0]],
        // Flowing water: stepwise motion, gentle and continuous
        [[4,30,0.60,0],[5,30,0.50,1],[7,35,0.70,0],[5,30,0.50,0],[4,35,0.60,1],[2,30,0.50,0],[-1,12,0,0],
         [4,30,0.65,0],[7,35,0.75,0],[9,35,0.60,1],[7,40,0.70,0],[4,50,0.60,0],[-1,65,0,0]],
        // Sunlit rest: open voicing, warmth
        [[0,65,0.55,0],[4,60,0.42,1],[0,130,0.18,2],[-1,25,0,0],[2,55,0.50,0],[4,60,0.60,0],
         [7,70,0.70,0],[4,80,0.50,1],[0,90,0.60,0],[-1,100,0,0]],
        // Scale walk: ascending with pauses for breath
        [[0,40,0.60,0],[1,35,0.48,1],[2,35,0.60,0],[3,40,0.65,1],[4,45,0.75,0],[-1,20,0,0],
         [5,40,0.55,1],[7,50,0.75,0],[-1,15,0,0],[4,45,0.60,0],[2,50,0.50,1],[0,65,0.70,0],[-1,80,0,0]],
        // Echo dialogue: voice 0 calls, voice 1 answers lower
        [[4,45,0.70,0],[7,40,0.60,0],[-1,20,0,0],[2,45,0.50,1],[4,40,0.48,1],[-1,25,0,0],
         [5,50,0.70,0],[7,45,0.65,0],[-1,18,0,0],[3,45,0.50,1],[0,55,0.55,1],[-1,90,0,0]],
        // Parallel thirds: voices moving together
        [[0,50,0.60,0],[2,50,0.45,1],[-1,15,0,0],[2,45,0.60,0],[4,45,0.45,1],[-1,15,0,0],
         [4,50,0.65,0],[5,50,0.48,1],[-1,12,0,0],[7,55,0.75,0],[9,55,0.48,1],[-1,20,0,0],
         [4,50,0.60,0],[5,50,0.45,1],[0,70,0.70,0],[-1,90,0,0]],
        // Harvest song: warm, resolved, satisfying
        [[0,45,0.65,0],[4,45,0.48,1],[7,45,0.35,2],[-1,15,0,0],
         [7,40,0.70,0],[5,40,0.50,1],[-1,12,0,0],[4,40,0.65,0],[2,40,0.48,1],[-1,12,0,0],
         [3,45,0.65,0],[4,45,0.48,1],[-1,15,0,0],[5,40,0.60,0],[7,45,0.70,0],[-1,12,0,0],
         [4,55,0.75,0],[0,55,0.50,1],[-1,80,0,0]],
        // Lyre cadence: classic ancient ending formula (IV-I)
        [[3,50,0.65,0],[5,50,0.50,1],[7,50,0.38,2],[-1,20,0,0],
         [4,45,0.60,0],[3,45,0.48,1],[-1,15,0,0],
         [2,50,0.60,0],[4,50,0.48,1],[-1,15,0,0],
         [0,65,0.70,0],[4,65,0.50,1],[7,65,0.38,2],[-1,25,0,0],
         [0,80,0.75,0],[4,80,0.50,1],[-1,100,0,0]],
        // Contemplation: slow, wide intervals, philosophical mood
        [[0,70,0.55,0],[-1,30,0,0],[7,60,0.50,1],[-1,25,0,0],[4,55,0.60,0],[-1,30,0,0],
         [3,65,0.55,1],[-1,25,0,0],[0,80,0.65,0],[4,80,0.45,1],[-1,30,0,0],
         [2,55,0.50,0],[0,70,0.60,0],[-1,100,0,0]],
        // Birdsong imitation: quick ornamental notes then held tone
        [[4,20,0.50,0],[5,18,0.45,0],[4,20,0.50,0],[-1,8,0,0],
         [7,55,0.70,0],[4,55,0.48,1],[-1,25,0,0],
         [5,20,0.50,0],[7,18,0.45,0],[5,20,0.50,0],[-1,8,0,0],
         [4,55,0.65,0],[2,55,0.48,1],[0,70,0.70,0],[-1,90,0,0]],
        // Golden hour: long warm phrase, two-chord voicings with stepwise melody
        [[0,55,0.60,0],[4,55,0.42,1],[7,55,0.30,2],[-1,18,0,0],
         [2,45,0.55,0],[5,45,0.38,1],[-1,15,0,0],
         [4,50,0.65,0],[7,50,0.45,1],[-1,15,0,0],
         [5,50,0.60,0],[9,50,0.42,1],[-1,18,0,0],
         [7,55,0.70,0],[4,55,0.48,1],[-1,20,0,0],
         [5,45,0.55,0],[2,45,0.38,1],[-1,15,0,0],
         [4,50,0.60,0],[0,50,0.42,1],[-1,15,0,0],
         [0,70,0.65,0],[4,70,0.45,2],[-1,100,0,0]],
        // Cypress shade: gentle descending thirds over drone
        [[0,100,0.18,2],[7,40,0.60,0],[5,40,0.42,1],[-1,12,0,0],
         [5,40,0.55,0],[3,40,0.38,1],[-1,12,0,0],
         [4,40,0.60,0],[2,40,0.42,1],[-1,12,0,0],
         [3,40,0.55,0],[0,40,0.38,1],[-1,15,0,0],
         [2,45,0.50,0],[4,45,0.38,1],[-1,12,0,0],
         [0,60,0.65,0],[4,60,0.45,1],[-1,80,0,0]],
        // Forum gossip: playful rhythmic alternation
        [[4,25,0.60,0],[-1,8,0,0],[5,25,0.55,0],[-1,8,0,0],[4,25,0.60,0],[7,30,0.70,1],[-1,12,0,0],
         [5,25,0.55,0],[-1,8,0,0],[4,25,0.55,0],[-1,8,0,0],[2,25,0.50,0],[4,30,0.60,1],[-1,15,0,0],
         [3,35,0.60,0],[5,35,0.42,1],[-1,12,0,0],
         [0,50,0.65,0],[4,50,0.45,1],[-1,70,0,0]],
      ];
    }

    let phrase = phrases[this._lyrePhrase % phrases.length];
    let note = phrase[this._lyreNoteIdx % phrase.length];
    let [ni, dur, vel, voice] = note;

    // Era detection: Era 1 (lv 1-8) monophonic, Era 2 (9-16) two voices + harmony, Era 3 (17-25) full + reverb echo
    let lyreEra = 1;
    if (typeof state !== 'undefined' && state.islandLevel) {
      if (state.islandLevel >= 17) lyreEra = 3;
      else if (state.islandLevel >= 9) lyreEra = 2;
    }
    // Menu mode always uses full voicing for beauty
    if (this._lyreMode === 'menu') lyreEra = 3;

    // Era 1: only voice 0 (monophonic). Redirect voice 1/2 notes to voice 0.
    // Era 2: voices 0 and 1. Redirect voice 2 to voice 0.
    if (lyreEra === 1 && voice > 0) voice = 0;
    else if (lyreEra === 2 && voice > 1) voice = 0;

    let volMult = this._lyreVolMult;
    // Context-based dynamic adjustments
    if (this._lyreContext === 'rain') volMult *= 0.7;
    else if (this._lyreContext === 'farming') volMult *= 0.9;
    else if (this._lyreContext === 'combat') volMult *= 1.1;
    else if (this._lyreContext === 'dawn') volMult *= 0.8;

    if (ni >= 0 && ni < scale.length) {
      let freq = scale[ni];
      let amp = vel * musicVol * volMult * (this._lyreMode === 'menu' ? 0.06 : 0.14);
      if (this._lyreMode === 'eerie' && freq > 500) freq *= 0.5;
      // Rain: dampen highs, slight detune for washed-out feel
      if (this._lyreContext === 'rain') {
        if (freq > 600) amp *= 0.6;
        freq *= (1 - 0.003); // slight flat detune
      }
      // Combat: boost bass, sharper attack feel
      if (this._lyreContext === 'combat' && freq < 400) amp *= 1.15;
      // Dawn: ascending phrases brighter
      if (this._lyreContext === 'dawn' && ni > 4) amp *= 1.1;
      // Farming: slightly brighter tone
      if (this._lyreContext === 'farming' && freq > 350) amp *= 1.05;

      let pluckDur = dur * 16;
      this._pluckLyre(voice, freq, amp, pluckDur);

      // Harmony layer: play a 5th above (or 3rd) — Era 2+ only
      if (lyreEra >= 2 && this._harmOsc && this._harmGain && amp > 0.005) {
        let harmInterval = (this._lyreMode === 'night' || this._lyreMode === 'eerie') ? 1.2 : 1.5; // minor 3rd vs perfect 5th
        if (this._lyreContext === 'farming') harmInterval = 1.25; // major 3rd for warmth
        let harmFreq = freq * harmInterval;
        // Only harmonize if result is in comfortable range
        if (harmFreq < 1200) {
          let harmAmp = amp * 0.35;
          this._harmOsc.freq(harmFreq * (1 + (random() - 0.5) * 0.004));
          this._harmGain.amp(harmAmp, 0.015);
          // Slower decay than main note
          setTimeout(() => {
            if (this._harmGain) this._harmGain.amp(harmAmp * 0.3, 0.1);
          }, pluckDur * 0.3);
          setTimeout(() => {
            if (this._harmGain) this._harmGain.amp(0, 0.08);
          }, pluckDur * 0.7);
        }
      }

      // Grace note: quick ornamental note before main note (10% chance, not in eerie/menu, Era 2+)
      if (lyreEra >= 2 && this._lyreMode !== 'eerie' && this._lyreMode !== 'menu' && random() < 0.10) {
        let graceIdx = ni > 0 ? ni - 1 : ni + 1;
        if (graceIdx >= 0 && graceIdx < scale.length) {
          let graceFreq = scale[graceIdx];
          let graceAmp = amp * 0.4;
          let graceVoice = lyreEra >= 3 ? ((voice + 1) % this._lyreVoices.length) : voice;
          this._pluckLyre(graceVoice, graceFreq, graceAmp, 40);
        }
      }

      // Era 3 reverb echo: delayed quiet repeat for grand depth
      if (lyreEra >= 3 && random() < 0.35) {
        let echoDelay = floor(random(8, 16));
        let echoAmp = amp * 0.22;
        let echoVoice = (voice + 2) % this._lyreVoices.length;
        setTimeout(() => {
          this._pluckLyre(echoVoice, freq * 0.998, echoAmp, pluckDur * 0.6);
        }, echoDelay * 16);
        // Second fainter echo for reverb tail (Era 3 only)
        if (random() < 0.5) {
          let echo2Delay = echoDelay * 2 + floor(random(4, 10));
          setTimeout(() => {
            this._pluckLyre(echoVoice, freq * 1.001, echoAmp * 0.4, pluckDur * 0.4);
          }, echo2Delay * 16);
        }
      }

      // Rain echo: additional reverb-like depth (any era, additive to era echo)
      if (this._lyreContext === 'rain' && random() < 0.4) {
        let echoDelay = floor(random(8, 16));
        let echoAmp = amp * 0.25;
        let echoVoice = (voice + 2) % this._lyreVoices.length;
        setTimeout(() => {
          this._pluckLyre(echoVoice, freq * 0.998, echoAmp, pluckDur * 0.6);
        }, echoDelay * 16);
      }
    }

    // Apply tempo multiplier to timer
    this._lyreTimer = floor(dur * this._tempoMult);
    this._lyreNoteIdx++;
    if (this._lyreNoteIdx >= phrase.length) {
      this._lyreNoteIdx = 0;
      this._lyrePhrase++;
      let pauseMult = this._lyreContext === 'rain' ? 1.4 : (this._lyreContext === 'combat' ? 0.6 : 1.0);
      if (this._lyreMode === 'menu') this._lyreTimer += floor(random(180, 360) * pauseMult);
      else if (this._lyreMode === 'tense') this._lyreTimer += floor(random(15, 40) * pauseMult);
      else if (this._lyreMode === 'eerie') this._lyreTimer += floor(random(100, 200) * pauseMult);
      else if (this._lyreMode === 'celebration') this._lyreTimer += floor(random(12, 30) * pauseMult);
      else if (this._lyreMode === 'night') this._lyreTimer += floor(random(140, 280) * pauseMult);
      else if (this._lyreMode === 'sailing') this._lyreTimer += floor(random(35, 70) * pauseMult);
      else this._lyreTimer += floor(random(50, 120) * pauseMult);
    }
  }

  // Update bass drone — provides harmonic foundation under melodies
  _updateDrone(musicVol) {
    if (!this._droneGain) return;
    let mode = this._lyreMode;
    let droneFreq = 146.8; // D3
    let droneVol = 0;
    if (mode === 'peaceful') { droneVol = 0.04; droneFreq = 146.8; }
    else if (mode === 'night') { droneVol = 0.035; droneFreq = 146.8; }
    else if (mode === 'tense') { droneVol = 0.05; droneFreq = 146.8; }
    else if (mode === 'eerie') { droneVol = 0.03; droneFreq = 110.0; } // A2 for darker color
    else if (mode === 'celebration') { droneVol = 0.04; droneFreq = 146.8; }
    else if (mode === 'sailing') { droneVol = 0.045; droneFreq = 146.8; }
    else if (mode === 'menu') { droneVol = 0.02; droneFreq = 146.8; }
    // Era-based drone scaling: Era 1 minimal, Era 2 moderate, Era 3 full
    let lyreEra = 1;
    if (typeof state !== 'undefined' && state.islandLevel) {
      if (state.islandLevel >= 17) lyreEra = 3;
      else if (state.islandLevel >= 9) lyreEra = 2;
    }
    if (mode === 'menu') lyreEra = 3;
    if (lyreEra === 1) droneVol *= 0.3;
    else if (lyreEra === 2) droneVol *= 0.7;
    // Context modifiers on drone
    if (this._lyreContext === 'combat') { droneVol *= 1.4; }
    else if (this._lyreContext === 'rain') { droneFreq *= 0.97; droneVol *= 0.8; }
    else if (this._lyreContext === 'dawn') { droneVol *= 0.6; }
    else if (this._lyreContext === 'farming') { droneVol *= 1.1; }
    // Slow amplitude modulation for organic breathing
    let breathe = 1.0 + Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.008) * 0.15;
    let targetAmp = droneVol * musicVol * this._lyreVolMult * breathe;
    this._droneGain.amp(Math.max(0, targetAmp), 0.3);
    this._droneOsc.freq(droneFreq);
  }

  // Update rhythmic pulse — subtle heartbeat underneath music
  _updatePulse(musicVol) {
    if (!this._pulseGain) return;
    let mode = this._lyreMode;
    let fc = typeof frameCount !== 'undefined' ? frameCount : 0;
    let pulseVol = 0;
    let pulseRate = 0.06; // frames-based sine rate
    if (mode === 'peaceful') { pulseVol = 0.02; pulseRate = 0.05; }
    else if (mode === 'night') { pulseVol = 0.015; pulseRate = 0.03; } // slower at night
    else if (mode === 'tense') { pulseVol = 0.035; pulseRate = 0.09; } // faster in combat
    else if (mode === 'celebration') { pulseVol = 0.03; pulseRate = 0.10; }
    else if (mode === 'sailing') { pulseVol = 0.025; pulseRate = 0.07; }
    // Context modifiers on pulse
    if (this._lyreContext === 'combat') { pulseVol *= 1.3; pulseRate *= 1.2; }
    else if (this._lyreContext === 'rain') { pulseVol *= 0.5; pulseRate *= 0.7; }
    else if (this._lyreContext === 'farming') { pulseVol *= 1.1; pulseRate *= 1.05; }
    else if (this._lyreContext === 'dawn') { pulseVol *= 0.7; }
    // Create pulse envelope: on for part of cycle, off for rest
    let phase = Math.sin(fc * pulseRate);
    let gate = phase > 0.3 ? Math.pow((phase - 0.3) / 0.7, 0.5) : 0;
    let targetAmp = pulseVol * musicVol * this._lyreVolMult * gate;
    this._pulseGain.amp(Math.max(0, targetAmp), 0.03);
    // Pulse frequency follows root of current mode
    let pFreq = mode === 'eerie' ? 110.0 : 146.8;
    if (this._lyreContext === 'ocean') pFreq = 130.8; // wave-like lower pitch
    if (this._lyreContext === 'combat') pFreq = 146.8; // lock to root for drive
    if (this._lyreContext === 'rain') pFreq = 130.8; // slightly lower, subdued
    this._pulseOsc.freq(pFreq);
  }

  // Pluck a lyre string — quick attack, long exponential decay (like a real string)
  _pluckLyre(voice, freq, amp, durMs) {
    if (voice >= this._lyreVoices.length) return;
    let osc = this._lyreVoices[voice];
    let gain = this._lyreGains[voice];

    osc.freq(freq);
    // Tiny detune for warmth
    osc.freq(freq * (1 + (random() - 0.5) * 0.003));

    // Quick pluck attack (5ms), then long exponential ring-out
    gain.amp(amp, 0.005);
    let steps = max(1, floor(durMs / 20));
    let step = 0;
    let tick = () => {
      step++;
      let t = step / steps;
      // String decay: fast initial drop then slow ring
      let env = Math.pow(1 - t, 1.8) * amp;
      // Add subtle vibrato (like a real string wobble)
      let vibrato = 1 + Math.sin(step * 0.4) * 0.002;
      try {
        osc.freq(freq * vibrato);
        gain.amp(max(0, env), 0.02);
      } catch(e) {}
      if (step < steps) {
        setTimeout(tick, 20);
      } else {
        gain.amp(0, 0.06);
      }
    };
    setTimeout(tick, 20);
  }

  // ─── SFX PLAYBACK ───
  playSFX(id) {
    if (!this.ready) return;
    let now = millis();
    if (this._lastPlay[id] && now - this._lastPlay[id] < this._minInterval) return;
    this._lastPlay[id] = now;

    let vol = this.vol.master * this.vol.sfx;
    let s = this._getSfxSlot();
    if (!s) return;

    // Helper: soft attack + exponential decay envelope
    let play = (type, freq, amp, endFreq, dur, opts) => {
      opts = opts || {};
      s.osc.setType(type);
      s.osc.freq(freq);
      s._vol = amp * vol;
      s._peak = s._vol;
      // Soft attack: start silent, ramp up
      let attackMs = opts.attack || Math.min(dur * 0.12, 30);
      s.gain.amp(0, 0);
      s.gain.amp(s._vol, attackMs / 1000);
      this._sfxEnvSmooth(s, freq, endFreq, dur, opts);
    };

    // Two-note helper for musical intervals
    let playTwo = (type, f1, f2, amp, dur, gap) => {
      play(type, f1, amp * 0.8, f1, dur * 0.45, { attack: 15 });
      setTimeout(() => {
        let s2 = this._getSfxSlot();
        if (s2) {
          s2.osc.setType(type); s2.osc.freq(f2); s2._vol = amp * vol; s2._peak = s2._vol;
          s2.gain.amp(0, 0); s2.gain.amp(s2._vol, 0.015);
          this._sfxEnvSmooth(s2, f2, f2 * 0.95, dur * 0.55, {});
        }
      }, gap);
    };

    switch (id) {
      // Farming — warm, soft pops and plucks
      case 'harvest':
        playTwo('sine', 523, 659, 0.22, 300, 100);  // C5->E5 major third
        setTimeout(() => {
          let sh = this._getSfxSlot();
          if (sh) { sh.osc.setType('sine'); sh.osc.freq(784); sh._vol = 0.18 * vol; sh._peak = sh._vol;
            sh.gain.amp(0,0); sh.gain.amp(sh._vol, 0.01); this._sfxEnvSmooth(sh, 784, 784, 350, { attack: 10 }); }
        }, 200);
        break;  // C5->E5->G5 satisfying ascending triad
      case 'chop':      play('triangle', 160, 0.25, 90, 120, { attack: 5 }); break;  // short thunk
      case 'build':
        play('triangle', 330, 0.20, 220, 180, { attack: 10 });  // woody tap
        setTimeout(() => {
          let sb2 = this._getSfxSlot();
          if (sb2) { sb2.osc.setType('sine'); sb2.osc.freq(165); sb2._vol = 0.12 * vol; sb2._peak = sb2._vol;
            sb2.gain.amp(0,0); sb2.gain.amp(sb2._vol, 0.01); this._sfxEnvSmooth(sb2, 165, 110, 200, { attack: 8 }); }
        }, 30);
        break;  // woody tap + resonant thunk
      // UI — gentle clicks and chimes
      case 'equip':     playTwo('sine', 784, 1047, 0.18, 200, 80); break;  // G5->C6 perfect fourth
      case 'click':     play('sine', 660, 0.12, 440, 60, { attack: 3 }); break;  // tiny pip
      case 'ding':      play('sine', 1047, 0.18, 880, 400, { attack: 20 }); break;  // bell tone, long ring
      // Movement — subtle whooshes
      case 'step_sand': { let p20 = 1 + (random() - 0.5) * 0.4; play('triangle', 140 * p20, 0.06, 80 * p20, 70, { attack: 5 }); break; }  // soft puff +/- 20%
      case 'step_stone':{ let p20 = 1 + (random() - 0.5) * 0.4; play('triangle', 320 * p20, 0.07, 200 * p20, 60, { attack: 3 }); break; }  // light tap +/- 20%
      case 'dash':      play('triangle', 500, 0.18, 150, 200, { attack: 8 }); break;  // breeze sweep
      // Fishing — watery plops
      case 'fish_cast': play('sine', 400, 0.16, 200, 250, { attack: 15 }); break;  // descending plop
      case 'fish_catch':playTwo('sine', 392, 523, 0.20, 300, 120); break;  // G4->C5 happy catch
      case 'bobber_plop': play('sine', 320, 0.14, 140, 180, { attack: 8 }); break;  // bobber hitting water
      case 'fish_bite': play('sine', 500, 0.22, 200, 150, { attack: 5 }); play('triangle', 180, 0.12, 100, 200, { attack: 10 }); break;  // sharp tug + underwater thud
      // Magical — shimmery tones
      case 'crystal':   playTwo('sine', 880, 1319, 0.22, 500, 150); break;  // A5->E6 sparkle
      case 'heart':     playTwo('sine', 659, 880, 0.16, 400, 130); break;   // E5->A5 warm
      case 'fanfare':
        play('sine', 523, 0.20, 523, 200, { attack: 15 });  // C5
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('sine'); s2.osc.freq(659); s2._vol = 0.20 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.015); this._sfxEnvSmooth(s2, 659, 659, 200, {}); }
        }, 180);
        setTimeout(() => {
          let s3 = this._getSfxSlot();
          if (s3) { s3.osc.setType('sine'); s3.osc.freq(784); s3._vol = 0.22 * vol; s3._peak = s3._vol;
            s3.gain.amp(0,0); s3.gain.amp(s3._vol, 0.015); this._sfxEnvSmooth(s3, 784, 784, 350, {}); }
        }, 360);
        break;  // C5->E5->G5 major arpeggio
      // Nature / world
      case 'crab_catch': play('sine', 440, 0.18, 330, 150, { attack: 10 }); break;  // quick pluck
      case 'heartbeat': play('sine', 55, 0.20, 40, 300, { attack: 30 }); break;  // deep throb
      case 'whoosh':    play('triangle', 300, 0.14, 80, 250, { attack: 15 }); break;  // gentle wind
      case 'sail':      play('triangle', 220, 0.18, 350, 500, { attack: 40 }); break;  // rising breeze
      case 'repair':    play('triangle', 380, 0.18, 260, 140, { attack: 5 }); break;  // tap
      case 'scavenge':  playTwo('sine', 349, 440, 0.16, 250, 90); break;  // F4->A4 find
      // Combat
      case 'hit':
        play('triangle', 280, 0.24, 120, 100, { attack: 3 });  // impact thud
        setTimeout(() => {
          let si = this._getSfxSlot();
          if (si) { si.osc.setType('sine'); si.osc.freq(70); si._vol = 0.16 * vol; si._peak = si._vol;
            si.gain.amp(0,0); si.gain.amp(si._vol, 0.008); this._sfxEnvSmooth(si, 70, 40, 120, { attack: 3 }); }
        }, 8);
        break;  // thud + sub-bass punch
      case 'whirlwind':
        play('triangle', 600, 0.20, 150, 180, { attack: 5 });  // fast descending sweep
        // Sub-bass rumble layer for punch
        setTimeout(() => {
          let sr = this._getSfxSlot();
          if (sr) { sr.osc.setType('sine'); sr.osc.freq(60); sr._vol = 0.18 * vol; sr._peak = sr._vol;
            sr.gain.amp(0,0); sr.gain.amp(sr._vol, 0.01); this._sfxEnvSmooth(sr, 60, 40, 300, { attack: 10 }); }
        }, 10);
        break;
      case 'dodge':
        play('triangle', 400, 0.14, 100, 30, { attack: 1 });  // snappy whoosh
        // High freq crack layer
        setTimeout(() => {
          let sd = this._getSfxSlot();
          if (sd) { sd.osc.setType('sine'); sd.osc.freq(1200); sd._vol = 0.10 * vol; sd._peak = sd._vol;
            sd.gain.amp(0,0); sd.gain.amp(sd._vol, 0.005); this._sfxEnvSmooth(sd, 1200, 800, 25, { attack: 1 }); }
        }, 5);
        break;
      case 'shield_bash':
        play('triangle', 180, 0.24, 80, 120, { attack: 3 });  // heavy thud
        // Metallic ring layer
        setTimeout(() => {
          let sb = this._getSfxSlot();
          if (sb) { sb.osc.setType('sine'); sb.osc.freq(800); sb._vol = 0.14 * vol; sb._peak = sb._vol;
            sb.gain.amp(0,0); sb.gain.amp(sb._vol, 0.008); this._sfxEnvSmooth(sb, 800, 600, 50, { attack: 2 }); }
        }, 8);
        break;
      case 'player_hurt':
        play('sine', 150, 0.22, 90, 100, { attack: 3 });  // low filtered grunt
        // Slight pitch-drop layer for impact feel
        setTimeout(() => {
          let sh = this._getSfxSlot();
          if (sh) { sh.osc.setType('triangle'); sh.osc.freq(120); sh._vol = 0.12 * vol; sh._peak = sh._vol;
            sh.gain.amp(0,0); sh.gain.amp(sh._vol, 0.005); this._sfxEnvSmooth(sh, 120, 60, 80, { attack: 2 }); }
        }, 10);
        break;
      case 'skill_unlock':
        play('sine', 600, 0.18, 600, 30, { attack: 3 });  // ascending chime: note 1
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('sine'); s2.osc.freq(800); s2._vol = 0.18 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.005); this._sfxEnvSmooth(s2, 800, 800, 30, { attack: 3 }); }
        }, 40);
        setTimeout(() => {
          let s3 = this._getSfxSlot();
          if (s3) { s3.osc.setType('sine'); s3.osc.freq(1000); s3._vol = 0.20 * vol; s3._peak = s3._vol;
            s3.gain.amp(0,0); s3.gain.amp(s3._vol, 0.005); this._sfxEnvSmooth(s3, 1000, 1000, 40, { attack: 3 }); }
        }, 80);
        break;  // 600->800->1000Hz ascending chime
      // Diving
      case 'water':     play('sine', 250, 0.16, 120, 300, { attack: 20 }); break;  // splash plunge
      case 'bubble_pop':play('triangle', 800, 0.18, 1200, 20, { attack: 2 }); break;  // bubble pop
      // Mining — dull impacts
      case 'stone_mine': play('sine', 180, 0.22, 120, 80, { attack: 3 }); break;  // deep thud + crumble
      // Cinematic
      case 'thunder':
        play('sine', 45, 0.15, 25, 300, { attack: 10 });  // low rumble, gentler
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('triangle'); s2.osc.freq(70); s2._vol = 0.12 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.01); this._sfxEnvSmooth(s2, 70, 25, 250, { attack: 15 }); }
        }, 50);
        break;  // distant thunder rumble
      case 'seagull':
        play('sine', 2800, 0.12, 2200, 150, { attack: 8 }); // high descending chirp
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('sine'); s2.osc.freq(2400); s2._vol = 0.10 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.01); this._sfxEnvSmooth(s2, 2400, 1900, 120, { attack: 5 }); }
        }, 100);
        break;  // seagull: two-part descending call
      case 'oar_splash':
        play('triangle', 200, 0.10, 100, 180, { attack: 10 }); break;  // subtle water splash
      // Ambient animals
      case 'chicken_cluck':
        play('sine', 800, 0.08, 600, 40, { attack: 2 });  // short cluck
        setTimeout(() => {
          let sc = this._getSfxSlot();
          if (sc) { sc.osc.setType('sine'); sc.osc.freq(750); sc._vol = 0.06 * vol; sc._peak = sc._vol;
            sc.gain.amp(0,0); sc.gain.amp(sc._vol, 0.005); this._sfxEnvSmooth(sc, 750, 550, 35, { attack: 2 }); }
        }, 50);
        break;  // two-part cluck
      case 'cat_meow':
        play('sine', 700, 0.07, 500, 120, { attack: 10 });  // rising then falling meow
        setTimeout(() => {
          let sm = this._getSfxSlot();
          if (sm) { sm.osc.setType('sine'); sm.osc.freq(600); sm._vol = 0.06 * vol; sm._peak = sm._vol;
            sm.gain.amp(0,0); sm.gain.amp(sm._vol, 0.008); this._sfxEnvSmooth(sm, 600, 400, 100, { attack: 8 }); }
        }, 80);
        break;  // soft descending meow
      case 'skeleton_death':
        play('triangle', 200, 0.18, 80, 200, { attack: 5 });  // crumble
        setTimeout(() => {
          let sd = this._getSfxSlot();
          if (sd) { sd.osc.setType('sine'); sd.osc.freq(120); sd._vol = 0.12 * vol; sd._peak = sd._vol;
            sd.gain.amp(0,0); sd.gain.amp(sd._vol, 0.005); this._sfxEnvSmooth(sd, 120, 60, 150, { attack: 3 }); }
        }, 60);
        break;
      case 'season_change':
        playTwo('sine', 440, 660, 0.14, 500, 180);  // A4->E5 soft chime
        setTimeout(() => playTwo('sine', 523, 784, 0.12, 400, 150), 200);
        break;
      case 'dawn_transition':
        // Rising birdsong-like chirp sequence: 4 ascending pips
        play('sine', 880, 0.10, 1100, 150, { attack: 15 });
        setTimeout(() => play('sine', 1047, 0.09, 1200, 140, { attack: 12 }), 180);
        setTimeout(() => play('sine', 1175, 0.08, 1320, 130, { attack: 10 }), 350);
        setTimeout(() => playTwo('sine', 1320, 1568, 0.07, 250, 100), 520);
        break;
      case 'dusk_transition':
        // Soft descending tone: 3 falling notes, warm and quiet
        play('sine', 660, 0.08, 550, 200, { attack: 20 });
        setTimeout(() => play('sine', 523, 0.07, 440, 220, { attack: 18 }), 250);
        setTimeout(() => play('sine', 392, 0.06, 330, 300, { attack: 25 }), 500);
        break;
      case 'festival_start':
        playTwo('sine', 523, 784, 0.20, 400, 150);  // C5->G5 bright
        setTimeout(() => playTwo('sine', 659, 988, 0.18, 350, 130), 150);
        setTimeout(() => playTwo('sine', 784, 1175, 0.16, 300, 120), 300);
        break;
      case 'purchase':
        playTwo('sine', 440, 660, 0.16, 250, 100);  // cash register feel
        break;
      case 'quest_progress':
        play('sine', 600, 0.14, 800, 200, { attack: 10 });  // rising pip
        break;
      case 'upgrade':
        playTwo('sine', 660, 880, 0.18, 350, 120);  // E5->A5 ascending confirmation
        setTimeout(() => {
          let su = this._getSfxSlot();
          if (su) { su.osc.setType('sine'); su.osc.freq(1047); su._vol = 0.16 * vol; su._peak = su._vol;
            su.gain.amp(0,0); su.gain.amp(su._vol, 0.01); this._sfxEnvSmooth(su, 1047, 1047, 300, { attack: 8 }); }
        }, 240);
        break;  // E5->A5->C6 ascending triad
      case 'hover':
        play('sine', 880, 0.06, 660, 40, { attack: 3 }); break;  // subtle high pip
      case 'step_grass':
        { let p20 = 1 + (random() - 0.5) * 0.4; play('triangle', 180 * p20, 0.05, 100 * p20, 65, { attack: 5 }); break; }  // soft rustle +/- 20%
      case 'step_water':
        { let p20 = 1 + (random() - 0.5) * 0.4; play('sine', 200 * p20, 0.08, 120 * p20, 90, { attack: 8 }); break; }  // light splash +/- 20%
      // New SFX: level up fanfare — triumphant 4-note ascending D major arpeggio
      case 'level_up':
        play('sine', 293.7, 0.22, 293.7, 200, { attack: 15 });  // D4
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('sine'); s2.osc.freq(440); s2._vol = 0.22 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.015); this._sfxEnvSmooth(s2, 440, 440, 200, {}); }
        }, 150);
        setTimeout(() => {
          let s3 = this._getSfxSlot();
          if (s3) { s3.osc.setType('sine'); s3.osc.freq(587.3); s3._vol = 0.24 * vol; s3._peak = s3._vol;
            s3.gain.amp(0,0); s3.gain.amp(s3._vol, 0.015); this._sfxEnvSmooth(s3, 587.3, 587.3, 200, {}); }
        }, 300);
        setTimeout(() => {
          let s4 = this._getSfxSlot();
          if (s4) { s4.osc.setType('sine'); s4.osc.freq(880); s4._vol = 0.26 * vol; s4._peak = s4._vol;
            s4.gain.amp(0,0); s4.gain.amp(s4._vol, 0.015); this._sfxEnvSmooth(s4, 880, 880, 400, {}); }
        }, 450);
        break;
      // Achievement unlock: bright sparkle arpeggio (fast ascending + shimmer)
      case 'achievement':
        play('sine', 880, 0.16, 880, 60, { attack: 3 });
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('sine'); s2.osc.freq(1047); s2._vol = 0.16 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.008); this._sfxEnvSmooth(s2, 1047, 1047, 60, { attack: 3 }); }
        }, 50);
        setTimeout(() => {
          let s3 = this._getSfxSlot();
          if (s3) { s3.osc.setType('sine'); s3.osc.freq(1319); s3._vol = 0.18 * vol; s3._peak = s3._vol;
            s3.gain.amp(0,0); s3.gain.amp(s3._vol, 0.008); this._sfxEnvSmooth(s3, 1319, 1319, 80, { attack: 3 }); }
        }, 100);
        setTimeout(() => {
          let s4 = this._getSfxSlot();
          if (s4) { s4.osc.setType('sine'); s4.osc.freq(1760); s4._vol = 0.14 * vol; s4._peak = s4._vol;
            s4.gain.amp(0,0); s4.gain.amp(s4._vol, 0.005); this._sfxEnvSmooth(s4, 1760, 1760, 350, { attack: 3 }); }
        }, 150);
        break;
      // Era transition: dramatic swell — low rumble rising to bright chord
      case 'era_transition':
        play('triangle', 110, 0.20, 220, 600, { attack: 200 });  // rising bass
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('sine'); s2.osc.freq(440); s2._vol = 0.22 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.15); this._sfxEnvSmooth(s2, 440, 440, 500, { attack: 150 }); }
        }, 200);
        setTimeout(() => {
          let s3 = this._getSfxSlot();
          if (s3) { s3.osc.setType('sine'); s3.osc.freq(587.3); s3._vol = 0.20 * vol; s3._peak = s3._vol;
            s3.gain.amp(0,0); s3.gain.amp(s3._vol, 0.12); this._sfxEnvSmooth(s3, 587.3, 587.3, 450, { attack: 120 }); }
        }, 350);
        setTimeout(() => {
          let s4 = this._getSfxSlot();
          if (s4) { s4.osc.setType('sine'); s4.osc.freq(880); s4._vol = 0.18 * vol; s4._peak = s4._vol;
            s4.gain.amp(0,0); s4.gain.amp(s4._vol, 0.10); this._sfxEnvSmooth(s4, 880, 880, 500, { attack: 100 }); }
        }, 500);
        break;
      // Crystal resonance: ethereal shimmer — two detuned high sines beating
      case 'crystal_resonance':
        play('sine', 1047, 0.14, 1047, 600, { attack: 30 });
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('sine'); s2.osc.freq(1052); s2._vol = 0.12 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.03); this._sfxEnvSmooth(s2, 1052, 1048, 600, { attack: 30 }); }
        }, 5);
        setTimeout(() => {
          let s3 = this._getSfxSlot();
          if (s3) { s3.osc.setType('sine'); s3.osc.freq(1568); s3._vol = 0.08 * vol; s3._peak = s3._vol;
            s3.gain.amp(0,0); s3.gain.amp(s3._vol, 0.05); this._sfxEnvSmooth(s3, 1568, 1575, 500, { attack: 50 }); }
        }, 100);
        break;
      // Legion march: rhythmic stomping — low thumps in march tempo
      case 'legion_march':
        play('triangle', 80, 0.22, 50, 100, { attack: 5 });  // STOMP
        setTimeout(() => {
          let s2 = this._getSfxSlot();
          if (s2) { s2.osc.setType('triangle'); s2.osc.freq(75); s2._vol = 0.18 * vol; s2._peak = s2._vol;
            s2.gain.amp(0,0); s2.gain.amp(s2._vol, 0.005); this._sfxEnvSmooth(s2, 75, 45, 90, { attack: 5 }); }
        }, 200);
        setTimeout(() => {
          let s3 = this._getSfxSlot();
          if (s3) { s3.osc.setType('triangle'); s3.osc.freq(80); s3._vol = 0.22 * vol; s3._peak = s3._vol;
            s3.gain.amp(0,0); s3.gain.amp(s3._vol, 0.005); this._sfxEnvSmooth(s3, 80, 50, 100, { attack: 5 }); }
        }, 400);
        setTimeout(() => {
          let s4 = this._getSfxSlot();
          if (s4) { s4.osc.setType('triangle'); s4.osc.freq(75); s4._vol = 0.18 * vol; s4._peak = s4._vol;
            s4.gain.amp(0,0); s4.gain.amp(s4._vol, 0.005); this._sfxEnvSmooth(s4, 75, 45, 90, { attack: 5 }); }
        }, 600);
        break;
      case 'visitor_arrive':
        playTwo('sine', 523, 659, 0.16, 300, 120);  // C5->E5 welcoming major third
        setTimeout(() => {
          let sv = this._getSfxSlot();
          if (sv) { sv.osc.setType('sine'); sv.osc.freq(784); sv._vol = 0.14 * vol; sv._peak = sv._vol;
            sv.gain.amp(0,0); sv.gain.amp(sv._vol, 0.01); this._sfxEnvSmooth(sv, 784, 784, 350, { attack: 10 }); }
        }, 220);
        break;
      case 'crystal_charge':
        play('sine', 880, 0.16, 1320, 400, { attack: 30 });  // rising shimmer
        setTimeout(() => {
          let sc = this._getSfxSlot();
          if (sc) { sc.osc.setType('sine'); sc.osc.freq(885); sc._vol = 0.12 * vol; sc._peak = sc._vol;
            sc.gain.amp(0,0); sc.gain.amp(sc._vol, 0.03); this._sfxEnvSmooth(sc, 885, 1325, 400, { attack: 30 }); }
        }, 5);
        break;
      // NPC interaction sounds
      case 'dialogue_open':
        play('sine', 440, 0.10, 494, 180, { attack: 20 }); break;  // gentle rising tone (A4->B4)
      case 'gift_accepted':
        playTwo('sine', 440, 554, 0.16, 280, 100);  // warm ascending A4->C#5
        setTimeout(() => {
          let sg = this._getSfxSlot();
          if (sg) { sg.osc.setType('sine'); sg.osc.freq(659); sg._vol = 0.14 * vol; sg._peak = sg._vol;
            sg.gain.amp(0,0); sg.gain.amp(sg._vol, 0.01); this._sfxEnvSmooth(sg, 659, 659, 300, { attack: 10 }); }
        }, 200);
        break;  // A4->C#5->E5 warm major triad
      case 'favor_up':
        play('sine', 784, 0.14, 784, 100, { attack: 8 });  // satisfying chime G5
        setTimeout(() => {
          let sf = this._getSfxSlot();
          if (sf) { sf.osc.setType('sine'); sf.osc.freq(988); sf._vol = 0.14 * vol; sf._peak = sf._vol;
            sf.gain.amp(0,0); sf.gain.amp(sf._vol, 0.008); this._sfxEnvSmooth(sf, 988, 988, 120, { attack: 5 }); }
        }, 80);
        setTimeout(() => {
          let sf2 = this._getSfxSlot();
          if (sf2) { sf2.osc.setType('sine'); sf2.osc.freq(1175); sf2._vol = 0.12 * vol; sf2._peak = sf2._vol;
            sf2.gain.amp(0,0); sf2.gain.amp(sf2._vol, 0.008); this._sfxEnvSmooth(sf2, 1175, 1175, 300, { attack: 8 }); }
        }, 160);
        break;  // G5->B5->D6 bright ascending chime
    }
  }

  // ─── SFX envelope: smooth exponential decay + gentle freq glide ───
  _sfxEnvSmooth(slot, startFreq, endFreq, durMs, opts) {
    slot.busy = true;
    let peak = slot._peak || slot._vol || 0.1;
    let steps = max(1, floor(durMs / 18));
    let step = 0;
    let attackSteps = max(1, floor((opts.attack || 20) / 18));
    let tick = () => {
      step++;
      let t = step / steps;
      try {
        // Smooth frequency glide (ease-out)
        let ft = 1 - Math.pow(1 - t, 2);
        slot.osc.freq(lerp(startFreq, endFreq, ft));
        // Exponential decay after attack phase
        let vol;
        if (step <= attackSteps) {
          vol = peak * (step / attackSteps);  // ramp up
        } else {
          let decay = (step - attackSteps) / (steps - attackSteps);
          vol = peak * Math.pow(1 - decay, 2.5);  // exponential fade
        }
        slot._vol = max(0, vol);
        slot.gain.amp(slot._vol, 0.018);
      } catch(e) {}
      if (step < steps) {
        setTimeout(tick, 18);
      } else {
        slot.gain.amp(0, 0.04);  // gentle final fade
        slot.busy = false;
      }
    };
    setTimeout(tick, 18);
  }

  _getSfxSlot() {
    // Find a free slot, or steal the oldest
    for (let i = 0; i < this._sfxPool.length; i++) {
      let idx = (this._sfxIdx + i) % this._sfxPool.length;
      if (!this._sfxPool[idx].busy) {
        this._sfxIdx = (idx + 1) % this._sfxPool.length;
        return this._sfxPool[idx];
      }
    }
    // All busy, steal next
    let s = this._sfxPool[this._sfxIdx];
    s.gain.amp(0, 0.005);
    s.busy = false;
    this._sfxIdx = (this._sfxIdx + 1) % this._sfxPool.length;
    return s;
  }

  // ─── VOLUME ───
  setVolume(type, val) {
    this.vol[type] = constrain(val, 0, 1);
    this._saveVolume();
  }

  _saveVolume() {
    try { localStorage.setItem('sunlitIsles_sound', JSON.stringify(this.vol)); } catch(e) {}
  }

  _loadVolume() {
    try {
      let d = localStorage.getItem('sunlitIsles_sound');
      if (d) {
        let v = JSON.parse(d);
        if (v.master !== undefined) this.vol.master = v.master;
        if (v.sfx !== undefined) this.vol.sfx = v.sfx;
        if (v.ambient !== undefined) this.vol.ambient = v.ambient;
        if (v.music !== undefined) this.vol.music = v.music;
      }
    } catch(e) {}
    // Safety: if master is 0 or any essential channel is 0, reset
    if (this.vol.master <= 0.01 || (this.vol.sfx <= 0 && this.vol.music <= 0 && this.vol.ambient <= 0)) {
      this.vol = { master: 0.5, sfx: 0.7, ambient: 0.5, music: 0.4 };
      this._saveVolume();
    }
  }

  // Resume AudioContext on user gesture (required by browsers)
  resume() {
    try {
      if (typeof getAudioContext === 'function') {
        let ctx = getAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            console.log('[Sound] AudioContext resumed');
            if (!this.ready) this.init();
          });
        }
      }
      if (!this.ready) this.init();
    } catch(e) {
      console.warn('[Sound] resume error:', e.message);
    }
  }
}
