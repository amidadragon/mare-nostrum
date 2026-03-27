// ═══════════════════════════════════════════════════════════════
// SOUND MANAGER — Procedural audio for Mare Nostrum
// Extracted from sketch.js for maintainability
// ═══════════════════════════════════════════════════════════════

let snd = null; // global SoundManager instance

// ═══════════════════════════════════════════════════════════════
// AMBIENT MANAGER — Rich layered soundscapes via Web Audio API
// ═══════════════════════════════════════════════════════════════
class AmbientManager {
  constructor(ctx, sndMgr) {
    this.ctx = ctx;
    this.snd = sndMgr;
    this._t = 0; // internal time accumulator

    // Master ambient gain
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Underwater low-pass on master (bypassed when not diving)
    this._uwFilter = ctx.createBiquadFilter();
    this._uwFilter.type = 'lowpass';
    this._uwFilter.frequency.value = 20000; // fully open by default
    this._uwFilter.Q.value = 0.5;
    this._uwFilter.connect(this.master);

    // --- OCEAN WAVES ---
    this._oceanGain = ctx.createGain();
    this._oceanGain.gain.value = 0;
    this._oceanGain.connect(this._uwFilter);
    // Layer 1: brown noise through low-pass for deep wave body
    this._oceanBody = this._makeLoopNoise('brown', 4);
    this._oceanBodyFilter = ctx.createBiquadFilter();
    this._oceanBodyFilter.type = 'lowpass';
    this._oceanBodyFilter.frequency.value = 400;
    this._oceanBodyFilter.Q.value = 0.7;
    this._oceanBody.connect(this._oceanBodyFilter);
    this._oceanBodyFilter.connect(this._oceanGain);
    // Layer 2: white noise through bandpass for foam hiss
    this._oceanFoam = this._makeLoopNoise('white', 4);
    this._oceanFoamFilter = ctx.createBiquadFilter();
    this._oceanFoamFilter.type = 'bandpass';
    this._oceanFoamFilter.frequency.value = 2000;
    this._oceanFoamFilter.Q.value = 1.5;
    this._oceanFoamGain = ctx.createGain();
    this._oceanFoamGain.gain.value = 0.4;
    this._oceanFoam.connect(this._oceanFoamFilter);
    this._oceanFoamFilter.connect(this._oceanFoamGain);
    this._oceanFoamGain.connect(this._oceanGain);
    // Layer 3: brown noise through bandpass for mid-frequency wash
    this._oceanMid = this._makeLoopNoise('brown', 4);
    this._oceanMidFilter = ctx.createBiquadFilter();
    this._oceanMidFilter.type = 'bandpass';
    this._oceanMidFilter.frequency.value = 600;
    this._oceanMidFilter.Q.value = 0.8;
    this._oceanMidGain = ctx.createGain();
    this._oceanMidGain.gain.value = 0.3;
    this._oceanMid.connect(this._oceanMidFilter);
    this._oceanMidFilter.connect(this._oceanMidGain);
    this._oceanMidGain.connect(this._oceanGain);

    // --- WIND ---
    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0;
    this._windGain.connect(this._uwFilter);
    // Layer 1: white noise through bandpass
    this._windMain = this._makeLoopNoise('white', 3);
    this._windMainFilter = ctx.createBiquadFilter();
    this._windMainFilter.type = 'bandpass';
    this._windMainFilter.frequency.value = 800;
    this._windMainFilter.Q.value = 2;
    this._windMain.connect(this._windMainFilter);
    this._windMainFilter.connect(this._windGain);
    // Layer 2: brown noise for low rumble
    this._windLow = this._makeLoopNoise('brown', 3);
    this._windLowFilter = ctx.createBiquadFilter();
    this._windLowFilter.type = 'lowpass';
    this._windLowFilter.frequency.value = 200;
    this._windLowFilter.Q.value = 1;
    this._windLowGain = ctx.createGain();
    this._windLowGain.gain.value = 0.5;
    this._windLow.connect(this._windLowFilter);
    this._windLowFilter.connect(this._windLowGain);
    this._windLowGain.connect(this._windGain);
    // Wind gust state
    this._gustTimer = 0;
    this._gustActive = false;

    // --- RAIN ---
    this._rainGain = ctx.createGain();
    this._rainGain.gain.value = 0;
    this._rainGain.connect(this._uwFilter);
    // Light rain: white noise through bandpass at 4kHz
    this._rainLight = this._makeLoopNoise('white', 3);
    this._rainLightFilter = ctx.createBiquadFilter();
    this._rainLightFilter.type = 'bandpass';
    this._rainLightFilter.frequency.value = 4000;
    this._rainLightFilter.Q.value = 0.8;
    this._rainLight.connect(this._rainLightFilter);
    this._rainLightFilter.connect(this._rainGain);
    // Heavy rain: brown noise through lowpass
    this._rainHeavy = this._makeLoopNoise('brown', 3);
    this._rainHeavyFilter = ctx.createBiquadFilter();
    this._rainHeavyFilter.type = 'lowpass';
    this._rainHeavyFilter.frequency.value = 800;
    this._rainHeavyFilter.Q.value = 1;
    this._rainHeavyGain = ctx.createGain();
    this._rainHeavyGain.gain.value = 0;
    this._rainHeavy.connect(this._rainHeavyFilter);
    this._rainHeavyFilter.connect(this._rainHeavyGain);
    this._rainHeavyGain.connect(this._rainGain);
    // Raindrop tick timer
    this._dropTimer = 0;

    // --- FIRE ---
    this._fireGain = ctx.createGain();
    this._fireGain.gain.value = 0;
    this._fireGain.connect(this._uwFilter);
    this._fireTimer = 0;
    this._fireActive = false;

    // --- BIRDS ---
    this._birdTimers = [
      { timer: 120 + Math.random() * 300, baseFreq: 1800, range: 1200 }, // voice 1: 1800-3000Hz
      { timer: 200 + Math.random() * 400, baseFreq: 2200, range: 800 },  // voice 2: 2200-3000Hz
      { timer: 300 + Math.random() * 500, baseFreq: 1200, range: 600 },  // voice 3: lower warbler 1200-1800Hz
    ];

    // --- CRICKETS ---
    this._cricketTimers = [];
    for (let i = 0; i < 4; i++) {
      this._cricketTimers.push({
        timer: 30 + Math.random() * 90,
        baseFreq: 2500 + i * 200 + Math.random() * 150,
        active: false
      });
    }

    // --- UNDERWATER ---
    this._uwGain = ctx.createGain();
    this._uwGain.gain.value = 0;
    this._uwGain.connect(this.master); // bypass uwFilter for UW sounds
    // Deep rumble: heavy low-pass brown noise
    this._uwRumble = this._makeLoopNoise('brown', 4);
    this._uwRumbleFilter = ctx.createBiquadFilter();
    this._uwRumbleFilter.type = 'lowpass';
    this._uwRumbleFilter.frequency.value = 300;
    this._uwRumbleFilter.Q.value = 1;
    this._uwRumble.connect(this._uwRumbleFilter);
    this._uwRumbleFilter.connect(this._uwGain);
    // Bubble timer
    this._bubbleTimer = 0;

    // --- CROWD MURMUR (city bustle for populated islands) ---
    this._crowdGain = ctx.createGain();
    this._crowdGain.gain.value = 0;
    this._crowdGain.connect(this._uwFilter);
    // Brown noise through bandpass for voice-like murmur
    this._crowdNoise = this._makeLoopNoise('brown', 4);
    this._crowdFilter = ctx.createBiquadFilter();
    this._crowdFilter.type = 'bandpass';
    this._crowdFilter.frequency.value = 800;
    this._crowdFilter.Q.value = 1.2;
    this._crowdNoise.connect(this._crowdFilter);
    this._crowdFilter.connect(this._crowdGain);
    // Second layer: higher pitched murmur
    this._crowdHigh = this._makeLoopNoise('white', 3);
    this._crowdHighFilter = ctx.createBiquadFilter();
    this._crowdHighFilter.type = 'bandpass';
    this._crowdHighFilter.frequency.value = 1800;
    this._crowdHighFilter.Q.value = 2;
    this._crowdHighGain = ctx.createGain();
    this._crowdHighGain.gain.value = 0.15;
    this._crowdHigh.connect(this._crowdHighFilter);
    this._crowdHighFilter.connect(this._crowdHighGain);
    this._crowdHighGain.connect(this._crowdGain);

    // --- ISLAND SPECIFIC (old islands removed) ---

    // Shore lap phase
    this._shorePhase = 0;
  }

  // Create looping noise buffer source
  _makeLoopNoise(type, duration) {
    let sr = this.ctx.sampleRate;
    let len = Math.floor(sr * duration);
    let buf = this.ctx.createBuffer(1, len, sr);
    let data = buf.getChannelData(0);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        let white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    } else {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    let src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    return src;
  }

  // Fire a short noise burst (for rain ticks, fire crackle, etc.)
  // Cached noise buffers to avoid per-call allocation
  _getCachedNoiseBuf(type, duration) {
    if (!this._noiseCache) this._noiseCache = {};
    let key = type + '_' + duration;
    if (this._noiseCache[key]) return this._noiseCache[key];
    let sr = this.ctx.sampleRate;
    let len = Math.floor(sr * (duration + 0.02));
    let buf = this.ctx.createBuffer(1, len, sr);
    let data = buf.getChannelData(0);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) { let w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; }
    } else {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    this._noiseCache[key] = buf;
    return buf;
  }
  _noiseBurst(opts) {
    let ctx = this.ctx;
    let o = Object.assign({
      type: 'white', filterType: 'highpass', freq: 2000, Q: 1,
      volume: 0.03, duration: 0.01, attack: 0.001, dest: this._uwFilter
    }, opts);
    let buf = this._getCachedNoiseBuf(o.type, o.duration);
    let src = ctx.createBufferSource();
    src.buffer = buf;
    let filter = ctx.createBiquadFilter();
    filter.type = o.filterType;
    filter.frequency.value = o.freq;
    filter.Q.value = o.Q;
    let gain = ctx.createGain();
    let t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(o.volume, t + o.attack);
    gain.gain.linearRampToValueAtTime(0, t + o.duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(o.dest);
    src.start(t);
    src.stop(t + o.duration + 0.02);
    src.onended = () => { try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch(_e){} };
  }

  // Fire a short tone (for bird chirps, cricket chirps, bubbles)
  _toneBurst(opts) {
    // Disabled — real CC0 ambient samples handle birds/crickets now
    return;
    let ctx = this.ctx;
    let o = Object.assign({
      type: 'sine', freq: 1000, freqEnd: null, volume: 0.05,
      duration: 0.05, attack: 0.003, dest: this._uwFilter
    }, opts);
    let osc = ctx.createOscillator();
    osc.type = o.type;
    let t = ctx.currentTime;
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t + o.duration);
    let gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(o.volume, t + o.attack);
    let decayStart = t + o.duration * 0.6;
    gain.gain.setValueAtTime(o.volume * 0.8, decayStart);
    gain.gain.exponentialRampToValueAtTime(0.001, t + o.duration);
    osc.connect(gain);
    gain.connect(o.dest);
    osc.start(t);
    osc.stop(t + o.duration + 0.01);
  }

  // Smooth parameter ramp
  _ramp(param, target, time) {
    let t = this.ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + time);
  }

  update(p) {
    let { masterVol, bright, island, diving, isRain, isStorm, weatherIntensity, hour, px, py } = p;
    let dt = 1 / 60; // assume ~60fps
    this._t += dt;

    // Master volume
    this._ramp(this.master.gain, masterVol, 0.1);

    // --- UNDERWATER MUFFLING ---
    let uwCutoff = diving ? 300 : 20000;
    this._ramp(this._uwFilter.frequency, uwCutoff, diving ? 0.5 : 0.3);

    // --- OCEAN WAVES ---
    let waveMute = (island === 'hyperborea' || island === 'necropolis');
    let waveBase = waveMute ? 0 : (0.12 + (1 - bright) * 0.06);
    if (diving) waveBase = 0.04;
    this._ramp(this._oceanGain.gain, waveBase, 0.5);
    // Slow LFO on body filter cutoff (0.1Hz) for wave whoosh
    let bodyLFO = 400 + Math.sin(this._t * 0.1 * Math.PI * 2) * 200;
    this._oceanBodyFilter.frequency.value = Math.max(100, bodyLFO);
    // Faster LFO on foam filter (0.3Hz) for hiss variation
    let foamLFO = 2000 + Math.sin(this._t * 0.3 * Math.PI * 2) * 800;
    this._oceanFoamFilter.frequency.value = foamLFO;
    // Slow volume modulation (0.08Hz) for wave rise and fall
    let waveEnv = 0.6 + Math.sin(this._t * 0.08 * Math.PI * 2) * 0.4;
    this._oceanFoamGain.gain.value = 0.25 * waveEnv;
    this._oceanMidGain.gain.value = 0.2 * (1 - waveEnv * 0.3);
    // Second wave cycle offset for organic layering
    let waveEnv2 = 0.5 + Math.sin(this._t * 0.06 * Math.PI * 2 + 1.5) * 0.5;
    this._oceanMidFilter.frequency.value = 400 + waveEnv2 * 300;

    // --- WIND ---
    let windTarget = 0.02; // gentle breeze default
    if (isStorm) windTarget = 0.15;
    else if (isRain) windTarget = 0.06 + weatherIntensity * 0.05;
    if (island === 'hyperborea') windTarget = Math.max(windTarget, 0.08);
    if (diving) windTarget *= 0.15;
    this._ramp(this._windGain.gain, windTarget, 0.8);
    // Slow random cutoff modulation
    let windCutoff = 800 + Math.sin(this._t * 0.15 * Math.PI * 2) * 300 + Math.sin(this._t * 0.07 * Math.PI * 2) * 150;
    if (isStorm) windCutoff = 400 + Math.sin(this._t * 0.2 * Math.PI * 2) * 150;
    this._windMainFilter.frequency.value = windCutoff;
    this._windLowFilter.frequency.value = 150 + Math.sin(this._t * 0.05 * Math.PI * 2) * 80;
    // Occasional gusts
    this._gustTimer -= dt;
    if (!this._gustActive && this._gustTimer <= 0 && (isRain || isStorm || Math.random() < 0.001)) {
      this._gustActive = true;
      this._gustTimer = 0.5 + Math.random() * 1.5; // gust duration
      let gustVol = windTarget * (1.5 + Math.random());
      this._ramp(this._windGain.gain, Math.min(0.25, gustVol), 0.15);
      this._windMainFilter.frequency.value = windCutoff + 400;
    } else if (this._gustActive && this._gustTimer <= 0) {
      this._gustActive = false;
      this._gustTimer = 5 + Math.random() * 15; // time until next gust
      if (isStorm) this._gustTimer = 2 + Math.random() * 6;
    }

    // --- RAIN ---
    let rainTarget = 0;
    if (isRain || isStorm) {
      rainTarget = isStorm ? 0.10 : (0.04 + weatherIntensity * 0.04);
      if (diving) rainTarget *= 0.15;
    }
    this._ramp(this._rainGain.gain, rainTarget, 1.0);
    // Heavy rain layer scales with intensity
    let heavyTarget = isStorm ? 0.6 : (weatherIntensity > 0.5 ? (weatherIntensity - 0.5) * 1.2 : 0);
    this._ramp(this._rainHeavyGain.gain, heavyTarget, 0.5);
    // Modulate light rain filter
    if (isRain || isStorm) {
      this._rainLightFilter.frequency.value = 3500 + Math.sin(this._t * 0.4 * Math.PI * 2) * 1000;
    }
    // Individual raindrop ticks
    if ((isRain || isStorm) && !diving) {
      this._dropTimer -= dt;
      if (this._dropTimer <= 0) {
        let intensity = isStorm ? 0.8 : weatherIntensity;
        this._dropTimer = 0.02 + Math.random() * (0.15 - intensity * 0.12);
        this._noiseBurst({
          type: 'white', filterType: 'bandpass',
          freq: 2000 + Math.random() * 2500, Q: 2,
          volume: (0.008 + Math.random() * 0.015) * masterVol,
          duration: 0.005, attack: 0.001, dest: this._uwFilter
        });
      }
    }

    // --- CROWD MURMUR (scales with city level) ---
    let crowdTarget = 0;
    if (island === 'home' && !diving && typeof state !== 'undefined' && state.islandLevel) {
      let lvl = state.islandLevel;
      if (lvl >= 5) {
        // Fade in from level 5, full at level 20
        crowdTarget = Math.min(0.08, (lvl - 4) * 0.005) * masterVol;
        // Louder during day, quieter at night
        if (bright < 0.3) crowdTarget *= 0.2;
        else if (bright < 0.5) crowdTarget *= 0.5;
        // Slow undulation for organic feel
        let crowdLFO = 0.7 + Math.sin(this._t * 0.05 * Math.PI * 2) * 0.3;
        crowdTarget *= crowdLFO;
      }
    } else if (island === 'nation' && !diving) {
      // Nation capitals always have some crowd bustle
      crowdTarget = 0.04 * masterVol;
      if (bright < 0.3) crowdTarget *= 0.3;
    }
    this._ramp(this._crowdGain.gain, crowdTarget, 1.5);
    // Slowly shift crowd filter for variety
    this._crowdFilter.frequency.value = 700 + Math.sin(this._t * 0.03 * Math.PI * 2) * 200;

    // --- BIRDS ---
    let birdMute = (island === 'necropolis' || diving || hour < 6 || hour > 18);
    // Louder at dawn/dusk, quieter at noon
    let birdVolumeScale = 1.0;
    if (hour >= 6 && hour < 8) birdVolumeScale = 1.5; // dawn chorus
    else if (hour >= 16 && hour < 18) birdVolumeScale = 1.3; // dusk chorus
    else if (hour >= 11 && hour < 14) birdVolumeScale = 0.5; // quiet noon
    if (island === 'plenty') birdVolumeScale *= 1.5;
    if (island === 'vulcan') birdVolumeScale *= 0.4;

    // Skip procedural bird chirps if real ambient bird samples are loaded
    if (!birdMute && !(this.sm && this.sm._samples && this.sm._samples.birds)) {
      for (let i = 0; i < this._birdTimers.length; i++) {
        let b = this._birdTimers[i];
        b.timer -= dt * 60;
        if (b.timer <= 0) {
          b.timer = 120 + Math.random() * 480; // 2-8 seconds
          if (island === 'plenty') b.timer *= 0.4;
          let freq = b.baseFreq + Math.random() * b.range;
          let vol = (0.008 + Math.random() * 0.015) * masterVol * birdVolumeScale;
          // Chirp: rapid frequency sweep
          let chirpDur = 0.05 + Math.random() * 0.05;
          this._toneBurst({ freq: freq, freqEnd: freq * (0.7 + Math.random() * 0.6), volume: vol, duration: chirpDur, attack: 0.003 });
          // Double chirp 50% of the time
          if (Math.random() < 0.5) {
            let delay = chirpDur + 0.02 + Math.random() * 0.04;
            let f2 = freq * (0.85 + Math.random() * 0.3);
            setTimeout(() => {
              this._toneBurst({ freq: f2, freqEnd: f2 * (0.75 + Math.random() * 0.5), volume: vol * 0.7, duration: chirpDur * 0.8, attack: 0.003 });
            }, delay * 1000);
          }
          // Triple chirp for dawn chorus (30% chance)
          if (birdVolumeScale > 1.2 && Math.random() < 0.3) {
            let delay2 = chirpDur * 2 + 0.06 + Math.random() * 0.05;
            let f3 = freq * (0.9 + Math.random() * 0.2);
            setTimeout(() => {
              this._toneBurst({ freq: f3, freqEnd: f3 * (0.8 + Math.random() * 0.4), volume: vol * 0.5, duration: chirpDur * 0.6, attack: 0.003 });
            }, delay2 * 1000);
          }
        }
      }
    }

    // --- CRICKETS (skip if real samples loaded) ---
    let cricketActive = !diving && (hour >= 20 || hour < 5);
    if (cricketActive && !(this.sm && this.sm._samples && this.sm._samples.crickets)) {
      for (let i = 0; i < this._cricketTimers.length; i++) {
        let c = this._cricketTimers[i];
        c.timer -= dt * 60;
        if (c.timer <= 0) {
          c.timer = 30 + Math.random() * 120; // 0.5-2s between chirps
          let freq = c.baseFreq + (Math.random() - 0.5) * 300;
          let vol = (0.006 + Math.random() * 0.01) * masterVol;
          // Cricket chirp: rapid on/off oscillation
          let burstCount = 2 + Math.floor(Math.random() * 4);
          let burstGap = 0.025 + Math.random() * 0.015;
          for (let j = 0; j < burstCount; j++) {
            let delay = j * burstGap;
            setTimeout(() => {
              this._toneBurst({
                freq: freq + (Math.random() - 0.5) * 50,
                volume: vol * (1 - j * 0.1),
                duration: 0.012 + Math.random() * 0.008,
                attack: 0.001
              });
            }, delay * 1000);
          }
        }
      }
    }

    // --- FIRE CRACKLING ---
    let nearFire = false;
    if (typeof state !== 'undefined' && state.buildings && !diving) {
      for (let i = 0; i < state.buildings.length; i++) {
        let b = state.buildings[i];
        if ((b.type === 'campfire' || b.type === 'hearth' || b.type === 'firepit' ||
             b.type === 'bakery' || b.type === 'castrum') &&
            Math.sqrt((px - b.x) ** 2 + (py - b.y) ** 2) < 120) {
          nearFire = true; break;
        }
      }
    }
    let fireTarget = nearFire ? 0.08 : 0;
    this._ramp(this._fireGain.gain, fireTarget, nearFire ? 0.3 : 0.5);
    if (nearFire) {
      this._fireTimer -= dt;
      if (this._fireTimer <= 0) {
        this._fireTimer = 0.05 + Math.random() * 0.15; // 50-200ms gaps
        // Random noise burst for crackle
        this._noiseBurst({
          type: 'white', filterType: 'highpass',
          freq: 1500 + Math.random() * 2000, Q: 1 + Math.random() * 1.5,
          volume: (0.02 + Math.random() * 0.03) * masterVol,
          duration: 0.01 + Math.random() * 0.02, attack: 0.001,
          dest: this._fireGain
        });
        // Occasional low pop
        if (Math.random() < 0.3) {
          this._toneBurst({
            freq: 100 + Math.random() * 200, volume: (0.02 + Math.random() * 0.03) * masterVol,
            duration: 0.015 + Math.random() * 0.01, attack: 0.002,
            dest: this._fireGain
          });
        }
      }
    }

    // --- UNDERWATER ---
    let uwTarget = diving ? 0.12 : 0;
    this._ramp(this._uwGain.gain, uwTarget, 0.5);
    this._uwRumbleFilter.frequency.value = 200 + Math.sin(this._t * 0.08 * Math.PI * 2) * 100;
    // Slow bubbling
    if (diving) {
      this._bubbleTimer -= dt;
      if (this._bubbleTimer <= 0) {
        this._bubbleTimer = 0.5 + Math.random() * 3;
        let bFreq = 400 + Math.random() * 400;
        this._toneBurst({
          freq: bFreq, freqEnd: bFreq * 1.3,
          volume: (0.02 + Math.random() * 0.03) * masterVol,
          duration: 0.03 + Math.random() * 0.04, attack: 0.002,
          dest: this._uwGain
        });
        // Second bubble
        if (Math.random() < 0.4) {
          setTimeout(() => {
            this._toneBurst({
              freq: bFreq * (1.1 + Math.random() * 0.3),
              freqEnd: bFreq * 1.5, volume: (0.01 + Math.random() * 0.02) * masterVol,
              duration: 0.02 + Math.random() * 0.03, attack: 0.002,
              dest: this._uwGain
            });
          }, (0.05 + Math.random() * 0.15) * 1000);
        }
      }
    }

    // --- ISLAND SPECIFIC AMBIENCE (old islands removed) ---

    // --- SHORE LAP ---
    if (island === 'home' && !diving) {
      let srx = typeof getSurfaceRX === 'function' ? getSurfaceRX() : 450;
      let sry = typeof getSurfaceRY === 'function' ? getSurfaceRY() : 144;
      let cx = typeof WORLD !== 'undefined' ? WORLD.islandCX : 600;
      let cy = typeof WORLD !== 'undefined' ? WORLD.islandCY : 400;
      let dx = (px - cx) / srx;
      let dy = (py - cy) / sry;
      let edgeDist = Math.sqrt(dx * dx + dy * dy);
      if (edgeDist > 0.80 && edgeDist < 1.1) {
        this._shorePhase += dt * (0.35 + Math.sin(this._t * 0.04) * 0.05);
        let swell = Math.pow(Math.max(0, Math.sin(this._shorePhase * Math.PI * 2)), 2.5);
        let proxFactor = 1.0 - Math.abs(edgeDist - 0.95) * 5;
        proxFactor = Math.max(0, Math.min(1, proxFactor));
        // Use a noise burst for the lap sound during swell peaks
        if (swell > 0.8 && Math.random() < 0.03) {
          this._noiseBurst({
            type: 'brown', filterType: 'bandpass',
            freq: 250 + swell * 120, Q: 1.5,
            volume: swell * proxFactor * 0.04 * masterVol,
            duration: 0.2 + Math.random() * 0.15, attack: 0.05,
            dest: this._uwFilter
          });
        }
      }
    }
  }
}

