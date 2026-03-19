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
    // Cricket oscillator (reused)
    this._cricketOsc = null;
    this._cricketGain = null;
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

      // Cricket (sine, high freq gated)
      this._cricketOsc = new p5.Oscillator('sine');
      this._cricketGain = new p5.Gain();
      this._cricketOsc.disconnect();
      this._cricketOsc.connect(this._cricketGain);
      this._cricketGain.connect();
      this._cricketGain.amp(0);
      this._cricketOsc.start();
      this._cricketOsc.freq(4200);
      this._cricketOsc.amp(0);

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

      // SFX pool: 4 oscillators (osc at full amp, volume via gain node only)
      for (let i = 0; i < 4; i++) {
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

      this.ready = true;
      console.log('[SoundManager] init OK — 3 lyre voices, 4 sfx slots, ambient layers ready');
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

    // ─── Waves ───
    let waveMute = (island === 'hyperborea' || island === 'necropolis');
    let waveVol = waveMute ? 0 : (0.06 + (1 - bright) * 0.04) * masterVol;
    if (diving) waveVol = 0.12 * masterVol; // louder underwater
    if (onBridge) waveVol = 0.10 * masterVol; // water close below
    this._waveGain.amp(waveVol, 0.3);
    let waveFreq = 300 + sin(frameCount * 0.003) * 80;
    if (diving) waveFreq = 180 + sin(frameCount * 0.002) * 40;
    if (onBridge) waveFreq = 220 + sin(frameCount * 0.004) * 60; // deeper, closer water
    this._waveFilter.freq(waveFreq);

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

    // ─── Crickets ───
    let cricketVol = bright < 0.3 ? (0.3 - bright) * 0.08 * masterVol : 0;
    if (diving) cricketVol = 0;
    let gate = sin(frameCount * 0.5) > 0.3 ? 1 : 0;
    this._cricketGain.amp(cricketVol * gate, 0.02);
    this._cricketOsc.freq(4200 + sin(frameCount * 0.07) * 200);

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
  }

  // --- LYRE MODE API ---
  setLyreMode(mode) {
    if (mode === this._lyreMode) return;
    this._lyreMode = mode;
    this._lyreNoteIdx = 0;
    this._lyrePhrase = 0;
    this._lyreTimer = 0;
  }

  // --- ROMAN LYRE --- Procedural background music ---
  updateLyre() {
    if (!this.ready || this._lyreVoices.length < 3) return;
    let musicVol = this.vol.master * this.vol.music;
    if (musicVol < 0.01) return;

    // Auto-detect lyre mode from game state
    if (typeof gameScreen !== 'undefined' && (gameScreen === 'menu' || gameScreen === 'settings' || gameScreen === 'credits')) {
      if (this._lyreMode !== 'menu') this.setLyreMode('menu');
    } else if (typeof state !== 'undefined') {
      if (state.necropolis && state.necropolis.active) {
        if (this._lyreMode !== 'eerie') this.setLyreMode('eerie');
      } else if (state.conquest && state.conquest.active) {
        if (this._lyreMode !== 'tense') this.setLyreMode('tense');
      } else if (state.festival) {
        if (this._lyreMode !== 'celebration') this.setLyreMode('celebration');
      } else if (state.rowing && state.rowing.active) {
        if (this._lyreMode !== 'sailing') this.setLyreMode('sailing');
      } else if (state.time >= 1200 || state.time < 300) {
        if (this._lyreMode !== 'night') this.setLyreMode('night');
      } else {
        if (this._lyreMode !== 'peaceful') this.setLyreMode('peaceful');
      }
    }

    this._lyreTimer--;
    if (this._lyreTimer > 0) return;

    // Dorian: D E F G A Bb C D E F G A
    let dorian = [293.7, 329.6, 349.2, 392.0, 440.0, 466.2, 523.3, 587.3, 659.3, 698.5, 784.0, 880.0];
    // Phrygian on D: D Eb F G A Bb C (flat 2nd for tension)
    let phrygian = [293.7, 311.1, 349.2, 392.0, 440.0, 466.2, 523.3, 587.3, 622.3, 698.5, 784.0, 880.0];

    let scale, phrases;

    if (this._lyreMode === 'menu') {
      scale = dorian;
      // Contemplative: 2-3 notes per phrase, long pauses, very quiet
      phrases = [
        [[0,80,0.3,0],[-1,120,0,0],[4,90,0.25,1],[-1,180,0,0]],
        [[3,90,0.28,0],[-1,150,0,0],[0,100,0.22,1],[-1,200,0,0]],
        [[4,100,0.25,0],[7,80,0.20,1],[-1,160,0,0],[4,90,0.22,0],[-1,220,0,0]],
        [[0,110,0.26,0],[-1,140,0,0],[3,80,0.22,1],[0,100,0.20,2],[-1,250,0,0]],
      ];
    } else if (this._lyreMode === 'tense') {
      scale = phrygian;
      phrases = [
        [[0,25,0.7,0],[1,25,0.6,1],[3,30,0.8,0],[4,25,0.7,1],[5,30,0.6,0],[-1,10,0,0],
         [3,25,0.7,0],[1,25,0.6,1],[0,35,0.8,0],[-1,30,0,0]],
        [[0,20,0.6,0],[0,80,0.3,2],[3,20,0.7,0],[4,25,0.8,1],[7,30,0.9,0],[-1,15,0,0],
         [5,25,0.6,0],[4,20,0.7,1],[3,25,0.6,0],[0,30,0.7,0],[-1,25,0,0]],
        [[7,20,0.8,0],[5,20,0.6,1],[-1,8,0,0],[4,20,0.7,0],[1,20,0.6,1],[0,25,0.8,0],[-1,12,0,0],
         [3,20,0.7,0],[4,25,0.7,1],[7,30,0.8,0],[-1,40,0,0]],
      ];
    } else if (this._lyreMode === 'eerie') {
      scale = dorian;
      phrases = [
        [[0,90,0.4,0],[-1,60,0,0],[3,80,0.3,1],[-1,80,0,0],[0,100,0.3,2],[-1,100,0,0]],
        [[5,80,0.35,0],[-1,70,0,0],[3,90,0.3,0],[-1,90,0,0],[0,110,0.25,1],[-1,120,0,0]],
        [[0,100,0.3,0],[0,150,0.15,2],[-1,50,0,0],[1,80,0.3,0],[-1,100,0,0],[0,90,0.25,1],[-1,130,0,0]],
      ];
    } else if (this._lyreMode === 'celebration') {
      // Festival mode: fast tempo, trills, wide intervals, bright and joyful
      scale = dorian;
      phrases = [
        [[4,20,0.8,0],[7,20,0.7,1],[4,20,0.6,0],[5,20,0.7,1],[7,25,0.8,0],[9,20,0.7,1],[-1,10,0,0],
         [7,20,0.7,0],[5,20,0.6,1],[4,25,0.8,0],[2,20,0.6,0],[4,30,0.7,1],[-1,20,0,0]],
        [[0,15,0.7,0],[2,15,0.6,1],[4,15,0.7,0],[7,20,0.8,1],[9,20,0.7,0],[7,15,0.6,1],[-1,8,0,0],
         [4,15,0.7,0],[2,15,0.6,1],[0,20,0.7,0],[4,25,0.8,1],[7,30,0.9,0],[-1,25,0,0]],
        [[7,15,0.8,0],[7,15,0.6,1],[5,15,0.7,0],[4,20,0.7,1],[2,15,0.6,0],[4,15,0.7,1],[-1,10,0,0],
         [5,15,0.7,0],[7,20,0.8,1],[9,25,0.9,0],[7,20,0.7,0],[4,30,0.8,1],[-1,30,0,0]],
        // Trill phrase: rapid alternation 4-5-4-5 then leap up
        [[4,10,0.7,0],[5,10,0.6,1],[4,10,0.7,0],[5,10,0.6,1],[4,10,0.7,0],[5,10,0.7,1],[-1,6,0,0],
         [7,15,0.8,0],[9,15,0.7,1],[11,20,0.9,0],[-1,8,0,0],[7,15,0.7,0],[4,20,0.8,1],[-1,20,0,0]],
        // Wide leaps: octave jumps with harmony
        [[0,12,0.8,0],[7,12,0.7,1],[-1,6,0,0],[0,12,0.7,0],[4,12,0.8,1],[7,15,0.9,0],[9,12,0.7,1],[-1,6,0,0],
         [11,15,0.9,0],[9,12,0.7,1],[7,12,0.8,0],[4,15,0.7,1],[0,20,0.8,0],[-1,25,0,0]],
      ];
    } else if (this._lyreMode === 'night') {
      // Night mode: long sustained notes, wide spacing, bass drone on voice 2
      scale = dorian;
      phrases = [
        [[0,130,0.35,0],[0,200,0.12,2],[-1,80,0,0],[3,110,0.30,1],[-1,100,0,0],
         [4,140,0.28,0],[-1,120,0,0],[0,160,0.20,2],[-1,150,0,0]],
        [[5,120,0.30,0],[0,220,0.10,2],[-1,90,0,0],[3,130,0.25,1],[-1,110,0,0],
         [0,150,0.28,0],[-1,140,0,0]],
        [[4,100,0.30,0],[3,110,0.25,1],[0,200,0.10,2],[-1,100,0,0],[0,130,0.25,0],[-1,130,0,0],
         [2,110,0.22,1],[0,160,0.28,0],[-1,180,0,0]],
        // Sparse single notes with long drone underneath
        [[7,140,0.25,0],[0,250,0.10,2],[-1,120,0,0],[4,120,0.22,1],[-1,140,0,0],
         [3,130,0.20,0],[-1,160,0,0],[0,180,0.25,0],[0,200,0.08,2],[-1,200,0,0]],
        // Very sparse — just two high notes over bass
        [[4,160,0.22,0],[0,280,0.08,2],[-1,180,0,0],[5,140,0.20,1],[-1,220,0,0]],
      ];
    } else if (this._lyreMode === 'sailing') {
      // Sailing: adventurous, ascending contour, pentatonic feel (D E G A B = 0,1,3,4,5 in dorian)
      scale = dorian;
      phrases = [
        // Ascending run with momentum
        [[0,35,0.7,0],[1,30,0.6,1],[3,30,0.7,0],[4,35,0.8,1],[7,40,0.9,0],[-1,15,0,0],
         [4,30,0.6,0],[3,35,0.7,1],[4,40,0.8,0],[7,50,0.7,1],[-1,40,0,0]],
        // Call and response: voice 0 ascends, voice 1 answers
        [[0,40,0.7,0],[3,35,0.6,0],[4,35,0.7,0],[-1,20,0,0],
         [7,40,0.7,1],[4,35,0.6,1],[3,40,0.7,1],[-1,15,0,0],
         [4,45,0.8,0],[7,50,0.7,1],[9,55,0.8,0],[-1,50,0,0]],
        // Rolling wave rhythm with bass anchor
        [[0,50,0.6,0],[0,100,0.15,2],[4,30,0.7,0],[7,30,0.6,1],[4,30,0.7,0],[3,35,0.6,1],[-1,12,0,0],
         [4,30,0.7,0],[7,35,0.8,0],[9,40,0.7,1],[7,45,0.6,0],[-1,60,0,0]],
        // Triumphant high phrase
        [[4,30,0.6,0],[7,30,0.7,1],[9,35,0.8,0],[11,40,0.9,0],[9,30,0.7,1],[-1,10,0,0],
         [7,35,0.7,0],[4,40,0.6,1],[0,50,0.7,0],[-1,70,0,0]],
      ];
    } else {
      // Peaceful: warm Mediterranean, varied melodic phrases
      scale = dorian;
      phrases = [
        [[4,50,0.7,0],[7,50,0.5,1],[-1,20,0,0],[5,45,0.6,0],[3,55,0.7,0],[4,60,0.5,1],[-1,35,0,0],
         [2,40,0.6,0],[3,45,0.5,1],[4,70,0.8,0],[-1,80,0,0]],
        [[0,55,0.6,0],[0,120,0.3,2],[2,45,0.5,0],[4,50,0.7,0],[5,60,0.6,1],[7,70,0.8,0],[-1,25,0,0],
         [5,45,0.5,0],[4,50,0.6,0],[2,55,0.5,1],[0,80,0.7,0],[-1,90,0,0]],
        [[7,65,0.7,0],[4,55,0.5,1],[-1,30,0,0],[3,50,0.6,0],[7,60,0.7,0],[8,70,0.8,0],[-1,20,0,0],
         [5,50,0.5,1],[3,60,0.6,0],[0,80,0.7,0],[-1,100,0,0]],
        [[4,30,0.6,0],[5,30,0.5,1],[7,35,0.7,0],[5,30,0.5,0],[4,35,0.6,1],[2,30,0.5,0],[-1,15,0,0],
         [4,30,0.7,0],[7,40,0.8,0],[9,35,0.6,1],[7,45,0.7,0],[4,55,0.6,0],[-1,70,0,0]],
        [[0,70,0.5,0],[4,65,0.4,1],[0,130,0.2,2],[-1,30,0,0],[2,60,0.5,0],[4,70,0.6,0],
         [7,80,0.7,0],[4,90,0.5,1],[0,100,0.6,0],[-1,120,0,0]],
        // Ascending run — scale walk up with pauses
        [[0,40,0.6,0],[1,35,0.5,1],[2,35,0.6,0],[3,40,0.7,1],[4,45,0.8,0],[-1,25,0,0],
         [5,40,0.6,1],[7,50,0.8,0],[-1,20,0,0],[4,45,0.6,0],[2,50,0.5,1],[0,70,0.7,0],[-1,90,0,0]],
        // Call-and-response: voice 0 plays, voice 1 echoes lower
        [[4,50,0.7,0],[7,45,0.6,0],[-1,25,0,0],[2,50,0.5,1],[4,45,0.5,1],[-1,30,0,0],
         [5,55,0.7,0],[7,50,0.7,0],[-1,20,0,0],[3,50,0.5,1],[0,60,0.6,1],[-1,100,0,0]],
        // Two voices in harmony (thirds)
        [[0,55,0.6,0],[2,55,0.5,1],[-1,20,0,0],[2,50,0.6,0],[4,50,0.5,1],[-1,20,0,0],
         [4,55,0.7,0],[5,55,0.5,1],[-1,15,0,0],[7,60,0.8,0],[9,60,0.5,1],[-1,25,0,0],
         [4,50,0.6,0],[5,50,0.5,1],[0,80,0.7,0],[-1,100,0,0]],
      ];
    }

    let phrase = phrases[this._lyrePhrase % phrases.length];
    let note = phrase[this._lyreNoteIdx % phrase.length];
    let [ni, dur, vel, voice] = note;

    if (ni >= 0 && ni < scale.length) {
      let freq = scale[ni];
      let amp = vel * musicVol * (this._lyreMode === 'menu' ? 0.06 : 0.14);
      if (this._lyreMode === 'eerie' && freq > 500) freq *= 0.5;
      this._pluckLyre(voice, freq, amp, dur * 16);
    }

    this._lyreTimer = dur;
    this._lyreNoteIdx++;
    if (this._lyreNoteIdx >= phrase.length) {
      this._lyreNoteIdx = 0;
      this._lyrePhrase++;
      if (this._lyreMode === 'menu') this._lyreTimer += floor(random(180, 360));
      else if (this._lyreMode === 'tense') this._lyreTimer += floor(random(20, 50));
      else if (this._lyreMode === 'eerie') this._lyreTimer += floor(random(100, 200));
      else if (this._lyreMode === 'celebration') this._lyreTimer += floor(random(15, 35));
      else if (this._lyreMode === 'night') this._lyreTimer += floor(random(160, 300));
      else if (this._lyreMode === 'sailing') this._lyreTimer += floor(random(40, 80));
      else this._lyreTimer += floor(random(60, 140));
    }
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
      case 'harvest':   playTwo('sine', 523, 659, 0.22, 300, 100); break;  // C5->E5 major third
      case 'chop':      play('triangle', 160, 0.25, 90, 120, { attack: 5 }); break;  // short thunk
      case 'build':     play('triangle', 330, 0.20, 220, 180, { attack: 10 }); break;  // woody tap
      // UI — gentle clicks and chimes
      case 'equip':     playTwo('sine', 784, 1047, 0.18, 200, 80); break;  // G5->C6 perfect fourth
      case 'click':     play('sine', 660, 0.12, 440, 60, { attack: 3 }); break;  // tiny pip
      case 'ding':      play('sine', 1047, 0.18, 880, 400, { attack: 20 }); break;  // bell tone, long ring
      // Movement — subtle whooshes
      case 'step_sand': play('triangle', 140, 0.06, 80, 70, { attack: 5 }); break;  // soft puff
      case 'step_stone':play('triangle', 320, 0.07, 200, 60, { attack: 3 }); break;  // light tap
      case 'dash':      play('triangle', 500, 0.18, 150, 200, { attack: 8 }); break;  // breeze sweep
      // Fishing — watery plops
      case 'fish_cast': play('sine', 400, 0.16, 200, 250, { attack: 15 }); break;  // descending plop
      case 'fish_catch':playTwo('sine', 392, 523, 0.20, 300, 120); break;  // G4->C5 happy catch
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
      case 'hit':       play('triangle', 280, 0.22, 120, 100, { attack: 3 }); break;  // impact thud
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
