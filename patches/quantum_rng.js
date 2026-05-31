// patches/quantum_rng.js
// Quantum-randomness layer for Mare Nostrum V2.
//
// Exposes:
//   window.QRNG.ready         Promise<boolean>   -- resolves when buffer primed
//   window.QRNG.next()        number in [0,1)    -- consumes one quantum byte
//   window.QRNG.nextInt(n)    0..n-1 integer
//   window.QRNG.pick(arr)     uniform choice from arr
//   window.QRNG.isQuantum     boolean            -- true if ANU source reached
//   window.QRNG.refill()      Promise<void>      -- manual refill
//
// Data source:
//   Primary: ANU Quantum Random Numbers Server — https://qrng.anu.edu.au
//            Endpoint: /API/jsonI.php?length=1024&type=uint8
//            Genuine quantum vacuum fluctuations, CORS-open, free.
//   Fallback: mulberry32 seeded PRNG (deterministic, same signature).
//
// Oracle hook:
//   If the game exposes window.rollOracle / window.omenEvent / window.drawOmen,
//   the patch wraps them so their internal Math.random() call is replaced by
//   QRNG.next() while the oracle is rendering. This gives omens a *genuine*
//   quantum origin for the "Sibylline QRNG" beat from the research doc.
//
// Zero-risk fallbacks everywhere — if fetch fails, CORS blocks, or the ANU
// endpoint is down, we never block gameplay. We just fill the buffer with the
// PRNG and mark isQuantum=false.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__QUANTUM_RNG_PATCHED__) return;

  const ANU_URL = 'https://qrng.anu.edu.au/API/jsonI.php?length=1024&type=uint8';
  const BUFFER_LOW_WATER = 64;   // refill when fewer than this many bytes left

  // ---------- deterministic fallback PRNG (mulberry32) ----------
  function _mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const _seed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
  const _prng = _mulberry32(_seed);

  // ---------- buffer ----------
  const _buf = [];
  let _isQuantum  = false;
  let _refilling  = null;
  let _initDone   = null;

  function _fillFromPrng(n) {
    for (let i = 0; i < n; i++) _buf.push(Math.floor(_prng() * 256));
  }

  async function _fetchANU() {
    // Some environments (file://, strict CSPs) will block fetch. Guard it.
    if (typeof fetch !== 'function') throw new Error('fetch() unavailable');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch(ANU_URL, { signal: ctrl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error('ANU HTTP ' + r.status);
      const j = await r.json();
      if (!j || j.success !== true || !Array.isArray(j.data)) {
        throw new Error('ANU bad response');
      }
      return j.data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function refill() {
    if (_refilling) return _refilling;
    _refilling = (async () => {
      try {
        const bytes = await _fetchANU();
        for (let i = 0; i < bytes.length; i++) _buf.push(bytes[i] & 0xFF);
        _isQuantum = true;
        console.log('[quantum_rng] primed ' + bytes.length + ' bytes from ANU — isQuantum=true');
      } catch (e) {
        _fillFromPrng(1024);
        _isQuantum = false;
        console.warn('[quantum_rng] ANU unreachable (' + (e && e.message) +
                     ') — falling back to seeded PRNG');
      } finally {
        _refilling = null;
      }
    })();
    return _refilling;
  }

  function _consumeByte() {
    if (_buf.length === 0) _fillFromPrng(256); // emergency top-up
    if (_buf.length < BUFFER_LOW_WATER && !_refilling) refill();
    return _buf.shift();
  }

  // Consume 4 bytes -> uint32 -> [0,1).
  function next() {
    const b0 = _consumeByte();
    const b1 = _consumeByte();
    const b2 = _consumeByte();
    const b3 = _consumeByte();
    const u = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    return u / 4294967296;
  }
  function nextInt(n) {
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(next() * n);
  }
  function pick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr[nextInt(arr.length)];
  }

  // ---------- oracle hook: replace Math.random() during oracle draw ----------
  const ORACLE_FNS = ['rollOracle', 'omenEvent', 'drawOmen', 'consultOracle'];
  let _mathRandomPatched = false;
  const _origMathRandom = Math.random.bind(Math);
  function _withQuantum(fn) {
    return function () {
      const prev = Math.random;
      Math.random = next;
      try { return fn.apply(this, arguments); }
      finally { Math.random = prev; }
    };
  }
  let oracleWrapped = 0;
  for (const name of ORACLE_FNS) {
    if (typeof window[name] === 'function') {
      window[name] = _withQuantum(window[name]);
      oracleWrapped++;
    }
  }

  // ---------- init ----------
  _fillFromPrng(256);
  _initDone = refill();

  window.QRNG = {
    ready:      _initDone,
    next, nextInt, pick,
    get isQuantum() { return _isQuantum; },
    get bufferSize() { return _buf.length; },
    refill,
  };
  window.__QUANTUM_RNG_PATCHED__ = true;
  console.log('[quantum_rng] active — oracle hooks wrapped: ' + oracleWrapped +
              ', fallback seed ' + _seed.toString(16));
})();