class SoundManager {
  constructor() {
    this.ready = false;
    this.vol = { master: 0.5, sfx: 0.7, ambient: 0.5, music: 0.4 };
    this._loadVolume();
    // Real audio samples (CC0)
    this._samples = {};
    this._sampleLoops = {}; // currently playing ambient loops
    this._samplesLoaded = false;
    // Ambient system (Web Audio API based)
    this._amb = null; // AmbientManager instance
    // Dawn/dusk transition tracking
    this._lastTimeSlot = null;
    // SFX oscillator pool (6 reusable)
    this._sfxPool = [];
    this._sfxIdx = 0;
    // Throttle: prevent same SFX from spamming
    this._lastPlay = {};
    this._minInterval = 80;
    // Lyre music system
    this._lyreVoices = [];
    this._lyreGains = [];
    this._lyreActive = false;
    this._lyreNoteIdx = 0;
    this._lyreTimer = 0;
    this._lyrePhrase = 0;
    this._lyreMode = 'peaceful';
    // Island-specific ambient state
    this._islandAmbient = 'home';
    // Diving underwater state
    this._divingActive = false;
    // Storm ambient
    this._thunderTimer = 0;
    // Bass drone oscillator (foundation for harmony)
    this._droneOsc = null;
    this._droneGain = null;
    this._droneTarget = 0;
    this._droneRootFreq = 146.8; // Current drone root, follows chord changes
    // Rhythmic pulse oscillator (subtle heartbeat underneath music)
    this._pulseOsc = null;
    this._pulseGain = null;
    this._pulseTimer = 0;
    // Mode crossfade
    this._lyreVolMult = 1.0;
    this._lyreFadeDir = 0;
    this._lyrePendingMode = null;
    // Dynamic context
    this._lyreContext = 'default';
    // Harmony layer
    this._harmOsc = null;
    this._harmGain = null;
    // Context tempo multiplier
    this._tempoMult = 1.0;
    // Seagull ambient timer
    this._seagullTimer = 0;
    // Recorded music system
    this._musicTrack = null; // currently playing music key
    this._musicFadingOut = null; // track being faded out
    this._musicFadeIn = 1; // 0→1 fade-in progress for current track
    this._musicFadeOut = 0; // 1→0 fade-out progress for old track
    this._musicPlayTime = 0; // frames of continuous music playback
    this._musicVolFade = 1.0; // gradual volume reduction after extended play
  }

  init() {
    try {
      // Initialize Web Audio API ambient system
      try {
        let ctx = this._getAudioCtx();
        if (ctx && typeof AmbientManager !== 'undefined') {
          this._amb = new AmbientManager(ctx, this);
        }
      } catch(_ambErr) { /* ambient not ready yet */ }

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

      // Harmony layer: sine oscillator that doubles melody at an interval
      this._harmOsc = new p5.Oscillator('sine');
      this._harmGain = new p5.Gain();
      this._harmOsc.disconnect();
      this._harmOsc.connect(this._harmGain);
      this._harmGain.connect();
      this._harmGain.amp(0);
      this._harmOsc.start();
      this._harmOsc.amp(1.0);

      this.ready = true;
      this.loadSamples();
      // SoundManager init OK
    } catch (e) {
      console.warn('SoundManager init failed:', e.message);
    }
  }

  // ─── LOAD REAL AUDIO SAMPLES (CC0) ───
  loadSamples() {
    if (this._samplesLoading) return;
    this._samplesLoading = true;
    const files = {
      // Ambient loops
      ocean: 'sounds/ambient_ocean.flac',
      birds: 'sounds/ambient_birds.mp3',
      wind: 'sounds/ambient_wind.wav',
      rain: 'sounds/ambient_rain.ogg',
      fire: 'sounds/ambient_fire.ogg',
      crickets: 'sounds/ambient_crickets.mp3',
      battle: 'sounds/ambient_battle.ogg',
      cave: 'sounds/ambient_cave.ogg',
      dawn: 'sounds/ambient_dawn.ogg',
      dusk: 'sounds/ambient_dusk.mp3',
      forest: 'sounds/ambient_forest.mp3',
      ice: 'sounds/ambient_ice.ogg',
      lava: 'sounds/ambient_lava.ogg',
      market: 'sounds/ambient_market.mp3',
      night: 'sounds/ambient_night.ogg',
      ocean_deep: 'sounds/ambient_ocean_deep.ogg',
      sailing: 'sounds/ambient_sailing.ogg',
      spooky: 'sounds/ambient_spooky.mp3',
      storm: 'sounds/ambient_storm.mp3',
      tavern: 'sounds/ambient_tavern.mp3',
      thunder_distant: 'sounds/ambient_thunder_distant.mp3',
      tropical: 'sounds/ambient_tropical.ogg',
      underwater: 'sounds/ambient_underwater.ogg',
      // SFX
      achievement: 'sounds/sfx_achievement.ogg',
      anchor: 'sounds/sfx_anchor.ogg',
      anvil: 'sounds/sfx_anvil.ogg',
      armor_hit: 'sounds/sfx_armor_hit.wav',
      arrow_hit: 'sounds/sfx_arrow_hit.ogg',
      arrow_shoot: 'sounds/sfx_arrow_shoot.ogg',
      battle_cry: 'sounds/sfx_battle_cry.ogg',
      bird_chirp: 'sounds/sfx_bird_chirp.mp3',
      bird_single: 'sounds/sfx_bird_single.ogg',
      bobber_plop: 'sounds/sfx_bobber_plop.ogg',
      bubbles_loop: 'sounds/sfx_bubbles_loop.wav',
      bubbles_single: 'sounds/sfx_bubbles_single.wav',
      buff: 'sounds/sfx_buff.ogg',
      build: 'sounds/sfx_build.ogg',
      cast_line: 'sounds/sfx_cast_line.ogg',
      cat_meow: 'sounds/sfx_cat_meow.ogg',
      cat_purr: 'sounds/sfx_cat_purr.wav',
      chicken: 'sounds/sfx_chicken.wav',
      click: 'sounds/sfx_click.ogg',
      close_menu: 'sounds/sfx_close_menu.ogg',
      coin: 'sounds/sfx_coin.wav',
      craft_complete: 'sounds/sfx_craft_complete.ogg',
      cricket_single: 'sounds/sfx_cricket_single.wav',
      crop_grow: 'sounds/sfx_crop_grow.ogg',
      crow: 'sounds/sfx_crow.wav',
      crystal_charge: 'sounds/sfx_crystal_charge.ogg',
      crystal_collect: 'sounds/sfx_crystal_collect.ogg',
      death_enemy: 'sounds/sfx_death_enemy.ogg',
      dig: 'sounds/sfx_dig.ogg',
      dodge: 'sounds/sfx_dodge.ogg',
      door_close: 'sounds/sfx_door_close.ogg',
      door_open: 'sounds/sfx_door_open.ogg',
      enchant: 'sounds/sfx_enchant.ogg',
      equip: 'sounds/sfx_equip.wav',
      fanfare: 'sounds/sfx_fanfare.ogg',
      fire_crackling: 'sounds/sfx_fire_crackling.ogg',
      fire_ignite: 'sounds/sfx_fire_ignite.ogg',
      fire_loop: 'sounds/sfx_fire_loop.wav',
      fish_caught: 'sounds/sfx_fish_caught.ogg',
      fish_splash: 'sounds/sfx_fish_splash.ogg',
      footstep_grass: 'sounds/sfx_footstep_grass.ogg',
      footstep_water: 'sounds/sfx_footstep_water.ogg',
      footstep_wood: 'sounds/sfx_footstep_wood.ogg',
      frog: 'sounds/sfx_frog.wav',
      gold_pile: 'sounds/sfx_gold_pile.ogg',
      hammer: 'sounds/sfx_hammer.ogg',
      harvest: 'sounds/sfx_harvest.ogg',
      harvest_fruit: 'sounds/sfx_harvest_fruit.ogg',
      harvest_grain: 'sounds/sfx_harvest_grain.ogg',
      heal: 'sounds/sfx_heal.ogg',
      hit: 'sounds/sfx_hit.wav',
      hover: 'sounds/sfx_hover.ogg',
      inventory: 'sounds/sfx_inventory.ogg',
      leaves_rustle: 'sounds/sfx_leaves_rustle.ogg',
      levelup: 'sounds/sfx_levelup.mp3',
      magic_cast: 'sounds/sfx_magic_cast.ogg',
      notification: 'sounds/sfx_notification.ogg',
      open_menu: 'sounds/sfx_open_menu.ogg',
      owl: 'sounds/sfx_owl.wav',
      page_turn: 'sounds/sfx_page_turn.ogg',
      plant_seed: 'sounds/sfx_plant_seed.ogg',
      portal: 'sounds/sfx_portal.ogg',
      punch: 'sounds/sfx_punch.wav',
      quest_complete: 'sounds/sfx_quest_complete.mp3',
      quest_new: 'sounds/sfx_quest_new.ogg',
      rain_drop: 'sounds/sfx_rain_drop.ogg',
      reel: 'sounds/sfx_reel.ogg',
      sail_unfurl: 'sounds/sfx_sail_unfurl.ogg',
      saw: 'sounds/sfx_saw.ogg',
      seagull: 'sounds/sfx_seagull.wav',
      shield_block: 'sounds/sfx_shield_block.ogg',
      ship_creak: 'sounds/sfx_ship_creak.ogg',
      splash: 'sounds/sfx_splash.wav',
      step_sand: 'sounds/sfx_step_sand.ogg',
      step_stone: 'sounds/sfx_step_stone.ogg',
      stone_place: 'sounds/sfx_stone_place.ogg',
      sword_clash: 'sounds/sfx_sword_clash.ogg',
      sword_swing: 'sounds/sfx_sword_swing.ogg',
      thunder_crack: 'sounds/sfx_thunder_crack.ogg',
      thunder_roll: 'sounds/sfx_thunder_roll.ogg',
      torch: 'sounds/sfx_torch.ogg',
      treasure_open: 'sounds/sfx_treasure_open.ogg',
      tree_fall: 'sounds/sfx_tree_fall.ogg',
      unequip: 'sounds/sfx_unequip.wav',
      water_pour: 'sounds/sfx_water_pour.ogg',
      wave_crash: 'sounds/sfx_wave_crash.ogg',
      whirlwind: 'sounds/sfx_whirlwind.ogg',
      wind_gust: 'sounds/sfx_wind_gust.ogg',
      wolf_howl: 'sounds/sfx_wolf_howl.mp3',
      wood_chop: 'sounds/sfx_wood_chop.ogg',
      writing: 'sounds/sfx_writing.ogg',
      // Music tracks (AI-generated)
      music_combat: 'sounds/music_combat_ai.mp3',
      music_festival: 'sounds/music_festival_ai.mp3',
      music_menu: 'sounds/music_menu_ai.mp3',
      music_night: 'sounds/music_night_ai.mp3',
      music_peaceful: 'sounds/music_peaceful_ai.mp3',
      music_sad: 'sounds/music_sad.ogg',
      music_sailing: 'sounds/music_sailing_ai.mp3',
      music_temple: 'sounds/music_temple_ai.mp3',
      music_victory: 'sounds/music_victory_ai.mp3',
      music_vulcan: 'sounds/music_vulcan_ai.mp3',
      music_hyperborea: 'sounds/music_hyperborea_ai.mp3',
      music_necropolis: 'sounds/music_necropolis_ai.mp3',
      music_defeat: 'sounds/music_defeat_ai.mp3',
      music_lobby: 'sounds/music_lobby_ai.mp3',
      music_raid: 'sounds/generated/music_raid.wav',
      // ═══════════════════════════════════════════════════════════════
      // FACTION-SPECIFIC MUSIC VARIANTS (optional per-faction themes)
      // ═══════════════════════════════════════════════════════════════
      // When a player chooses a faction, the game will attempt to play faction-specific
      // music variants instead of the base track. For example:
      //   - music_peaceful_rome → Roman martial theme
      //   - music_peaceful_carthage → Mediterranean trading port feel
      //   - music_peaceful_egypt → Mysterious minor scales, harps
      //   - music_peaceful_greece → Lyrical melodies, lyre-like arpeggios
      //   - music_peaceful_persia → Rich ornamental scales, oud-like tones
      //   - music_peaceful_phoenicia → Seafaring chanty rhythm, waves
      //   - music_peaceful_gaul → Celtic pipes, driving drums
      //   - music_peaceful_seapeople → Dark droning, ominous deep tones
      //
      // Same convention applies to all base tracks (music_night_*, music_sailing_*, etc)
      // If a faction variant doesn't exist, the base track plays instead.
      // This is defined in updateMusic() which routes to faction variants if available.
      // Narration voice clips
      narr_wreck_wake: 'sounds/narration/narration_wreck_wake.mp3',
      // narr_wreck_fire: 'sounds/narration/narration_wreck_fire.mp3', // TODO: generate
      // narr_wreck_sail: 'sounds/narration/narration_wreck_sail.mp3', // TODO: generate
      narr_first_sail: 'sounds/narration/narration_first_sail.mp3',
      narr_first_raid: 'sounds/narration/narration_first_raid.mp3',
      narr_level_3: 'sounds/narration/narration_level_3.mp3',
      narr_level_5: 'sounds/narration/narration_level_5.mp3',
      narr_level_8: 'sounds/narration/narration_level_8.mp3',
      narr_level_10: 'sounds/narration/narration_level_10.mp3',
      narr_rome_intro: 'sounds/narration/narration_rome_intro.mp3',
      narr_carthage_intro: 'sounds/narration/narration_carthage_intro.mp3',
      narr_egypt_intro: 'sounds/narration/narration_egypt_intro.mp3',
      narr_greece_intro: 'sounds/narration/narration_greece_intro.mp3',
      narr_seapeople_intro: 'sounds/narration/narration_seapeople_intro.mp3',
      narr_persia_intro: 'sounds/narration/narration_persia_intro.mp3',
      narr_phoenicia_intro: 'sounds/narration/narration_phoenicia_intro.mp3',
      narr_gaul_intro: 'sounds/narration/narration_gaul_intro.mp3',
      // narr_first_harvest: 'sounds/narration/narration_first_harvest.mp3', // TODO: generate
      narr_first_build: 'sounds/narration/narration_first_build.mp3',
      // narr_first_fish: 'sounds/narration/narration_first_fish.mp3',     // TODO: generate
      // narr_first_combat: 'sounds/narration/narration_first_combat.mp3', // TODO: generate
      narr_first_steps: 'sounds/narration/narration_first_steps.mp3',
      narr_victory: 'sounds/narration/narration_victory.mp3',
      narr_defeat: 'sounds/narration/narration_defeat.mp3',
      narr_vulcan: 'sounds/narration/narration_vulcan.mp3',
      narr_necropolis: 'sounds/narration/narration_necropolis.mp3',
      narr_hyperborea: 'sounds/narration/narration_hyperborea.mp3'
    };
    let loaded = 0;
    const total = Object.keys(files).length;
    for (const [key, path] of Object.entries(files)) {
      loadSound(path, (s) => {
        this._samples[key] = s;
        loaded++;
        if (loaded >= total) this._samplesLoaded = true;
      }, () => {
        // Failed to load — procedural fallback will handle it
        loaded++;
        if (loaded >= total) this._samplesLoaded = true;
      });
    }
  }

  // Play a sample-based SFX if available, returns true if played
  _playSample(key, volMult) {
    let s = this._samples[key];
    if (!s) return false;
    let vol = this.vol.master * this.vol.sfx * (volMult || 1.0);
    if (vol < 0.001) return true; // muted, but still "handled"
    // Avoid clicking: if already playing, ramp volume down briefly before restart
    if (s.isPlaying()) {
      try { s.setVolume(0, 0.01); } catch(e) {} // 10ms fade-out
      setTimeout(() => {
        try { s.stop(); s.setVolume(vol); s.play(); } catch(e) {}
      }, 12);
    } else {
      s.setVolume(vol);
      s.play();
    }
    return true;
  }

  // Start or update an ambient sample loop
  _loopSample(key, vol) {
    let s = this._samples[key];
    if (!s) return false;
    if (vol < 0.001) {
      if (this._sampleLoops[key]) {
        s.stop();
        this._sampleLoops[key] = false;
      }
      return true;
    }
    s.setVolume(vol);
    if (!this._sampleLoops[key]) {
      s.loop();
      this._sampleLoops[key] = true;
    }
    return true;
  }

  // Stop an ambient sample loop
  _stopLoop(key) {
    let s = this._samples[key];
    if (s && this._sampleLoops[key]) {
      s.stop();
      this._sampleLoops[key] = false;
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
      if (state._activeExploration === 'vulcan') island = 'vulcan';
      else if (state._activeExploration === 'hyperborea') island = 'hyperborea';
      else if (state._activeExploration === 'plenty') island = 'plenty';
      else if (state._activeExploration === 'necropolis') island = 'necropolis';
      else if (state._activeNation) island = 'nation';
      if (state.insideTemple) island = 'temple';
      if (state.insideCastrum) island = 'temple';  // castrum uses temple ambience
      if (state.belowDeck) island = 'temple';       // below deck = interior ambience
      if (state.onShipDeck) island = 'sailing';     // ship deck = ocean ambience
    }
    this._islandAmbient = island;

    // Diving underwater state
    let diving = typeof state !== 'undefined' && state.diving && state.diving.active;
    this._divingActive = diving;

    // Weather state
    let isRain = (typeof state !== 'undefined' && state.weather && state.weather.type === 'rain');
    let isStorm = (typeof stormActive !== 'undefined' && stormActive);
    let weatherIntensity = (typeof state !== 'undefined' && state.weather && state.weather.intensity) ? state.weather.intensity : 0;

    // Time of day
    let hour = (typeof state !== 'undefined' && state.time !== undefined) ? state.time / 60 : 12;

    // Player position
    let px = (typeof state !== 'undefined' && state.player) ? state.player.x : 0;
    let py = (typeof state !== 'undefined' && state.player) ? state.player.y : 0;

    // Update the ambient manager (procedural)
    if (this._amb) {
      this._amb.update({
        masterVol, bright, island, diving, isRain, isStorm,
        weatherIntensity, hour, px, py
      });
    }

    // Detect sailing and market proximity
    let isSailing = typeof state !== 'undefined' && state.rowing && state.rowing.active;
    let nearMarket = false;
    if (typeof state !== 'undefined' && state.buildings && state.player) {
      nearMarket = state.buildings.some(b => b.type === 'market' && dist(b.x, b.y, px, py) < 200);
    }

    // All ambient keys we manage — stop any not actively set this frame
    const _allAmbientKeys = [
      'ocean','birds','wind','rain','fire','crickets','cave','underwater','ocean_deep',
      'lava','ice','tropical','spooky','storm','night','sailing','market','forest',
      'tavern','battle','dawn','dusk','thunder_distant'
    ];

    // ─── SAMPLE-BASED AMBIENT LOOPS (layered on top of procedural) ───
    if (this._samplesLoaded && !diving) {
      let ambVol = masterVol * 0.35;
      // Track which keys are active this frame
      let activeKeys = {};
      let setAmb = (key, vol) => { activeKeys[key] = true; this._loopSample(key, vol); };

      // --- Universal layers ---
      // Rain: during rain weather
      let rainVol = isRain ? ambVol * 0.7 * weatherIntensity : 0;
      setAmb('rain', rainVol);
      // Storm: storm weather layer
      let stormVol = isStorm ? ambVol * 0.6 : 0;
      setAmb('storm', stormVol);
      // Distant thunder during storms
      setAmb('thunder_distant', isStorm ? ambVol * 0.3 : 0);

      // --- Sailing ---
      if (isSailing) {
        setAmb('sailing', ambVol * 0.7);
        setAmb('ocean', ambVol * 0.5);
        setAmb('wind', ambVol * 0.3);
      }
      // --- Island-specific ---
      else if (island === 'home') {
        let faction = (typeof state !== 'undefined' && state.faction) ? state.faction : 'rome';
        // Ocean: always present
        setAmb('ocean', ambVol * 0.8);
        // Faction-specific ambient layers
        if (faction === 'carthage') {
          // Desert wind prominent, less birds, market sounds
          setAmb('wind', ambVol * 0.4);
          setAmb('birds', bright > 0.5 ? ambVol * 0.2 * bright : 0);
          setAmb('market', nearMarket ? ambVol * 0.6 : ambVol * 0.15);
          let nightVol = bright < 0.3 ? ambVol * 0.4 * (1 - bright) : 0;
          setAmb('crickets', nightVol);
          setAmb('night', nightVol * 0.5);
        } else if (faction === 'egypt') {
          // Flowing water, less wind, cats and ibis (via birds), crickets at night
          setAmb('ocean', ambVol * 0.9); // Nile water sounds
          setAmb('birds', bright > 0.4 ? ambVol * 0.35 * bright : 0);
          setAmb('wind', ambVol * 0.1);
          setAmb('forest', bright > 0.4 ? ambVol * 0.15 * bright : 0);
          let nightVol = bright < 0.3 ? ambVol * 0.5 * (1 - bright) : 0;
          setAmb('crickets', nightVol);
          setAmb('night', nightVol * 0.6);
        } else if (faction === 'greece') {
          // Seagulls (birds), wind, ocean prominent
          setAmb('ocean', ambVol * 0.85);
          setAmb('birds', bright > 0.3 ? ambVol * 0.45 * bright : 0);
          setAmb('wind', ambVol * 0.25);
          setAmb('forest', bright > 0.4 ? ambVol * 0.2 * bright : 0);
          let nightVol = bright < 0.3 ? ambVol * 0.5 * (1 - bright) : 0;
          setAmb('crickets', nightVol);
          setAmb('night', nightVol * 0.6);
          if (hour >= 5 && hour < 7) setAmb('dawn', ambVol * 0.45);
          if (hour >= 17 && hour < 19) setAmb('dusk', ambVol * 0.45);
        } else {
          // Rome: standard Mediterranean — birds, crickets, forest
          let birdVol = bright > 0.4 ? ambVol * 0.5 * bright : 0;
          setAmb('birds', birdVol);
          setAmb('forest', bright > 0.4 ? ambVol * 0.25 * bright : 0);
          if (hour >= 5 && hour < 7) setAmb('dawn', ambVol * 0.4);
          if (hour >= 17 && hour < 19) setAmb('dusk', ambVol * 0.4);
          let nightVol = bright < 0.3 ? ambVol * 0.6 * (1 - bright) : 0;
          setAmb('crickets', nightVol);
          setAmb('night', nightVol * 0.7);
          setAmb('wind', ambVol * 0.15);
        }
        // Near market: market bustle
        setAmb('market', nearMarket ? ambVol * 0.5 : 0);
        // Near tavern
        let nearTavern = false;
        if (typeof state !== 'undefined' && state.buildings && state.player) {
          nearTavern = state.buildings.some(b => b.type === 'tavern' && dist(b.x, b.y, px, py) < 200);
        }
        setAmb('tavern', nearTavern ? ambVol * 0.4 : 0);
      }
      else if (island === 'vulcan') {
        setAmb('lava', ambVol * 0.6);
        setAmb('fire', ambVol * 0.4);
        setAmb('wind', ambVol * 0.2);
      }
      else if (island === 'hyperborea') {
        setAmb('ice', ambVol * 0.6);
        setAmb('wind', ambVol * 0.6);
      }
      else if (island === 'plenty') {
        setAmb('tropical', ambVol * 0.6);
        setAmb('ocean', ambVol * 0.5);
        setAmb('birds', bright > 0.4 ? ambVol * 0.4 * bright : 0);
        setAmb('crickets', bright < 0.3 ? ambVol * 0.5 * (1 - bright) : 0);
      }
      else if (island === 'necropolis') {
        setAmb('spooky', ambVol * 0.7);
        setAmb('wind', ambVol * 0.25);
      }
      else if (island === 'nation') {
        let nationKey = (typeof state !== 'undefined' && state._activeNation) ? state._activeNation : 'rome';
        setAmb('ocean', ambVol * 0.6);
        if (nationKey === 'carthage') {
          setAmb('wind', ambVol * 0.35);
          setAmb('market', ambVol * 0.5);
          setAmb('birds', bright > 0.5 ? ambVol * 0.15 * bright : 0);
          setAmb('crickets', bright < 0.3 ? ambVol * 0.3 * (1 - bright) : 0);
        } else if (nationKey === 'egypt') {
          setAmb('ocean', ambVol * 0.8); // water sounds
          setAmb('birds', bright > 0.4 ? ambVol * 0.3 * bright : 0);
          setAmb('wind', ambVol * 0.1);
          setAmb('crickets', bright < 0.3 ? ambVol * 0.35 * (1 - bright) : 0);
        } else if (nationKey === 'greece') {
          setAmb('ocean', ambVol * 0.7);
          setAmb('birds', bright > 0.3 ? ambVol * 0.4 * bright : 0);
          setAmb('wind', ambVol * 0.2);
          setAmb('crickets', bright < 0.3 ? ambVol * 0.35 * (1 - bright) : 0);
        } else {
          setAmb('birds', bright > 0.4 ? ambVol * 0.3 * bright : 0);
          setAmb('wind', ambVol * 0.15);
          setAmb('crickets', bright < 0.3 ? ambVol * 0.4 * (1 - bright) : 0);
          setAmb('market', ambVol * 0.3);
        }
      }

      // Combat ambient layer
      let inCombat = typeof state !== 'undefined' && state.conquest && state.conquest.active;
      setAmb('battle', inCombat ? ambVol * 0.4 : 0);

      // Stop any ambient keys not active this frame
      for (const key of _allAmbientKeys) {
        if (!activeKeys[key]) this._stopLoop(key);
      }
    } else if (diving) {
      // Underwater ambience
      let ambVol = masterVol * 0.35;
      this._loopSample('underwater', ambVol * 0.7);
      this._loopSample('ocean_deep', ambVol * 0.5);
      // Stop all non-diving ambient loops
      for (const key of _allAmbientKeys) {
        if (key !== 'underwater' && key !== 'ocean_deep') this._stopLoop(key);
      }
    }

    // Storm thunder (kept in SoundManager for SFX access)
    if (isStorm && !diving) {
      if (this._thunderTimer <= 0) this._thunderTimer = floor(random(1200, 2400));
      this._thunderTimer--;
      if (this._thunderTimer === 1) {
        this.playSFX('thunder');
        this._thunderTimer = floor(random(1200, 2400));
      }
    } else {
      this._thunderTimer = 0;
    }
    // Procedural animal sounds disabled — real CC0 ambient samples handle this
    // Real ambient_birds.mp3 and ambient_crickets.mp3 play via the sample loop system

    // Dawn/Dusk transition sounds
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

  // ─── RECORDED MUSIC SYSTEM ───
  // Call each frame. Selects and loops appropriate music track based on game state.
  // Only active when gameSettings.musicSource === 'recorded'.
  // Crossfades between tracks over ~1s. Adds silence gaps and track variation.
  updateMusic() {
    if (!this.ready || !this._samplesLoaded) return;
    // Initialize music state for silence gaps / variation
    if (!this._musicState) this._musicState = { silenceTimer: 0, lastTrack: null, loopCount: 0, trackStartFrame: 0 };
    let useRecorded = typeof gameSettings !== 'undefined' && gameSettings.musicSource === 'recorded';
    if (!useRecorded) {
      if (this._musicTrack) {
        let s = this._samples[this._musicTrack];
        if (s && s.isPlaying()) s.stop();
        this._musicTrack = null;
      }
      if (this._musicFadingOut) {
        let s = this._samples[this._musicFadingOut];
        if (s && s.isPlaying()) s.stop();
        this._musicFadingOut = null;
      }
      this._musicFadeIn = 1;
      this._musicState.silenceTimer = 0;
      this._musicState.loopCount = 0;
      this._musicPlayTime = 0;
      this._musicVolFade = 1.0;
      return;
    }
    let musicVol = this.vol.master * this.vol.music;
    if (musicVol < 0.01) {
      if (this._musicTrack) {
        let s = this._samples[this._musicTrack];
        if (s && s.isPlaying()) s.stop();
        this._musicTrack = null;
      }
      return;
    }

    // Track continuous music playback time
    this._musicPlayTime++;
    // After 10 min (36000 frames @60fps), reduce volume by 20%
    if (this._musicPlayTime > 36000) {
      this._musicVolFade = Math.max(0.8, 1.0 - (this._musicPlayTime - 36000) / 18000);
    } else {
      this._musicVolFade = 1.0;
    }

    // Initialize crossfade state
    if (this._musicFadeIn === undefined) this._musicFadeIn = 1;
    if (!this._musicFadingOut) this._musicFadingOut = null;
    if (!this._musicFadeOut) this._musicFadeOut = 0;

    // Handle silence gap countdown
    if (this._musicState.silenceTimer > 0) {
      this._musicState.silenceTimer--;
      // Keep fading out old track during silence
      if (this._musicFadingOut) {
        this._musicFadeOut = max(0, this._musicFadeOut - 0.02);
        let s = this._samples[this._musicFadingOut];
        if (s && s.isPlaying()) {
          s.setVolume(musicVol * this._musicFadeOut * this._musicVolFade);
          if (this._musicFadeOut <= 0) { s.stop(); this._musicFadingOut = null; }
        } else { this._musicFadingOut = null; }
      }
      return;
    }

    // Determine desired track
    let target = 'music_peaceful';
    if (typeof gameScreen !== 'undefined' && (gameScreen === 'menu' || gameScreen === 'settings' || gameScreen === 'credits')) {
      target = 'music_menu';
    } else if (typeof gameScreen !== 'undefined' && gameScreen === 'lobby') {
      target = 'music_lobby';
    } else if (typeof state !== 'undefined') {
      if (state.conquest && state.conquest.active) target = 'music_combat';
      else if (typeof _invasionBattle !== 'undefined' && _invasionBattle) target = 'music_combat';
      else if (state.seaPeopleRaidActive) target = 'music_raid';
      else if (state.festival) target = 'music_festival';
      else if (state.rowing && state.rowing.active) target = 'music_sailing';
      else if (state.onShipDeck) target = 'music_sailing'; // Ship deck = sea music
      else if (state.belowDeck) target = 'music_night';    // Below deck = moody
      else if (state._activeExploration === 'vulcan') target = 'music_vulcan';
      else if (state._activeExploration === 'hyperborea') target = 'music_hyperborea';
      else if (state._activeExploration === 'necropolis') target = 'music_necropolis';
      else if (state._activeNation) target = 'music_temple';
      else if (state.time >= 1200 || state.time < 300) target = 'music_night';
      // Near temple?
      if (typeof state.buildings !== 'undefined' && state.player) {
        let nearTemple = state.buildings.some(b => b.type === 'temple' && dist(b.x, b.y, state.player.x, state.player.y) < 200);
        if (nearTemple) target = 'music_temple';
      }
    }

    // Apply faction-specific music variant if player has chosen a faction
    if (typeof state !== 'undefined' && state.faction && target !== 'music_menu' && target !== 'music_lobby') {
      let factionTrack = target + '_' + state.faction;
      if (this._samples[factionTrack]) {
        target = factionTrack;
      }
    }

    // Fall back if sample doesn't exist
    if (!this._samples[target]) target = 'music_peaceful';
    if (!this._samples[target]) return;

    // Crossfade: fade out old track
    if (this._musicFadingOut) {
      this._musicFadeOut = max(0, this._musicFadeOut - 0.017); // 1s at 60fps
      let s = this._samples[this._musicFadingOut];
      if (s && s.isPlaying()) {
        s.setVolume(musicVol * this._musicFadeOut * this._musicVolFade);
        if (this._musicFadeOut <= 0) { s.stop(); this._musicFadingOut = null; }
      } else {
        this._musicFadingOut = null;
      }
    }

    // Crossfade: fade in current track
    if (this._musicFadeIn < 1) {
      this._musicFadeIn = min(1, this._musicFadeIn + 0.017); // 1s at 60fps
    }

    // Switch track if needed
    if (this._musicTrack !== target) {
      // Move current to fading-out slot
      if (this._musicTrack) {
        // If already fading something out, hard-stop it
        if (this._musicFadingOut && this._musicFadingOut !== this._musicTrack) {
          let old2 = this._samples[this._musicFadingOut];
          if (old2 && old2.isPlaying()) old2.stop();
        }
        this._musicFadingOut = this._musicTrack;
        this._musicFadeOut = this._musicFadeIn; // fade from current level
      }
      // Start new track fading in (use play, not loop, so we can detect end)
      let s = this._samples[target];
      if (s) {
        this._musicFadeIn = 0;
        s.setVolume(0);
        s.play();
        this._musicTrack = target;
        this._musicState.loopCount = 0;
        this._musicState.trackStartFrame = this._musicPlayTime;
      }
    } else {
      let s = this._samples[this._musicTrack];
      if (s) {
        // Force variety after 3 min (10800 frames) of same track
        if (s.isPlaying() && this._musicPlayTime - (this._musicState.trackStartFrame || 0) > 10800) {
          let alt = this._pickAlternateMusicTrack(this._musicTrack);
          if (alt && alt !== this._musicTrack) {
            let as = this._samples[alt];
            if (as) {
              this._musicFadingOut = this._musicTrack;
              this._musicFadeOut = this._musicFadeIn;
              as.setVolume(0);
              as.play();
              this._musicTrack = alt;
              this._musicFadeIn = 0;
              this._musicState.loopCount = 0;
              this._musicState.trackStartFrame = this._musicPlayTime;
              return;
            }
          }
          // No alternate: insert silence gap
          this._musicState.silenceTimer = Math.floor(Math.random() * 1800 + 1800);
          this._musicState.lastTrack = this._musicTrack;
          this._musicState.trackStartFrame = this._musicPlayTime;
          return;
        }
        // Detect track ended — always insert silence gap (30-60s)
        if (!s.isPlaying() && this._musicFadeIn >= 1 && this._musicState.silenceTimer <= 0) {
          this._musicState.loopCount++;
          this._musicState.silenceTimer = Math.floor(Math.random() * 1800 + 1800);
          this._musicState.lastTrack = this._musicTrack;
          // 50% chance to switch track in same mood after gap
          if (Math.random() < 0.5) {
            let alt = this._pickAlternateMusicTrack(target);
            if (alt && alt !== target && this._samples[alt]) {
              this._musicTrack = alt;
              this._musicState.loopCount = 0;
            }
          }
          this._musicState.trackStartFrame = this._musicPlayTime;
          return;
        }
        // Update volume with fade-in and gradual volume fade
        s.setVolume(musicVol * this._musicFadeIn * this._musicVolFade);
      }
    }
  }

  // Pick a different music track in the same mood category
  _pickAlternateMusicTrack(current) {
    let moodGroups = {
      calm: ['music_peaceful', 'music_night', 'music_temple'],
      intense: ['music_combat', 'music_raid'],
      adventure: ['music_sailing', 'music_vulcan', 'music_hyperborea'],
      special: ['music_festival', 'music_necropolis']
    };
    for (let group of Object.values(moodGroups)) {
      if (group.includes(current) && group.length > 1) {
        let candidates = group.filter(t => t !== current && this._samples[t]);
        if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
    return null;
  }

  // Play a one-shot music sting (victory, etc)
  playMusicSting(key) {
    if (!this.ready || !this._samplesLoaded) return;
    let s = this._samples[key];
    if (!s) return;
    let vol = this.vol.master * this.vol.music;
    if (vol < 0.01) return;
    s.setVolume(vol);
    if (s.isPlaying()) s.stop();
    s.play();
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
      if (state._activeExploration === 'necropolis') target = 'eerie';
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
      this._lyreVolMult = max(0, this._lyreVolMult - 0.02);
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
      this._lyreVolMult = min(1, this._lyreVolMult + 0.015);
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
    // D Mixolydian: D E F# G A B C — for sailing (major feel)
    let mixolydian = [293.7, 329.6, 370.0, 392.0, 440.0, 493.9, 523.3, 587.3, 659.3, 740.0, 784.0, 880.0];
    // D Hijaz (Phrygian Dominant): D Eb F# G A Bb C — Middle Eastern/Carthaginian
    let hijaz = [293.7, 311.1, 370.0, 392.0, 440.0, 466.2, 523.3, 587.3, 622.3, 740.0, 784.0, 880.0];
    // D Double Harmonic: D Eb F# G A Bb C# — Egyptian
    let doubleHarmonic = [293.7, 311.1, 370.0, 392.0, 440.0, 466.2, 554.4, 587.3, 622.3, 740.0, 784.0, 880.0];
    // D Pentatonic: D E G A B (padded to 12 for index compat) — Celtic/Gaul
    let pentatonic = [293.7, 329.6, 392.0, 440.0, 493.9, 587.3, 659.3, 784.0, 880.0, 987.8, 1174.7, 1318.5];

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
      // Combat: driving Phrygian, short-short-LONG rhythmic patterns, building intensity
      phrases = [
        // Phrase 1: short-short-LONG ostinato — rhythmic hammer
        [[0,10,0.70,0],[0,10,0.50,1],[-1,3,0,0],[0,30,0.85,0],[4,30,0.60,1],[-1,5,0,0],
         [0,10,0.70,0],[1,10,0.55,1],[-1,3,0,0],[0,30,0.80,0],[3,30,0.58,1],[-1,5,0,0],
         [0,10,0.70,0],[3,10,0.55,1],[-1,3,0,0],[4,35,0.85,0],[7,35,0.60,1],[-1,20,0,0]],
        // Phrase 2: Ascending Phrygian menace with drone — building tension
        [[0,60,0.25,2],[0,15,0.65,0],[1,15,0.55,0],[3,15,0.70,0],[4,20,0.75,0],[-1,5,0,0],
         [5,15,0.70,0],[4,15,0.65,1],[3,15,0.60,0],[-1,5,0,0],
         [4,10,0.65,0],[5,10,0.60,0],[7,25,0.85,0],[4,25,0.60,1],[-1,20,0,0]],
        // Phrase 3: Parallel fifths — stabbing downward
        [[7,12,0.80,0],[4,12,0.60,1],[-1,4,0,0],[5,12,0.75,0],[3,12,0.55,1],[-1,4,0,0],
         [4,12,0.72,0],[1,12,0.55,1],[-1,4,0,0],[3,12,0.70,0],[0,12,0.58,1],[-1,6,0,0],
         [0,30,0.85,0],[4,30,0.62,1],[7,40,0.90,0],[-1,25,0,0]],
        // Phrase 4: Syncopated accents — off-beat strikes
        [[0,10,0.80,0],[-1,5,0,0],[0,10,0.45,1],[-1,8,0,0],[3,10,0.70,0],[4,18,0.82,1],[-1,4,0,0],
         [5,10,0.65,0],[-1,4,0,0],[4,10,0.70,0],[3,18,0.75,1],[0,22,0.82,0],[-1,6,0,0],
         [1,10,0.65,0],[0,28,0.85,1],[-1,22,0,0]],
        // Phrase 5: Cascading descent — rapid falling then crash
        [[7,10,0.78,0],[5,10,0.65,1],[4,10,0.72,0],[3,10,0.60,1],[1,10,0.68,0],[0,18,0.80,1],[-1,6,0,0],
         [0,70,0.22,2],[3,15,0.68,0],[4,15,0.72,1],[7,20,0.85,0],[5,15,0.65,1],[3,25,0.78,0],[-1,25,0,0]],
        // Phrase 6: War march — heavy beats 1 and 3
        [[0,22,0.85,0],[0,22,0.25,2],[-1,15,0,0],[3,15,0.55,1],[-1,4,0,0],
         [4,22,0.85,0],[-1,15,0,0],[1,15,0.55,1],[-1,4,0,0],
         [0,22,0.82,0],[7,22,0.60,1],[-1,6,0,0],[5,15,0.68,0],[3,20,0.72,1],[0,30,0.85,0],[-1,30,0,0]],
        // Phrase 7: Rapid alternation — flurry building to climax
        [[0,8,0.68,0],[1,8,0.55,1],[0,8,0.68,0],[1,8,0.55,1],[0,8,0.70,0],[3,8,0.60,1],[-1,3,0,0],
         [4,8,0.72,0],[5,8,0.60,1],[4,8,0.72,0],[5,8,0.60,1],[7,18,0.85,0],[4,18,0.65,1],[-1,5,0,0],
         [0,28,0.82,0],[-1,25,0,0]],
        // Phrase 8: Brief resolution then new assault
        [[4,25,0.70,0],[3,25,0.55,1],[0,35,0.75,0],[-1,15,0,0],
         [0,70,0.25,2],[3,20,0.65,0],[4,20,0.70,1],[7,25,0.82,0],[-1,10,0,0],
         [5,20,0.65,0],[4,15,0.58,1],[0,30,0.78,0],[-1,30,0,0]],
        // Phrase 9: Phrygian climb — Eb tension resolving to D
        [[1,15,0.70,0],[3,15,0.58,1],[4,15,0.72,0],[5,18,0.75,1],[-1,5,0,0],
         [7,20,0.82,0],[5,15,0.62,1],[4,15,0.70,0],[3,15,0.60,1],[-1,5,0,0],
         [1,18,0.72,0],[-1,5,0,0],[0,30,0.85,0],[4,30,0.62,1],[-1,25,0,0]],
        // Phrase 10: Relentless pulse — driving repeated root
        [[0,8,0.75,0],[-1,3,0,0],[0,8,0.75,0],[-1,3,0,0],[0,8,0.78,0],[-1,3,0,0],
         [3,12,0.70,1],[4,15,0.78,0],[-1,4,0,0],
         [0,8,0.75,0],[-1,3,0,0],[0,8,0.75,0],[-1,3,0,0],[0,8,0.78,0],[-1,3,0,0],
         [7,18,0.85,0],[4,18,0.65,1],[0,25,0.82,0],[-1,25,0,0]],
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
      // Festival: fast, joyful, dotted rhythms, high register, dancing bounce
      phrases = [
        // Phrase 1: Dotted rhythm dance — long-short bounce pattern
        [[4,28,0.80,0],[7,28,0.55,1],[-1,5,0,0],[5,12,0.55,0],[-1,3,0,0],
         [7,28,0.80,0],[9,28,0.55,1],[-1,5,0,0],[7,12,0.55,0],[-1,3,0,0],
         [9,28,0.82,0],[7,28,0.55,1],[-1,5,0,0],[5,12,0.52,0],[-1,3,0,0],
         [4,22,0.75,0],[2,18,0.50,1],[0,28,0.80,0],[-1,18,0,0]],
        // Phrase 2: Leaping joy — wide intervals, bright register
        [[0,12,0.68,0],[4,12,0.48,1],[7,16,0.78,0],[9,16,0.58,1],[11,22,0.85,0],[-1,5,0,0],
         [9,12,0.62,0],[7,12,0.48,1],[4,16,0.68,0],[7,20,0.78,1],[9,25,0.85,0],[-1,18,0,0]],
        // Phrase 3: Trill ornament then ascending fanfare
        [[4,8,0.68,0],[5,8,0.50,1],[4,8,0.68,0],[5,8,0.50,1],[4,8,0.68,0],[5,8,0.52,1],[-1,4,0,0],
         [7,14,0.78,0],[9,14,0.58,1],[11,18,0.85,0],[-1,5,0,0],[7,12,0.62,0],[4,16,0.78,1],[-1,15,0,0]],
        // Phrase 4: Descending garland — cascading scale
        [[11,12,0.80,0],[9,12,0.58,1],[7,12,0.72,0],[5,12,0.52,1],[4,12,0.68,0],[2,12,0.48,1],[-1,5,0,0],
         [0,16,0.72,0],[4,16,0.52,1],[7,20,0.78,0],[9,16,0.58,1],[11,22,0.85,0],[-1,18,0,0]],
        // Phrase 5: Stomping dance — heavy downbeats with pickups
        [[0,20,0.85,0],[4,20,0.55,1],[-1,8,0,0],[3,10,0.50,0],[4,20,0.82,1],[7,20,0.55,0],[-1,8,0,0],
         [5,10,0.50,0],[7,20,0.82,0],[4,20,0.55,1],[-1,8,0,0],[2,10,0.50,0],[0,22,0.78,1],[-1,15,0,0]],
        // Phrase 6: Call and response — high call, mid answer
        [[4,12,0.68,0],[5,12,0.55,0],[7,16,0.78,0],[-1,10,0,0],
         [7,12,0.65,1],[5,12,0.52,1],[4,16,0.75,1],[-1,10,0,0],
         [4,12,0.68,0],[7,12,0.55,0],[9,16,0.78,0],[11,20,0.85,1],[-1,15,0,0]],
        // Phrase 7: Spinning circle — circular pattern building up
        [[4,10,0.68,0],[7,10,0.52,1],[9,10,0.68,0],[7,10,0.52,1],
         [4,10,0.68,0],[7,10,0.52,1],[9,10,0.68,0],[11,12,0.78,1],[-1,4,0,0],
         [9,10,0.62,0],[7,10,0.50,1],[4,12,0.68,0],[0,16,0.78,1],[-1,15,0,0]],
        // Phrase 8: Grand finale — ascending with full chords
        [[0,10,0.78,0],[4,10,0.50,1],[7,10,0.35,2],[-1,4,0,0],
         [2,10,0.72,0],[5,10,0.48,1],[-1,4,0,0],
         [4,12,0.78,0],[7,12,0.52,1],[9,12,0.38,2],[-1,4,0,0],
         [7,12,0.82,0],[9,12,0.55,1],[11,16,0.88,0],[-1,6,0,0],
         [7,12,0.68,0],[4,16,0.78,1],[0,20,0.85,0],[-1,22,0,0]],
        // Phrase 9: Wine toast — ascending major with held chord at top
        [[0,12,0.62,0],[2,12,0.45,1],[-1,5,0,0],[4,12,0.68,0],[5,12,0.48,1],[-1,5,0,0],
         [7,12,0.72,0],[9,12,0.50,1],[-1,5,0,0],
         [11,20,0.85,0],[9,20,0.60,1],[7,20,0.42,2],[-1,8,0,0],
         [9,10,0.58,0],[7,10,0.45,1],[4,16,0.68,0],[0,20,0.72,1],[-1,18,0,0]],
        // Phrase 10: Rhythmic clap — short-LONG bounce
        [[4,8,0.68,0],[-1,3,0,0],[4,18,0.80,0],[7,18,0.55,1],[-1,6,0,0],
         [5,8,0.62,0],[-1,3,0,0],[5,18,0.75,0],[9,18,0.50,1],[-1,6,0,0],
         [7,8,0.68,0],[-1,3,0,0],[7,18,0.80,0],[11,18,0.55,1],[-1,5,0,0],
         [9,10,0.62,0],[7,10,0.50,1],[4,16,0.78,0],[-1,18,0,0]],
      ];
    } else if (this._lyreMode === 'night') {
      scale = aeolian;
      // Night: haunting, minor, long sustained notes with vibrato, lots of silence
      phrases = [
        // Phrase 1: Long D with gentle vibrato, then minor 3rd sigh (D-F)
        [[0,180,0.28,0],[0,200,0.10,2],[-1,120,0,0],
         [2,150,0.22,1],[-1,100,0,0],[0,180,0.25,0],[-1,180,0,0]],
        // Phrase 2: Bb down to G, haunting minor descent
        [[5,160,0.24,0],[-1,80,0,0],[4,140,0.22,1],[-1,80,0,0],
         [3,150,0.24,0],[-1,100,0,0],[2,140,0.20,1],[-1,80,0,0],
         [0,200,0.28,0],[0,200,0.10,2],[-1,200,0,0]],
        // Phrase 3: Isolated high D over low drone — starlight
        [[0,220,0.10,2],[-1,80,0,0],[7,120,0.20,0],[-1,140,0,0],
         [5,100,0.16,1],[-1,160,0,0],[4,130,0.18,0],[-1,180,0,0]],
        // Phrase 4: Lullaby — gentle thirds descending to rest
        [[4,120,0.22,0],[2,120,0.14,1],[-1,60,0,0],
         [3,110,0.20,0],[0,110,0.12,1],[-1,60,0,0],
         [2,120,0.22,0],[0,120,0.14,1],[-1,80,0,0],
         [0,160,0.26,0],[0,160,0.10,2],[-1,200,0,0]],
        // Phrase 5: Echo motif — each note answered softer
        [[4,100,0.24,0],[-1,40,0,0],[4,100,0.12,1],[-1,80,0,0],
         [5,100,0.22,0],[-1,40,0,0],[5,100,0.11,1],[-1,80,0,0],
         [3,120,0.20,0],[-1,40,0,0],[3,120,0.10,1],[-1,120,0,0],
         [0,160,0.24,0],[-1,180,0,0]],
        // Phrase 6: Owl call — two-note motif with variation
        [[4,90,0.22,0],[2,130,0.18,1],[-1,120,0,0],
         [4,90,0.20,0],[3,130,0.16,1],[-1,140,0,0],
         [4,90,0.22,0],[0,150,0.18,1],[-1,100,0,0],
         [0,200,0.12,2],[-1,200,0,0]],
        // Phrase 7: Low register embers — bass warmth
        [[0,200,0.14,2],[-1,100,0,0],[1,160,0.20,0],[-1,100,0,0],
         [0,180,0.18,1],[-1,120,0,0],[3,150,0.18,0],[-1,100,0,0],
         [0,220,0.22,0],[-1,220,0,0]],
        // Phrase 8: Wistful minor — gentle tension and release
        [[4,110,0.22,0],[3,110,0.14,1],[-1,60,0,0],
         [2,120,0.20,0],[1,120,0.12,1],[-1,70,0,0],
         [0,150,0.26,0],[0,150,0.10,2],[-1,80,0,0],
         [2,120,0.18,0],[-1,100,0,0],[0,180,0.22,0],[-1,200,0,0]],
      ];
    } else if (this._lyreMode === 'sailing') {
      scale = mixolydian;
      // Sailing: adventurous, major key, wave-like up-down contour, confident
      phrases = [
        // Phrase 1: Wave contour — up-down-up-down like rolling seas
        [[0,35,0.65,0],[1,30,0.45,1],[-1,8,0,0],[2,30,0.60,0],[3,35,0.70,0],[4,40,0.78,1],[-1,10,0,0],
         [3,30,0.60,0],[2,30,0.55,0],[0,35,0.65,1],[-1,10,0,0],
         [2,30,0.60,0],[4,35,0.70,0],[7,45,0.80,1],[-1,12,0,0],
         [4,30,0.58,0],[2,35,0.55,0],[0,45,0.70,1],[-1,40,0,0]],
        // Phrase 2: Shanty call — bold ascending statement
        [[4,30,0.75,0],[4,30,0.48,1],[-1,8,0,0],[7,28,0.70,0],[9,35,0.80,0],[-1,10,0,0],
         [7,28,0.60,1],[4,30,0.68,0],[-1,8,0,0],[3,28,0.58,0],[0,35,0.68,1],[-1,12,0,0],
         [4,35,0.72,0],[7,40,0.80,1],[-1,40,0,0]],
        // Phrase 3: Shanty response — descending answer
        [[9,28,0.70,0],[7,28,0.55,1],[-1,6,0,0],[7,28,0.65,0],[4,28,0.48,1],[-1,6,0,0],
         [4,30,0.68,0],[3,28,0.50,0],[0,35,0.72,1],[-1,12,0,0],
         [3,28,0.58,0],[4,30,0.68,1],[7,40,0.78,0],[-1,40,0,0]],
        // Phrase 4: Wind in sails — soaring high then back
        [[7,28,0.68,0],[9,28,0.55,1],[11,32,0.80,0],[-1,8,0,0],
         [9,25,0.62,0],[7,25,0.50,1],[4,28,0.68,0],[-1,8,0,0],
         [7,30,0.72,0],[9,32,0.78,1],[11,38,0.85,0],[-1,10,0,0],
         [9,28,0.62,0],[7,30,0.68,1],[4,40,0.62,0],[-1,40,0,0]],
        // Phrase 5: Bass anchor — low pedal with dancing melody above
        [[0,65,0.18,2],[4,22,0.62,0],[7,22,0.48,1],[4,22,0.62,0],[3,25,0.48,1],[-1,6,0,0],
         [4,22,0.62,0],[7,28,0.72,0],[9,32,0.60,1],[7,35,0.52,0],[-1,45,0,0]],
        // Phrase 6: Triumphant fanfare — ascending thirds
        [[0,28,0.68,0],[4,28,0.48,1],[-1,6,0,0],[4,28,0.72,0],[7,28,0.50,1],[-1,6,0,0],
         [7,30,0.78,0],[9,30,0.55,1],[-1,6,0,0],[9,28,0.72,0],[11,32,0.82,0],[-1,8,0,0],
         [9,25,0.60,1],[7,28,0.68,0],[4,35,0.55,1],[0,45,0.68,0],[-1,50,0,0]],
        // Phrase 7: Rolling wave — gentle rocking rhythm
        [[4,40,0.58,0],[7,35,0.45,1],[-1,12,0,0],[5,35,0.52,0],[4,40,0.45,1],[-1,12,0,0],
         [3,40,0.58,0],[4,35,0.45,1],[-1,12,0,0],[0,45,0.62,0],[3,40,0.45,1],[-1,12,0,0],
         [4,48,0.68,0],[7,45,0.50,1],[-1,45,0,0]],
        // Phrase 8: Horizon sighting — building excitement
        [[0,20,0.58,0],[2,20,0.50,0],[4,20,0.60,0],[7,25,0.70,0],[4,25,0.50,1],[-1,8,0,0],
         [7,20,0.68,0],[9,22,0.72,0],[11,28,0.80,0],[9,28,0.58,1],[-1,10,0,0],
         [7,25,0.65,0],[4,30,0.58,1],[0,40,0.72,0],[-1,45,0,0]],
      ];
    } else {
      // Peaceful: faction-specific scale for cultural flavor
      let faction = (typeof state !== 'undefined' && state.faction) ? state.faction : 'rome';
      if (faction === 'carthage' || faction === 'phoenicia') scale = hijaz;
      else if (faction === 'egypt') scale = doubleHarmonic;
      else if (faction === 'persia') scale = phrygian;
      else if (faction === 'greece') scale = mixolydian;
      else if (faction === 'seapeople') scale = aeolian;
      else if (faction === 'gaul') scale = pentatonic;
      else scale = dorian; // Rome default
      phrases = [
        // Phrase 1: Ascending scale run (D E F G A) then resolve down (G F E D)
        [[0,40,0.65,0],[2,40,0.42,1],[-1,10,0,0],[1,30,0.55,0],[-1,8,0,0],
         [2,30,0.60,0],[4,30,0.38,1],[-1,8,0,0],[3,35,0.65,0],[-1,10,0,0],
         [4,45,0.75,0],[2,45,0.48,1],[-1,15,0,0],
         [3,35,0.60,0],[-1,8,0,0],[2,30,0.55,0],[0,30,0.38,1],[-1,8,0,0],
         [1,35,0.50,0],[-1,10,0,0],[0,60,0.70,0],[4,60,0.42,1],[-1,80,0,0]],
        // Phrase 2: Arpeggio pattern (D F A D' A F D) — harp-like bloom
        [[0,35,0.60,0],[-1,8,0,0],[2,30,0.55,0],[-1,8,0,0],[4,35,0.65,0],[2,35,0.40,1],[-1,10,0,0],
         [7,45,0.75,0],[4,45,0.48,1],[-1,15,0,0],
         [4,35,0.60,0],[-1,8,0,0],[2,30,0.55,0],[-1,8,0,0],[0,50,0.70,0],[4,50,0.42,1],[-1,90,0,0]],
        // Phrase 3: Call and response — high phrase, low answer
        [[4,35,0.70,0],[5,30,0.55,0],[7,40,0.75,0],[4,40,0.48,1],[-1,30,0,0],
         [2,35,0.55,1],[0,30,0.50,1],[2,40,0.60,1],[0,50,0.65,1],[-1,25,0,0],
         [4,30,0.65,0],[7,35,0.70,0],[5,45,0.60,1],[-1,20,0,0],
         [3,30,0.50,1],[2,35,0.55,1],[0,50,0.65,1],[-1,80,0,0]],
        // Phrase 4: Held note with trill ornamentation
        [[4,60,0.70,0],[2,60,0.42,1],[-1,20,0,0],
         [4,10,0.50,0],[5,10,0.40,0],[4,10,0.50,0],[5,10,0.40,0],[4,10,0.50,0],[5,10,0.40,0],[-1,8,0,0],
         [4,50,0.65,0],[2,50,0.40,1],[-1,15,0,0],
         [2,45,0.55,0],[0,45,0.38,1],[-1,10,0,0],[0,60,0.70,0],[4,60,0.42,1],[-1,90,0,0]],
        // Phrase 5: Pastoral arc — I to IV, gentle climb and descent
        [[0,50,0.60,0],[0,100,0.18,2],[-1,15,0,0],[2,40,0.55,0],[4,40,0.42,1],[-1,10,0,0],
         [3,45,0.65,0],[5,45,0.42,1],[-1,12,0,0],[4,50,0.70,0],[7,50,0.45,1],[-1,20,0,0],
         [5,40,0.60,0],[3,40,0.42,1],[-1,10,0,0],[4,35,0.55,0],[2,35,0.38,1],[-1,10,0,0],
         [0,60,0.70,0],[4,60,0.45,1],[-1,80,0,0]],
        // Phrase 6: Dotted rhythm dance — long-short-long pattern
        [[4,45,0.70,0],[7,45,0.45,1],[-1,8,0,0],[5,20,0.50,0],[-1,5,0,0],
         [7,45,0.70,0],[4,45,0.45,1],[-1,8,0,0],[5,20,0.50,0],[-1,5,0,0],
         [4,45,0.65,0],[2,45,0.42,1],[-1,8,0,0],[3,20,0.48,0],[-1,5,0,0],
         [2,35,0.55,0],[0,35,0.38,1],[-1,10,0,0],[0,60,0.70,0],[-1,80,0,0]],
        // Phrase 7: Parallel thirds ascending — voices moving together warmly
        [[0,40,0.60,0],[2,40,0.38,1],[-1,10,0,0],[1,35,0.55,0],[3,35,0.35,1],[-1,8,0,0],
         [2,40,0.60,0],[4,40,0.38,1],[-1,10,0,0],[3,35,0.58,0],[5,35,0.36,1],[-1,8,0,0],
         [4,45,0.65,0],[7,45,0.42,1],[-1,12,0,0],[5,40,0.60,0],[7,40,0.40,1],[-1,15,0,0],
         [4,40,0.55,0],[2,40,0.36,1],[-1,10,0,0],[0,55,0.70,0],[4,55,0.42,1],[-1,90,0,0]],
        // Phrase 8: Harvest cadence — IV chord to I, classic ancient resolution
        [[3,45,0.65,0],[5,45,0.42,1],[7,45,0.30,2],[-1,15,0,0],
         [4,35,0.58,0],[3,35,0.38,1],[-1,10,0,0],
         [2,40,0.60,0],[4,40,0.40,1],[-1,12,0,0],
         [0,55,0.70,0],[4,55,0.45,1],[7,55,0.32,2],[-1,20,0,0],
         [0,70,0.75,0],[4,70,0.48,1],[-1,90,0,0]],
        // Phrase 9: Birdsong — quick grace notes then sustained tone
        [[4,12,0.45,0],[5,12,0.38,0],[4,12,0.45,0],[-1,5,0,0],
         [7,55,0.70,0],[4,55,0.45,1],[-1,25,0,0],
         [5,12,0.45,0],[7,12,0.38,0],[5,12,0.45,0],[-1,5,0,0],
         [4,50,0.65,0],[2,50,0.42,1],[-1,20,0,0],[0,60,0.70,0],[-1,80,0,0]],
        // Phrase 10: Golden hour — two-chord voicings, stepwise, warm resolution
        [[0,50,0.58,0],[4,50,0.38,1],[7,50,0.25,2],[-1,15,0,0],
         [2,40,0.52,0],[5,40,0.35,1],[-1,12,0,0],
         [4,45,0.62,0],[7,45,0.40,1],[-1,12,0,0],
         [5,40,0.55,0],[3,40,0.36,1],[-1,12,0,0],
         [4,45,0.60,0],[0,45,0.38,1],[-1,12,0,0],
         [0,65,0.70,0],[4,65,0.45,2],[-1,90,0,0]],
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
      if (this._lyreMode === 'eerie' && freq > 500) freq *= 0.75;
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

      // Update drone root to follow melody chord (I-IV-V movement)
      // Map scale degrees to chord roots: 0,1,2 → I (D), 3,4,5 → IV (G), 6+ → V (A)
      if (voice === 0 && vel > 0.3) {
        if (ni <= 2 || ni === 7) this._droneRootFreq = 146.8; // D3 (I)
        else if (ni >= 3 && ni <= 5) this._droneRootFreq = 196.0; // G3 (IV)
        else if (ni === 6 || ni >= 8) this._droneRootFreq = 164.8; // E3 or A2→ V
      }

      // Harmony layer: variable intervals (3rd/5th/octave below) — Era 2+ only, 60% volume
      if (lyreEra >= 2 && this._harmOsc && this._harmGain && amp > 0.005) {
        let r = random();
        let harmInterval;
        if (this._lyreMode === 'night' || this._lyreMode === 'eerie') {
          // Dark modes: minor 3rd most common, occasional 5th
          harmInterval = r < 0.55 ? 1.2 : (r < 0.80 ? 1.5 : 0.5); // m3rd / P5th / octave below
        } else if (this._lyreMode === 'celebration') {
          // Celebration: major 3rd dominant, 5th for emphasis
          harmInterval = r < 0.50 ? 1.25 : (r < 0.80 ? 1.5 : 0.5);
        } else {
          // Default: major 3rd most common, 5th for emphasis, octave below for depth
          harmInterval = r < 0.45 ? 1.25 : (r < 0.75 ? 1.5 : 0.5);
        }
        if (this._lyreContext === 'farming') harmInterval = r < 0.6 ? 1.25 : 1.5; // warm thirds
        let harmFreq = freq * harmInterval;
        // Only harmonize if result is in comfortable range
        if (harmFreq < 1200 && harmFreq > 80) {
          let harmAmp = amp * 0.60; // 60% of melody volume
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
      // Musical rests between phrases — silence makes melodies stand out
      if (this._lyreMode === 'menu') this._lyreTimer += floor(random(180, 360) * pauseMult);
      else if (this._lyreMode === 'tense') this._lyreTimer += floor(random(20, 50) * pauseMult);
      else if (this._lyreMode === 'eerie') this._lyreTimer += floor(random(120, 240) * pauseMult);
      else if (this._lyreMode === 'celebration') this._lyreTimer += floor(random(18, 40) * pauseMult);
      else if (this._lyreMode === 'night') this._lyreTimer += floor(random(160, 320) * pauseMult); // 2-4 sec silence
      else if (this._lyreMode === 'sailing') this._lyreTimer += floor(random(40, 80) * pauseMult);
      else this._lyreTimer += floor(random(60, 140) * pauseMult); // peaceful: longer breaths
    }
  }

  // Update bass drone — follows chord progression set by melody
  _updateDrone(musicVol) {
    if (!this._droneGain) return;
    let mode = this._lyreMode;
    // Drone freq follows melody chord root (smooth glide)
    let droneFreq = this._droneRootFreq || 146.8;
    let droneVol = 0;
    if (mode === 'peaceful') { droneVol = 0.04; }
    else if (mode === 'night') { droneVol = 0.035; }
    else if (mode === 'tense') { droneVol = 0.05; }
    else if (mode === 'eerie') { droneVol = 0.03; droneFreq = 110.0; } // A2 for darker color (override)
    else if (mode === 'celebration') { droneVol = 0.04; }
    else if (mode === 'sailing') { droneVol = 0.045; }
    else if (mode === 'menu') { droneVol = 0.02; }
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
    // Smooth glide to new chord root (0.5s transition)
    this._droneOsc.freq(droneFreq, 0.5);
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
    else if (mode === 'eerie') { pulseVol = 0.015; pulseRate = 0.04; }
    else if (mode === 'menu') { pulseVol = 0.01; pulseRate = 0.03; }
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

  // ─── NOISE BUFFER HELPERS (Web Audio API for realistic textures) ───
  // Cached buffers — created once, reused for all SFX to prevent audio graph bloat
  _getCachedNoiseBuffer(type) {
    if (!this._noiseCache) this._noiseCache = {};
    let key = type || 'white';
    if (this._noiseCache[key]) return this._noiseCache[key];
    let ctx = this._getAudioCtx();
    if (!ctx) return null;
    let dur = 0.25; // quarter-second buffer covers all footsteps
    let len = Math.floor(ctx.sampleRate * dur);
    let buf = ctx.createBuffer(1, len, ctx.sampleRate);
    let data = buf.getChannelData(0);
    if (key === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) { let w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; }
    } else {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    this._noiseCache[key] = buf;
    return buf;
  }

  // Footstep rate limiter — prevents audio stacking regardless of caller
  _canPlayStep() {
    if (!this._lastStepTime) this._lastStepTime = 0;
    let now = typeof millis === 'function' ? millis() : Date.now();
    if (now - this._lastStepTime < 200) return false; // 200ms minimum between steps
    this._lastStepTime = now;
    return true;
  }

  // Lightweight footstep player — uses cached buffer, single filter→gain chain
  // Params: noiseType ('white'|'brown'), filterType, filterFreq, filterQ, volume, duration
  _playStepNoise(noiseType, filterType, freq, Q, volume, duration) {
    let ctx = this._getAudioCtx();
    if (!ctx) return;
    let buf = this._getCachedNoiseBuffer(noiseType);
    if (!buf) return;
    let vol = volume * this.vol.master * this.vol.sfx;
    if (vol < 0.001) return;
    let src = ctx.createBufferSource();
    src.buffer = buf;
    let filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = Q;
    let gain = ctx.createGain();
    let t = ctx.currentTime;
    let attack = 0.005;
    let decay = duration - attack;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  _getAudioCtx() {
    try {
      if (typeof getAudioContext === 'function') return getAudioContext();
    } catch(e) {}
    return null;
  }

  _createNoiseBuffer(duration) {
    let ctx = this._getAudioCtx();
    if (!ctx) return null;
    let sampleRate = ctx.sampleRate;
    let length = Math.floor(sampleRate * duration);
    let buffer = ctx.createBuffer(1, length, sampleRate);
    let data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _createBrownNoiseBuffer(duration) {
    let ctx = this._getAudioCtx();
    if (!ctx) return null;
    let sampleRate = ctx.sampleRate;
    let length = Math.floor(sampleRate * duration);
    let buffer = ctx.createBuffer(1, length, sampleRate);
    let data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      let white = Math.random() * 2 - 1;
      last = (last + (0.02 * white)) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  // Play filtered noise: the core of realistic SFX
  _playNoise(opts) {
    let ctx = this._getAudioCtx();
    if (!ctx) return;
    let o = Object.assign({
      type: 'white', // 'white' or 'brown'
      filterType: 'bandpass', // 'bandpass', 'lowpass', 'highpass'
      freq: 1000,
      Q: 1,
      volume: 0.1,
      duration: 0.1,
      attack: 0.005,
      decay: 0.08,
      freqEnd: null, // sweep target
      delay: 0
    }, opts);
    let run = () => {
      let buf = o.type === 'brown' ? this._createBrownNoiseBuffer(o.duration + 0.05) : this._createNoiseBuffer(o.duration + 0.05);
      if (!buf) return;
      let src = ctx.createBufferSource();
      src.buffer = buf;
      let filter = ctx.createBiquadFilter();
      filter.type = o.filterType;
      filter.frequency.setValueAtTime(o.freq, ctx.currentTime);
      filter.Q.setValueAtTime(o.Q, ctx.currentTime);
      if (o.freqEnd !== null) {
        filter.frequency.linearRampToValueAtTime(o.freqEnd, ctx.currentTime + o.duration);
      }
      let gain = ctx.createGain();
      let vol = o.volume * this.vol.master * this.vol.sfx;
      let t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + o.attack);
      gain.gain.linearRampToValueAtTime(vol * 0.7, t + o.attack + (o.duration - o.attack - o.decay) * 0.5);
      gain.gain.linearRampToValueAtTime(0, t + o.duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
      src.stop(t + o.duration + 0.05);
    };
    if (o.delay > 0) setTimeout(run, o.delay * 1000);
    else run();
  }

  // Play a tonal element via Web Audio (bypass p5 oscillator pool)
  _playTone(opts) {
    let ctx = this._getAudioCtx();
    if (!ctx) return;
    let o = Object.assign({
      type: 'sine',
      freq: 440,
      freqEnd: null,
      volume: 0.1,
      duration: 0.2,
      attack: 0.01,
      decay: 0.1,
      delay: 0
    }, opts);
    let run = () => {
      let osc = ctx.createOscillator();
      osc.type = o.type;
      let t = ctx.currentTime;
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t + o.duration);
      }
      let gain = ctx.createGain();
      let vol = o.volume * this.vol.master * this.vol.sfx;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + Math.min(o.attack, o.duration * 0.3));
      let sustainEnd = t + o.duration - o.decay;
      if (sustainEnd > t + o.attack) {
        gain.gain.linearRampToValueAtTime(vol * 0.8, sustainEnd);
      }
      gain.gain.exponentialRampToValueAtTime(0.001, t + o.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + o.duration + 0.01);
    };
    if (o.delay > 0) setTimeout(run, o.delay * 1000);
    else run();
  }

  // ─── SFX PLAYBACK ───
  playSFX(id) {
    if (!this.ready) return;
    let now = millis();
    if (this._lastPlay[id] && now - this._lastPlay[id] < this._minInterval) return;
    this._lastPlay[id] = now;

    // Try real audio sample first, fall back to procedural
    const sampleMap = {
      // Farming
      harvest: 'harvest', harvest_fruit: 'harvest_fruit', harvest_grain: 'harvest_grain',
      chop: 'wood_chop', plant_seed: 'plant_seed', crop_grow: 'crop_grow',
      // Building / Crafting
      build: 'build', repair: 'hammer', stone_mine: 'anvil', craft_complete: 'craft_complete',
      stone_place: 'stone_place', saw: 'saw', dig: 'dig',
      // UI
      click: 'click', equip: 'equip', unequip: 'unequip', hover: 'hover',
      ding: 'notification', open_menu: 'open_menu', close_menu: 'close_menu',
      inventory: 'inventory', page_turn: 'page_turn', writing: 'writing',
      // Economy
      coin: 'coin', coin_clink: 'coin', purchase: 'gold_pile', gold_pile: 'gold_pile',
      // Footsteps — deliberately omitted from sampleMap so they use the
      // lightweight procedural _playStepNoise() path in the switch below.
      // The .ogg samples caused crackling via _playSample() rapid-fire.
      // Combat
      hit: 'hit', armor_hit: 'armor_hit', punch: 'punch',
      dodge: 'dodge', whirlwind: 'whirlwind',
      shield_bash: 'shield_block', sword_swing: 'sword_swing', sword_clash: 'sword_clash',
      arrow_shoot: 'arrow_shoot', arrow_hit: 'arrow_hit',
      player_hurt: 'armor_hit', skeleton_death: 'death_enemy', death_enemy: 'death_enemy',
      battle_cry: 'battle_cry', buff: 'buff',
      // Fishing
      fish_cast: 'cast_line', fish_catch: 'fish_caught', bobber_plop: 'bobber_plop',
      fish_splash: 'fish_splash', reel: 'reel',
      // Water / Diving
      splash: 'splash', water: 'splash', bubble_pop: 'bubbles_single',
      oar_splash: 'splash', wave_crash: 'wave_crash', water_pour: 'water_pour',
      // Magic / Crystal
      crystal: 'crystal_collect', crystal_charge: 'crystal_charge',
      crystal_resonance: 'crystal_collect', heart: 'heal', heal: 'heal',
      enchant: 'enchant', magic_cast: 'magic_cast', portal: 'portal',
      // Level up / Achievement
      fanfare: 'levelup', level_up: 'levelup', skill_unlock: 'fanfare',
      achievement: 'achievement', milestone: 'fanfare',
      quest_progress: 'quest_new', quest_complete: 'quest_complete', quest_new: 'quest_new',
      era_transition: 'fanfare', upgrade: 'craft_complete',
      // Animals
      chicken_cluck: 'chicken', cat_meow: 'cat_meow', crow_caw: 'crow',
      seagull: 'seagull', owl: 'owl', frog: 'frog', wolf_howl: 'wolf_howl',
      bird_chirp: 'bird_chirp', cat_purr: 'cat_purr',
      // Nature
      thunder: 'thunder_crack', thunder_roll: 'thunder_roll',
      leaves_rustle: 'leaves_rustle', wind_gust: 'wind_gust',
      // Building interaction
      door_creak: 'door_open', door_open: 'door_open', door_close: 'door_close',
      // Sailing
      sail: 'sail_unfurl', anchor: 'anchor', ship_creak: 'ship_creak',
      // Fire
      fire_ignite: 'fire_ignite', torch: 'torch', fire_crackling: 'fire_crackling',
      // Misc
      scavenge: 'treasure_open', treasure_open: 'treasure_open',
      festival_start: 'fanfare', visitor_arrive: 'notification',
      dialogue_open: 'click', gift_accepted: 'notification', favor_up: 'notification',
      rain_drop: 'rain_drop', cricket_single: 'cricket_single',
      tree_fall: 'tree_fall', dash: 'wind_gust',
      war_horn: 'battle_cry'
    };
    if (sampleMap[id] && this._playSample(sampleMap[id])) return;

    let vol = this.vol.master * this.vol.sfx;
    let s = this._getSfxSlot();
    if (!s) return;

    // Helper: soft attack + exponential decay envelope (kept for tonal SFX)
    let play = (type, freq, amp, endFreq, dur, opts) => {
      opts = opts || {};
      s.osc.setType(type);
      s.osc.freq(freq);
      s._vol = amp * vol * 0.6;
      s._peak = s._vol;
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
      // ═══ Farming — organic pops with noise texture ═══
      case 'harvest':
        // Satisfying pop: detuned sines + bandpass noise burst for organic feel
        this._playTone({ freq: 523, freqEnd: 540, volume: 0.14, duration: 0.25, attack: 0.008 });
        this._playTone({ freq: 659, volume: 0.12, duration: 0.22, attack: 0.01, delay: 0.08 });
        this._playTone({ freq: 784, volume: 0.10, duration: 0.30, attack: 0.012, delay: 0.16 });
        // Rustling noise burst — sounds like pulling a plant
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2200, Q: 0.8, volume: 0.08, duration: 0.12, attack: 0.003, decay: 0.06 });
        // Low bandpass crunch — soil/straw texture
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 400, Q: 1.5, volume: 0.06, duration: 0.08, attack: 0.002, decay: 0.04, delay: 0.02 });
        break;
      case 'chop':
        // Axe chop: noise impact + tonal thunk
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 800, Q: 2, volume: 0.12, duration: 0.06, attack: 0.002, decay: 0.03 });
        this._playTone({ type: 'triangle', freq: 160, freqEnd: 90, volume: 0.16, duration: 0.10, attack: 0.003, decay: 0.05 });
        // Wood crack — high bandpass snap
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 3000, Q: 0.5, volume: 0.05, duration: 0.03, attack: 0.001, decay: 0.02 });
        break;
      case 'expand_rumble':
        // Deep earth rumble: brown noise + sub-bass sine
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 80, Q: 3, volume: 0.14, duration: 0.8, attack: 0.06, decay: 0.3 });
        this._playTone({ freq: 55, freqEnd: 35, volume: 0.16, duration: 0.7, attack: 0.05, decay: 0.2 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 120, Q: 2, volume: 0.08, duration: 0.5, attack: 0.1, decay: 0.2, delay: 0.15 });
        // Crumbling texture layer
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 600, Q: 1, volume: 0.04, duration: 0.4, attack: 0.08, decay: 0.15, delay: 0.1 });
        break;
      case 'build':
        // Hammer hit: noise burst + resonant low sine + wood texture
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1200, Q: 2.5, volume: 0.10, duration: 0.05, attack: 0.002, decay: 0.025 });
        this._playTone({ type: 'triangle', freq: 330, freqEnd: 220, volume: 0.12, duration: 0.15, attack: 0.005, decay: 0.08 });
        this._playTone({ freq: 165, freqEnd: 110, volume: 0.08, duration: 0.18, attack: 0.005, decay: 0.08, delay: 0.02 });
        // Resonant wood thud
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 350, Q: 3, volume: 0.06, duration: 0.08, attack: 0.002, decay: 0.04, delay: 0.01 });
        break;

      // ═══ UI — clean clicks with filtered noise transient ═══
      case 'equip':
        this._playTone({ freq: 784, volume: 0.12, duration: 0.15, attack: 0.005 });
        this._playTone({ freq: 1047, volume: 0.14, duration: 0.18, attack: 0.008, delay: 0.06 });
        // Subtle click texture
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 4000, Q: 0.5, volume: 0.03, duration: 0.02, attack: 0.001, decay: 0.01 });
        break;
      case 'click':
        // Filtered noise transient + clean sine pip
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.8, volume: 0.04, duration: 0.015, attack: 0.001, decay: 0.008 });
        this._playTone({ freq: 660, freqEnd: 440, volume: 0.08, duration: 0.04, attack: 0.002, decay: 0.02 });
        break;
      case 'ding':
        // Bell: multiple harmonics + noise shimmer
        this._playTone({ freq: 1047, volume: 0.12, duration: 0.4, attack: 0.008, decay: 0.15 });
        this._playTone({ freq: 2094, volume: 0.04, duration: 0.25, attack: 0.005, decay: 0.1 }); // overtone
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 1, volume: 0.02, duration: 0.06, attack: 0.002, decay: 0.03 });
        break;

      // ═══ Footsteps — lightweight single-node per step using cached buffers ═══
      // Previous version created 2-4 new AudioBuffers per step, flooding the audio graph.
      // Now uses _playStepNoise() helper: 1 cached buffer, 1 filter, 1 gain node per step.
      case 'step_sand':
        if (!this._canPlayStep()) break;
        this._playStepNoise('brown', 'bandpass', 350 + Math.random() * 250, 0.7, 0.035, 0.06);
        break;
      case 'step_stone':
        if (!this._canPlayStep()) break;
        this._playStepNoise('white', 'highpass', 1600 + Math.random() * 400, 0.9, 0.04, 0.04);
        break;
      case 'step_grass':
        if (!this._canPlayStep()) break;
        this._playStepNoise('brown', 'bandpass', 700 + Math.random() * 400, 0.6, 0.025, 0.05);
        break;
      case 'step_water':
        if (!this._canPlayStep()) break;
        this._playStepNoise('white', 'lowpass', 1400 + Math.random() * 600, 0.8, 0.04, 0.07);
        break;
      case 'step_wood':
        if (!this._canPlayStep()) break;
        this._playStepNoise('brown', 'bandpass', 600 + Math.random() * 200, 1.2, 0.045, 0.05);
        break;
      case 'step_sail':
        // Wind/sail swoosh — gentle breeze gust instead of footsteps on ship deck
        if (!this._canPlayStep()) break;
        this._playStepNoise('white', 'bandpass', 800 + Math.random() * 600, 0.4, 0.018, 0.12);
        // Soft rope creak undertone
        this._playStepNoise('brown', 'lowpass', 200 + Math.random() * 100, 1.5, 0.012, 0.08);
        break;
      case 'dash':
        // Breeze whoosh: sweeping bandpass noise high to low
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 3000, freqEnd: 400, Q: 0.8, volume: 0.10, duration: 0.18, attack: 0.005, decay: 0.08 });
        this._playTone({ type: 'triangle', freq: 500, freqEnd: 150, volume: 0.08, duration: 0.16, attack: 0.005, decay: 0.06 });
        break;

      // ═══ Fishing — watery splashes and plops ═══
      case 'fish_cast':
        // Line cast: sweeping noise high→low for whoosh + water impact
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 4000, freqEnd: 600, Q: 1, volume: 0.08, duration: 0.15, attack: 0.005, decay: 0.06 });
        // Splash on water
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 1500, freqEnd: 400, Q: 1.5, volume: 0.07, duration: 0.12, attack: 0.003, decay: 0.05, delay: 0.1 });
        this._playTone({ freq: 400, freqEnd: 200, volume: 0.08, duration: 0.2, attack: 0.01, decay: 0.08 });
        break;
      case 'fish_catch':
        // Happy catch: tonal chime + water splash texture
        this._playTone({ freq: 392, volume: 0.12, duration: 0.2, attack: 0.008 });
        this._playTone({ freq: 523, volume: 0.14, duration: 0.25, attack: 0.01, delay: 0.1 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1800, Q: 1, volume: 0.06, duration: 0.08, attack: 0.003, decay: 0.04 });
        // Dripping texture
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 800, Q: 2, volume: 0.04, duration: 0.1, attack: 0.005, decay: 0.05, delay: 0.08 });
        break;
      case 'bobber_plop':
        // Bobber hitting water: short noise bursts + resonant plop
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 1200, freqEnd: 300, Q: 2, volume: 0.08, duration: 0.08, attack: 0.002, decay: 0.04 });
        this._playTone({ freq: 320, freqEnd: 140, volume: 0.09, duration: 0.14, attack: 0.005, decay: 0.06 });
        // Secondary ripple
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 600, Q: 2.5, volume: 0.04, duration: 0.06, attack: 0.003, decay: 0.03, delay: 0.06 });
        break;
      case 'fish_bite':
        // Sharp tug: quick noise snap + underwater thud
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2500, Q: 2, volume: 0.10, duration: 0.04, attack: 0.001, decay: 0.02 });
        this._playTone({ freq: 500, freqEnd: 200, volume: 0.14, duration: 0.12, attack: 0.003, decay: 0.05 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 300, Q: 2, volume: 0.06, duration: 0.15, attack: 0.005, decay: 0.07, delay: 0.02 });
        break;

      // ═══ Magical — shimmer with harmonic beating ═══
      case 'crystal':
        // Multiple detuned sines for shimmer + high noise sparkle
        this._playTone({ freq: 880, volume: 0.10, duration: 0.45, attack: 0.02, decay: 0.15 });
        this._playTone({ freq: 884, volume: 0.08, duration: 0.40, attack: 0.025, decay: 0.12 }); // beat frequency
        this._playTone({ freq: 1319, volume: 0.10, duration: 0.35, attack: 0.03, delay: 0.12 });
        this._playTone({ freq: 1323, volume: 0.07, duration: 0.30, attack: 0.035, delay: 0.12 }); // beat
        // Sparkle noise
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 8000, Q: 1, volume: 0.03, duration: 0.15, attack: 0.01, decay: 0.06 });
        break;
      case 'heart':
        this._playTone({ freq: 659, volume: 0.10, duration: 0.35, attack: 0.015, decay: 0.12 });
        this._playTone({ freq: 880, volume: 0.12, duration: 0.30, attack: 0.02, delay: 0.1 });
        // Warm noise halo
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 1200, Q: 0.5, volume: 0.03, duration: 0.2, attack: 0.02, decay: 0.08 });
        break;
      case 'fanfare':
        // C5->E5->G5 with noise sparkle on each
        this._playTone({ freq: 523, volume: 0.14, duration: 0.18, attack: 0.01 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.5, volume: 0.02, duration: 0.04, attack: 0.002, decay: 0.02 });
        this._playTone({ freq: 659, volume: 0.14, duration: 0.18, attack: 0.01, delay: 0.15 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.5, volume: 0.02, duration: 0.04, attack: 0.002, decay: 0.02, delay: 0.15 });
        this._playTone({ freq: 784, volume: 0.16, duration: 0.30, attack: 0.012, delay: 0.30 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 0.5, volume: 0.025, duration: 0.06, attack: 0.003, decay: 0.03, delay: 0.30 });
        break;

      // ═══ Nature / world ═══
      case 'crab_catch':
        this._playTone({ freq: 440, freqEnd: 330, volume: 0.12, duration: 0.12, attack: 0.005, decay: 0.05 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1500, Q: 2, volume: 0.05, duration: 0.04, attack: 0.002, decay: 0.02 });
        break;
      case 'heartbeat':
        // Deep throb with sub-bass noise
        this._playTone({ freq: 55, freqEnd: 40, volume: 0.14, duration: 0.25, attack: 0.02, decay: 0.1 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 60, Q: 4, volume: 0.08, duration: 0.2, attack: 0.01, decay: 0.08 });
        break;
      case 'whoosh':
        // Wind whoosh: sweeping filtered noise
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2000, freqEnd: 400, Q: 0.6, volume: 0.08, duration: 0.2, attack: 0.01, decay: 0.08 });
        this._playTone({ type: 'triangle', freq: 300, freqEnd: 80, volume: 0.06, duration: 0.2, attack: 0.01, decay: 0.08 });
        break;
      case 'sail':
        // Rising breeze: noise sweep low→high + rising tone
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 400, freqEnd: 2000, Q: 0.6, volume: 0.08, duration: 0.4, attack: 0.04, decay: 0.15 });
        this._playTone({ type: 'triangle', freq: 220, freqEnd: 350, volume: 0.10, duration: 0.45, attack: 0.03, decay: 0.12 });
        break;
      case 'repair':
        // Tap with wood texture
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1500, Q: 2, volume: 0.08, duration: 0.04, attack: 0.002, decay: 0.02 });
        this._playTone({ type: 'triangle', freq: 380, freqEnd: 260, volume: 0.10, duration: 0.12, attack: 0.003, decay: 0.05 });
        break;
      case 'scavenge':
        this._playTone({ freq: 349, volume: 0.10, duration: 0.18, attack: 0.008 });
        this._playTone({ freq: 440, volume: 0.12, duration: 0.20, attack: 0.01, delay: 0.07 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2000, Q: 1, volume: 0.04, duration: 0.05, attack: 0.003, decay: 0.025 });
        break;

      // ═══ Combat — layered impacts with real punch ═══
      case 'hit':
        // Impact: lowpass noise burst + sine sub-bass thump + mid transient
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 800, Q: 2, volume: 0.14, duration: 0.06, attack: 0.001, decay: 0.03 });
        this._playTone({ freq: 70, freqEnd: 40, volume: 0.12, duration: 0.10, attack: 0.002, decay: 0.05 });
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 400, Q: 3, volume: 0.08, duration: 0.04, attack: 0.001, decay: 0.02, delay: 0.005 });
        break;
      case 'whirlwind':
        // Sweeping attack: noise sweep + sub-bass rumble
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 3000, freqEnd: 300, Q: 1, volume: 0.12, duration: 0.16, attack: 0.003, decay: 0.06 });
        this._playTone({ freq: 60, freqEnd: 40, volume: 0.12, duration: 0.25, attack: 0.008, decay: 0.1 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 200, Q: 3, volume: 0.08, duration: 0.2, attack: 0.005, decay: 0.08, delay: 0.01 });
        break;
      case 'dodge':
        // Quick whoosh: fast noise burst high→low
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 4000, freqEnd: 800, Q: 0.8, volume: 0.08, duration: 0.04, attack: 0.001, decay: 0.02 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 1, volume: 0.04, duration: 0.02, attack: 0.001, decay: 0.01, delay: 0.003 });
        break;
      case 'shield_bash':
        // Heavy metallic impact: noise thud + metallic ring
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 600, Q: 3, volume: 0.14, duration: 0.07, attack: 0.001, decay: 0.035 });
        this._playTone({ freq: 800, freqEnd: 600, volume: 0.08, duration: 0.08, attack: 0.002, decay: 0.04 });
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 250, Q: 4, volume: 0.08, duration: 0.05, attack: 0.001, decay: 0.025, delay: 0.005 });
        // Metallic overtone ring
        this._playTone({ freq: 2400, volume: 0.03, duration: 0.15, attack: 0.002, decay: 0.06, delay: 0.005 });
        break;
      case 'player_hurt':
        // Impact with body: lowpass noise + descending tone
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 500, Q: 2, volume: 0.12, duration: 0.06, attack: 0.002, decay: 0.03 });
        this._playTone({ freq: 150, freqEnd: 90, volume: 0.12, duration: 0.08, attack: 0.002, decay: 0.04 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 200, Q: 3, volume: 0.06, duration: 0.06, attack: 0.002, decay: 0.03, delay: 0.008 });
        break;
      case 'skill_unlock':
        // Ascending chime with sparkle noise on each note
        this._playTone({ freq: 600, volume: 0.12, duration: 0.08, attack: 0.003 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 1, volume: 0.02, duration: 0.03, attack: 0.001, decay: 0.015 });
        this._playTone({ freq: 800, volume: 0.12, duration: 0.08, attack: 0.003, delay: 0.04 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 7000, Q: 1, volume: 0.02, duration: 0.03, attack: 0.001, decay: 0.015, delay: 0.04 });
        this._playTone({ freq: 1000, volume: 0.14, duration: 0.12, attack: 0.003, delay: 0.08 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 8000, Q: 1, volume: 0.025, duration: 0.04, attack: 0.001, decay: 0.02, delay: 0.08 });
        break;

      // ═══ Diving — water with real splash textures ═══
      case 'water':
        // Splash plunge: noise sweep high→low + resonant plop
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 3000, freqEnd: 300, Q: 1.5, volume: 0.10, duration: 0.2, attack: 0.005, decay: 0.08 });
        this._playTone({ freq: 250, freqEnd: 120, volume: 0.10, duration: 0.25, attack: 0.01, decay: 0.1 });
        // Underwater resonance
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 200, Q: 3, volume: 0.06, duration: 0.15, attack: 0.02, decay: 0.06, delay: 0.08 });
        break;
      case 'bubble_pop':
        // Bubble: short bandpass burst rising in pitch
        this._playTone({ freq: 800, freqEnd: 1200, volume: 0.10, duration: 0.025, attack: 0.001, decay: 0.012 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 3000, Q: 4, volume: 0.06, duration: 0.015, attack: 0.001, decay: 0.008 });
        break;

      // ═══ Mining — dull impacts with crumble ═══
      case 'stone_mine':
        // Pick hitting stone: noise crack + resonant thud + debris crumble
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 3000, Q: 1.5, volume: 0.08, duration: 0.03, attack: 0.001, decay: 0.015 });
        this._playTone({ freq: 180, freqEnd: 120, volume: 0.14, duration: 0.07, attack: 0.002, decay: 0.035 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 400, Q: 2, volume: 0.08, duration: 0.06, attack: 0.002, decay: 0.03 });
        // Debris crumble
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1500, Q: 1, volume: 0.04, duration: 0.1, attack: 0.01, decay: 0.04, delay: 0.03 });
        break;

      // ═══ Cinematic ═══
      case 'thunder':
        // Real thunder: long noise sweep with sub-bass rumble + crackle bursts
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 120, Q: 3, volume: 0.12, duration: 0.6, attack: 0.02, decay: 0.25 });
        this._playTone({ freq: 45, freqEnd: 25, volume: 0.10, duration: 0.5, attack: 0.01, decay: 0.2 });
        // Mid rumble layer
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 200, Q: 1.5, volume: 0.06, duration: 0.4, attack: 0.03, decay: 0.15, delay: 0.05 });
        // Crackle bursts — rapid short noise hits
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 2000, Q: 1, volume: 0.05, duration: 0.02, attack: 0.001, decay: 0.01, delay: 0.01 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 2500, Q: 1, volume: 0.04, duration: 0.015, attack: 0.001, decay: 0.008, delay: 0.04 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 1800, Q: 1.5, volume: 0.04, duration: 0.02, attack: 0.001, decay: 0.01, delay: 0.08 });
        break;
      case 'seagull':
        // Seagull cry: two-part sine sweep with noise breath
        this._playTone({ freq: 2800, freqEnd: 2200, volume: 0.08, duration: 0.12, attack: 0.005, decay: 0.04 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 3000, Q: 3, volume: 0.03, duration: 0.08, attack: 0.003, decay: 0.03 });
        this._playTone({ freq: 2400, freqEnd: 1900, volume: 0.06, duration: 0.10, attack: 0.005, decay: 0.04, delay: 0.08 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2500, Q: 3, volume: 0.02, duration: 0.06, attack: 0.003, decay: 0.025, delay: 0.08 });
        break;
      case 'oar_splash':
        // Oar entering water: noise splash + tonal plop
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 1500, freqEnd: 400, Q: 1.5, volume: 0.06, duration: 0.12, attack: 0.005, decay: 0.05 });
        this._playTone({ type: 'triangle', freq: 200, freqEnd: 100, volume: 0.06, duration: 0.14, attack: 0.008, decay: 0.05 });
        break;

      // ═══ Ambient animals ═══
      case 'chicken_cluck':
        // Two-part cluck with noise texture
        this._playTone({ freq: 800, freqEnd: 600, volume: 0.05, duration: 0.035, attack: 0.001, decay: 0.015 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2000, Q: 3, volume: 0.02, duration: 0.02, attack: 0.001, decay: 0.01 });
        this._playTone({ freq: 750, freqEnd: 550, volume: 0.04, duration: 0.03, attack: 0.001, decay: 0.012, delay: 0.04 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1800, Q: 3, volume: 0.015, duration: 0.015, attack: 0.001, decay: 0.008, delay: 0.04 });
        break;
      case 'cat_meow':
        // Meow: sweeping tone with noise breath
        this._playTone({ freq: 700, freqEnd: 500, volume: 0.05, duration: 0.1, attack: 0.008, decay: 0.04 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2500, Q: 2, volume: 0.02, duration: 0.08, attack: 0.005, decay: 0.03 });
        this._playTone({ freq: 600, freqEnd: 400, volume: 0.04, duration: 0.08, attack: 0.005, decay: 0.03, delay: 0.06 });
        break;
      case 'crow_caw':
        // Crow: harsh descending tone with noise rasp
        this._playTone({ type: 'sawtooth', freq: 400, freqEnd: 200, volume: 0.05, duration: 0.15, attack: 0.005, decay: 0.06 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1200, Q: 2, volume: 0.04, duration: 0.12, attack: 0.003, decay: 0.05 });
        break;
      case 'tortoise_blip':
        this._playTone({ freq: 150, freqEnd: 140, volume: 0.03, duration: 0.05, attack: 0.003, decay: 0.02 });
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 300, Q: 3, volume: 0.01, duration: 0.03, attack: 0.002, decay: 0.015 });
        break;
      case 'skeleton_death':
        // Bone crumble: noise cascade + descending thud
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 1500, Q: 1.5, volume: 0.10, duration: 0.15, attack: 0.003, decay: 0.06 });
        this._playTone({ type: 'triangle', freq: 200, freqEnd: 80, volume: 0.10, duration: 0.18, attack: 0.003, decay: 0.08 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 3000, Q: 1, volume: 0.05, duration: 0.1, attack: 0.005, decay: 0.04, delay: 0.04 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 200, Q: 2, volume: 0.06, duration: 0.12, attack: 0.005, decay: 0.05, delay: 0.05 });
        break;

      // ═══ Time/Season transitions ═══
      case 'season_change':
        this._playTone({ freq: 440, volume: 0.10, duration: 0.35, attack: 0.015, decay: 0.12 });
        this._playTone({ freq: 660, volume: 0.10, duration: 0.30, attack: 0.02, delay: 0.15 });
        this._playTone({ freq: 523, volume: 0.08, duration: 0.30, attack: 0.02, delay: 0.30 });
        this._playTone({ freq: 784, volume: 0.08, duration: 0.28, attack: 0.02, delay: 0.42 });
        // Ambient shimmer
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 0.5, volume: 0.02, duration: 0.3, attack: 0.03, decay: 0.12, delay: 0.1 });
        break;
      case 'dawn_transition':
        // Rising birdsong-like chirps with breath noise
        this._playTone({ freq: 880, freqEnd: 1100, volume: 0.07, duration: 0.12, attack: 0.01 });
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 4000, Q: 2, volume: 0.02, duration: 0.06, attack: 0.005, decay: 0.03 });
        this._playTone({ freq: 1047, freqEnd: 1200, volume: 0.06, duration: 0.11, attack: 0.008, delay: 0.15 });
        this._playTone({ freq: 1175, freqEnd: 1320, volume: 0.05, duration: 0.10, attack: 0.008, delay: 0.30 });
        this._playTone({ freq: 1320, volume: 0.05, duration: 0.18, attack: 0.01, delay: 0.44 });
        this._playTone({ freq: 1568, volume: 0.04, duration: 0.15, attack: 0.012, delay: 0.50 });
        break;
      case 'dusk_transition':
        // Soft descending tones with warm noise
        this._playTone({ freq: 660, freqEnd: 550, volume: 0.06, duration: 0.18, attack: 0.015, decay: 0.07 });
        this._playTone({ freq: 523, freqEnd: 440, volume: 0.05, duration: 0.20, attack: 0.015, delay: 0.20 });
        this._playTone({ freq: 392, freqEnd: 330, volume: 0.04, duration: 0.25, attack: 0.02, delay: 0.42 });
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 600, Q: 0.5, volume: 0.015, duration: 0.3, attack: 0.03, decay: 0.12, delay: 0.1 });
        break;
      case 'dusk_lanterns':
        this._playTone({ freq: 587, freqEnd: 550, volume: 0.05, duration: 0.30, attack: 0.025, decay: 0.1 });
        this._playTone({ freq: 440, freqEnd: 420, volume: 0.04, duration: 0.35, attack: 0.02, delay: 0.35 });
        this._playTone({ freq: 370, freqEnd: 350, volume: 0.035, duration: 0.40, attack: 0.025, delay: 0.75 });
        break;

      // ═══ Festival / Economy / Quests ═══
      case 'festival_start':
        this._playTone({ freq: 523, volume: 0.14, duration: 0.15, attack: 0.008 });
        this._playTone({ freq: 784, volume: 0.12, duration: 0.15, attack: 0.01, delay: 0.06 });
        this._playTone({ freq: 659, volume: 0.12, duration: 0.14, attack: 0.01, delay: 0.12 });
        this._playTone({ freq: 988, volume: 0.10, duration: 0.14, attack: 0.012, delay: 0.18 });
        this._playTone({ freq: 784, volume: 0.10, duration: 0.12, attack: 0.012, delay: 0.24 });
        this._playTone({ freq: 1175, volume: 0.08, duration: 0.20, attack: 0.015, delay: 0.30 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.5, volume: 0.03, duration: 0.15, attack: 0.01, decay: 0.06, delay: 0.25 });
        break;
      case 'purchase':
        this._playTone({ freq: 440, volume: 0.10, duration: 0.18, attack: 0.008 });
        this._playTone({ freq: 660, volume: 0.12, duration: 0.18, attack: 0.01, delay: 0.08 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 4000, Q: 1, volume: 0.03, duration: 0.02, attack: 0.001, decay: 0.01 });
        break;
      case 'quest_progress':
        this._playTone({ freq: 600, freqEnd: 800, volume: 0.10, duration: 0.16, attack: 0.008, decay: 0.06 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 1, volume: 0.02, duration: 0.04, attack: 0.002, decay: 0.02 });
        break;
      case 'upgrade':
        this._playTone({ freq: 660, volume: 0.12, duration: 0.15, attack: 0.008 });
        this._playTone({ freq: 880, volume: 0.12, duration: 0.15, attack: 0.01, delay: 0.10 });
        this._playTone({ freq: 1047, volume: 0.10, duration: 0.25, attack: 0.012, delay: 0.20 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 0.5, volume: 0.025, duration: 0.06, attack: 0.003, decay: 0.03, delay: 0.20 });
        break;
      case 'hover':
        this._playTone({ freq: 880, freqEnd: 660, volume: 0.04, duration: 0.03, attack: 0.002, decay: 0.015 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 1, volume: 0.015, duration: 0.01, attack: 0.001, decay: 0.005 });
        break;

      // ═══ Level up / Achievement / Era ═══
      case 'level_up':
        // Triumphant D major arpeggio with noise sparkle
        this._playTone({ freq: 293.7, volume: 0.14, duration: 0.18, attack: 0.01 });
        this._playTone({ freq: 440, volume: 0.14, duration: 0.18, attack: 0.012, delay: 0.12 });
        this._playTone({ freq: 587.3, volume: 0.16, duration: 0.18, attack: 0.012, delay: 0.24 });
        this._playTone({ freq: 880, volume: 0.18, duration: 0.35, attack: 0.015, delay: 0.36 });
        // Sparkle noise on each note
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.5, volume: 0.02, duration: 0.03, attack: 0.001, decay: 0.015 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, Q: 0.5, volume: 0.02, duration: 0.03, attack: 0.001, decay: 0.015, delay: 0.12 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 7000, Q: 0.5, volume: 0.025, duration: 0.04, attack: 0.001, decay: 0.02, delay: 0.36 });
        break;
      case 'achievement':
        // Fast ascending sparkle arpeggio
        this._playTone({ freq: 880, volume: 0.10, duration: 0.06, attack: 0.002 });
        this._playTone({ freq: 1047, volume: 0.10, duration: 0.06, attack: 0.002, delay: 0.04 });
        this._playTone({ freq: 1319, volume: 0.12, duration: 0.08, attack: 0.003, delay: 0.08 });
        this._playTone({ freq: 1760, volume: 0.10, duration: 0.30, attack: 0.003, delay: 0.12 });
        // Shimmer: detuned pair for beating
        this._playTone({ freq: 1764, volume: 0.06, duration: 0.25, attack: 0.005, delay: 0.12 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 8000, Q: 1, volume: 0.025, duration: 0.1, attack: 0.005, decay: 0.04, delay: 0.12 });
        break;
      case 'era_transition':
        // Dramatic swell: noise rumble rising to bright chord
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 80, freqEnd: 200, Q: 3, volume: 0.10, duration: 0.6, attack: 0.15, decay: 0.2 });
        this._playTone({ type: 'triangle', freq: 110, freqEnd: 220, volume: 0.12, duration: 0.55, attack: 0.15, decay: 0.15 });
        this._playTone({ freq: 440, volume: 0.12, duration: 0.45, attack: 0.12, delay: 0.15 });
        this._playTone({ freq: 587.3, volume: 0.10, duration: 0.40, attack: 0.10, delay: 0.28 });
        this._playTone({ freq: 880, volume: 0.10, duration: 0.40, attack: 0.08, delay: 0.40 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 4000, Q: 0.5, volume: 0.03, duration: 0.2, attack: 0.03, decay: 0.08, delay: 0.40 });
        break;

      // ═══ Crystal / Magic ═══
      case 'crystal_resonance':
        // Ethereal shimmer: detuned sines beating + high noise sparkle
        this._playTone({ freq: 1047, volume: 0.08, duration: 0.55, attack: 0.025, decay: 0.15 });
        this._playTone({ freq: 1052, volume: 0.06, duration: 0.50, attack: 0.03, decay: 0.12 }); // 5Hz beat
        this._playTone({ freq: 1568, volume: 0.05, duration: 0.40, attack: 0.04, decay: 0.12, delay: 0.08 });
        this._playTone({ freq: 1575, volume: 0.03, duration: 0.35, attack: 0.045, delay: 0.08 }); // beat
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 8000, Q: 1.5, volume: 0.02, duration: 0.3, attack: 0.02, decay: 0.1 });
        break;
      case 'crystal_charge':
        // Rising shimmer with detuned pair
        this._playTone({ freq: 880, freqEnd: 1320, volume: 0.10, duration: 0.35, attack: 0.025, decay: 0.1 });
        this._playTone({ freq: 885, freqEnd: 1325, volume: 0.07, duration: 0.35, attack: 0.03, decay: 0.1 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 6000, freqEnd: 10000, Q: 1, volume: 0.025, duration: 0.3, attack: 0.02, decay: 0.1 });
        break;

      // ═══ Raid / Defense ═══
      case 'war_horn':
        // Deep horn blast: triangle wave swell + noise breath
        this._playTone({ type: 'triangle', freq: 146.8, freqEnd: 165, volume: 0.16, duration: 0.6, attack: 0.08, decay: 0.2 });
        this._playTone({ type: 'triangle', freq: 220, freqEnd: 247, volume: 0.10, duration: 0.5, attack: 0.10, decay: 0.15, delay: 0.05 });
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 250, Q: 2, volume: 0.06, duration: 0.5, attack: 0.06, decay: 0.2 });
        // Second blast
        this._playTone({ type: 'triangle', freq: 165, freqEnd: 146.8, volume: 0.14, duration: 0.5, attack: 0.06, decay: 0.15, delay: 0.65 });
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 200, Q: 2, volume: 0.05, duration: 0.4, attack: 0.05, decay: 0.15, delay: 0.65 });
        break;

      // ═══ Legion / March ═══
      case 'legion_march':
        // Marching stomps with ground impact noise
        this._playTone({ type: 'triangle', freq: 80, freqEnd: 50, volume: 0.14, duration: 0.08, attack: 0.003, decay: 0.04 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 120, Q: 3, volume: 0.10, duration: 0.06, attack: 0.002, decay: 0.03 });
        // Second stomp
        this._playTone({ type: 'triangle', freq: 75, freqEnd: 45, volume: 0.12, duration: 0.07, attack: 0.003, decay: 0.035, delay: 0.16 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 110, Q: 3, volume: 0.08, duration: 0.05, attack: 0.002, decay: 0.025, delay: 0.16 });
        // Third stomp
        this._playTone({ type: 'triangle', freq: 80, freqEnd: 50, volume: 0.14, duration: 0.08, attack: 0.003, decay: 0.04, delay: 0.33 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 120, Q: 3, volume: 0.10, duration: 0.06, attack: 0.002, decay: 0.03, delay: 0.33 });
        // Fourth stomp
        this._playTone({ type: 'triangle', freq: 75, freqEnd: 45, volume: 0.12, duration: 0.07, attack: 0.003, decay: 0.035, delay: 0.50 });
        this._playNoise({ type: 'brown', filterType: 'lowpass', freq: 110, Q: 3, volume: 0.08, duration: 0.05, attack: 0.002, decay: 0.025, delay: 0.50 });
        break;

      // ═══ NPC / Visitor / Dialogue ═══
      case 'visitor_arrive':
        this._playTone({ freq: 523, volume: 0.10, duration: 0.2, attack: 0.01 });
        this._playTone({ freq: 659, volume: 0.10, duration: 0.2, attack: 0.012, delay: 0.10 });
        this._playTone({ freq: 784, volume: 0.08, duration: 0.28, attack: 0.012, delay: 0.20 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.5, volume: 0.02, duration: 0.04, attack: 0.002, decay: 0.02, delay: 0.15 });
        break;
      case 'dialogue_open':
        this._playTone({ freq: 440, freqEnd: 494, volume: 0.06, duration: 0.15, attack: 0.015, decay: 0.05 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 4000, Q: 1, volume: 0.015, duration: 0.03, attack: 0.003, decay: 0.015 });
        break;
      case 'gift_accepted':
        this._playTone({ freq: 440, volume: 0.10, duration: 0.2, attack: 0.01 });
        this._playTone({ freq: 554, volume: 0.10, duration: 0.2, attack: 0.012, delay: 0.08 });
        this._playTone({ freq: 659, volume: 0.08, duration: 0.25, attack: 0.012, delay: 0.16 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.5, volume: 0.02, duration: 0.04, attack: 0.002, decay: 0.02, delay: 0.10 });
        break;
      case 'favor_up':
        this._playTone({ freq: 784, volume: 0.10, duration: 0.10, attack: 0.005 });
        this._playTone({ freq: 988, volume: 0.10, duration: 0.10, attack: 0.005, delay: 0.06 });
        this._playTone({ freq: 1175, volume: 0.08, duration: 0.25, attack: 0.008, delay: 0.13 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 7000, Q: 1, volume: 0.02, duration: 0.05, attack: 0.002, decay: 0.02, delay: 0.13 });
        break;

      // ═══ Building interaction ═══
      case 'door_creak':
        // Creak: filtered noise sweep + descending tone
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 800, freqEnd: 300, Q: 4, volume: 0.06, duration: 0.12, attack: 0.005, decay: 0.05 });
        this._playTone({ type: 'sawtooth', freq: 200, freqEnd: 80, volume: 0.06, duration: 0.12, attack: 0.005, decay: 0.05 });
        break;

      // ═══ Coin / Purchase ═══
      case 'coin_clink':
        // Metallic ping with harmonic overtones + noise shimmer
        this._playTone({ freq: 2000, freqEnd: 1600, volume: 0.08, duration: 0.05, attack: 0.001, decay: 0.025 });
        this._playTone({ freq: 2400, freqEnd: 2000, volume: 0.04, duration: 0.035, attack: 0.001, decay: 0.018, delay: 0.01 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 8000, Q: 2, volume: 0.03, duration: 0.02, attack: 0.001, decay: 0.01 });
        break;

      // ═══ Milestone / Level milestones ═══
      case 'milestone':
        // D4-F#4-A4-D5 ascending triangle fanfare with noise sparkle
        this._playTone({ type: 'triangle', freq: 293.7, volume: 0.14, duration: 0.10, attack: 0.005 });
        this._playTone({ type: 'triangle', freq: 370, volume: 0.14, duration: 0.10, attack: 0.005, delay: 0.08 });
        this._playTone({ type: 'triangle', freq: 440, volume: 0.16, duration: 0.10, attack: 0.006, delay: 0.16 });
        this._playTone({ type: 'triangle', freq: 587.3, volume: 0.18, duration: 0.25, attack: 0.006, delay: 0.24 });
        this._playNoise({ type: 'white', filterType: 'highpass', freq: 5000, Q: 0.5, volume: 0.025, duration: 0.08, attack: 0.003, decay: 0.04, delay: 0.24 });
        break;

      // ═══ Home sunrise ═══
      case 'home_sunrise_chord':
        // Sustained warm D major chord with ambient noise halo
        this._playTone({ freq: 293.7, volume: 0.08, duration: 2.2, attack: 0.35, decay: 0.5 });
        this._playTone({ freq: 370, volume: 0.06, duration: 2.1, attack: 0.35, decay: 0.45, delay: 0.04 });
        this._playTone({ freq: 440, volume: 0.05, duration: 2.0, attack: 0.30, decay: 0.4, delay: 0.08 });
        // Warm ambient noise halo
        this._playNoise({ type: 'brown', filterType: 'bandpass', freq: 500, Q: 0.3, volume: 0.015, duration: 1.5, attack: 0.3, decay: 0.5, delay: 0.2 });
        break;

      // ═══ Photo mode ═══
      case 'shutter_click':
        // Shutter snap: fast noise burst (mechanical click)
        this._playNoise({ type: 'white', filterType: 'bandpass', freq: 2000, Q: 2, volume: 0.08, duration: 0.02, attack: 0.001, decay: 0.01 });
        this._playNoise({ type: 'white', filterType: 'lowpass', freq: 800, Q: 1, volume: 0.04, duration: 0.025, attack: 0.001, decay: 0.012, delay: 0.015 });
        break;
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

  // ─── DIALOG TYPEWRITER BLIPS ───
  // Short sine pip per character during typewriter text reveal.
  // Each NPC has a distinct pitch for personality.
  playDialogBlip(npcName) {
    if (!this.ready) return;
    let vol = this.vol.master * this.vol.sfx * 0.15;
    if (vol < 0.001) return;
    let freqs = { livia: 440, marcus: 280, vesta: 520, felix: 360 };
    let freq = freqs[npcName] || 380;
    freq *= (0.97 + Math.random() * 0.06);
    let s = this._getSfxSlot();
    if (!s) return;
    s.osc.setType('sine');
    s.osc.freq(freq);
    s._vol = vol;
    s._peak = vol;
    s.gain.amp(vol, 0.005);
    setTimeout(() => { s.gain.amp(0, 0.015); }, 30);
  }

  // ─── NARRATION PLAYBACK ───
  playNarration(key) {
    if (!this.ready) return;
    let sampleKey = 'narr_' + key;
    if (!this._samples[sampleKey]) return;
    if (!state._narrationsPlayed) state._narrationsPlayed = [];
    if (state._narrationsPlayed.includes(key)) return;
    state._narrationsPlayed.push(key);
    // Duck music volume
    let musicKey = this._musicTrack;
    let musicSample = musicKey ? this._samples[musicKey] : null;
    if (musicSample && musicSample.isPlaying()) musicSample.setVolume(this.vol.master * this.vol.music * 0.25);
    // Play narration
    this._playSample(sampleKey, 1.2);
    // Show subtitle
    if (typeof _showNarrationSubtitle === 'function') _showNarrationSubtitle(key);
    // Restore music after ~5 seconds
    setTimeout(() => {
      if (musicSample && musicSample.isPlaying()) musicSample.setVolume(this.vol.master * this.vol.music);
    }, 5000);
  }

  // Resume AudioContext on user gesture (required by browsers)
  resume() {
    try {
      if (typeof getAudioContext === 'function') {
        let ctx = getAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            // AudioContext resumed
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
