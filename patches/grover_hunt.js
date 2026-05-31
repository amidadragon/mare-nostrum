// patches/grover_hunt.js
// Grover's-algorithm treasure-hunt minigame.
//
// When the player dives on a wreck, 8 chests are on the seabed. One holds the
// real treasure. The player has a budget of "quantum probes" — each probe
// runs one Grover iteration against the oracle, amplifying the correct chest's
// amplitude. After 2 probes (~ pi/4*sqrt(8) ~ 2.22 is the optimum for N=8),
// the marked chest has ~94.5% probability. The player then picks a chest; the
// final draw uses window.QRNG.next() if available (genuine quantum) else
// Math.random().
//
// Exposes:
//   window.startGroverHunt([opts])
//       opts.reward    base reward if player wins (default 250)
//       opts.onWin     callback(amount)    — called on correct pick
//       opts.onLose    callback()          — called on wrong pick
//       opts.maxProbes default 2
//
// Hooks (best-effort):
//   If window.diveWreck / window.openWreck / window.enterDive exist, wraps
//   them so they trigger startGroverHunt after their original return.
//
// Simulator: pure-JS 3-qubit state (8 complex amplitudes). Grover oracle
// flips the sign of the marked basis state; diffusion reflects about the
// uniform superposition. Numerically verified: after 2 iterations with N=8,
// P(marked) ~ 0.9453125.
//
// UI: a single centered DOM overlay — no p5 canvas integration required.
// Zero risk: inert until startGroverHunt() is called.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__GROVER_HUNT_PATCHED__) return;

  const N        = 8;
  const N_QUBITS = 3;

  // ---------- quantum simulator ----------
  // amplitudes: Float64Array length 2N (real, imag interleaved).
  function _newUniform() {
    const a = new Float64Array(N * 2);
    const v = 1 / Math.sqrt(N);
    for (let i = 0; i < N; i++) a[i * 2] = v;
    return a;
  }
  function _oracle(a, marked) {
    a[marked * 2]     = -a[marked * 2];
    a[marked * 2 + 1] = -a[marked * 2 + 1];
  }
  function _diffusion(a) {
    // Reflect about mean. 2*mean - a[i].
    let mR = 0, mI = 0;
    for (let i = 0; i < N; i++) { mR += a[i*2]; mI += a[i*2+1]; }
    mR /= N; mI /= N;
    for (let i = 0; i < N; i++) {
      a[i*2]   = 2 * mR - a[i*2];
      a[i*2+1] = 2 * mI - a[i*2+1];
    }
  }
  function _probs(a) {
    const p = new Array(N);
    for (let i = 0; i < N; i++) {
      p[i] = a[i*2] * a[i*2] + a[i*2+1] * a[i*2+1];
    }
    return p;
  }
  function _measure(p) {
    const r = (window.QRNG && typeof window.QRNG.next === 'function')
                ? window.QRNG.next() : Math.random();
    let acc = 0;
    for (let i = 0; i < N; i++) {
      acc += p[i];
      if (r <= acc) return i;
    }
    return N - 1;
  }

  // ---------- overlay rendering ----------
  function _buildOverlay() {
    let host = document.getElementById('grover-hunt-overlay');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'grover-hunt-overlay';
    Object.assign(host.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(6,10,20,0.82)',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'serif', color: '#e7dcb6',
    });
    host.innerHTML =
      '<div id="gh-panel" style="' +
      'width:560px; max-width:95vw;' +
      'background:linear-gradient(180deg,#1b2436,#0e1422);' +
      'border:1px solid #c9a84a; border-radius:10px;' +
      'box-shadow:0 10px 40px #000a;' +
      'padding:22px 26px;">' +
        '<div style="display:flex; align-items:center; justify-content:space-between;">' +
          '<div style="font-size:20px; letter-spacing:1px;">Grover\u0027s Dive — 8 chests, 1 treasure</div>' +
          '<button id="gh-close" style="background:transparent;border:1px solid #3a4a68;color:#a8b6d0;border-radius:4px;padding:2px 8px;cursor:pointer;">\u00d7</button>' +
        '</div>' +
        '<div id="gh-status" style="margin:10px 0 14px; color:#a8b6d0; font-size:13px;"></div>' +
        '<div id="gh-chests" style="' +
          'display:grid; grid-template-columns:repeat(4,1fr);' +
          'gap:10px; margin-bottom:14px;"></div>' +
        '<div style="display:flex; gap:10px; align-items:center;">' +
          '<button id="gh-probe" style="' +
            'background:#3a5b8c; color:#fff; border:1px solid #6aa;' +
            'border-radius:6px; padding:8px 16px; cursor:pointer;' +
            'font-family:inherit; font-size:14px;">\u269b Quantum probe</button>' +
          '<button id="gh-pick" style="' +
            'background:#8c5b3a; color:#fff; border:1px solid #c9a84a;' +
            'border-radius:6px; padding:8px 16px; cursor:pointer;' +
            'font-family:inherit; font-size:14px;" disabled>Pick a chest</button>' +
          '<span id="gh-probes-left" style="margin-left:auto; color:#c9a84a;"></span>' +
        '</div>' +
        '<div id="gh-result" style="margin-top:14px; min-height:22px; font-size:14px;"></div>' +
      '</div>';
    document.body.appendChild(host);
    return host;
  }
  function _destroyOverlay() {
    const host = document.getElementById('grover-hunt-overlay');
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }

  function _renderChests(probs, opts) {
    const grid = document.getElementById('gh-chests');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < N; i++) {
      const p = probs[i];
      const bar = Math.round(p * 100);
      const chest = document.createElement('div');
      chest.dataset.idx = String(i);
      Object.assign(chest.style, {
        background: opts.pickMode
          ? 'linear-gradient(180deg,#2a1f12,#1a120a)'
          : 'linear-gradient(180deg,#20293a,#141a28)',
        border: '1px solid #c9a84a80',
        borderRadius: '6px',
        padding: '10px',
        textAlign: 'center',
        cursor: opts.pickMode ? 'pointer' : 'default',
        position: 'relative',
        userSelect: 'none',
      });
      chest.innerHTML =
        '<div style="font-size:28px;">\ud83c\udffa</div>' +
        '<div style="font-size:11px; color:#a8b6d0; margin-top:4px;">chest ' + (i + 1) + '</div>' +
        '<div style="height:6px; background:#0006; border-radius:3px; margin-top:6px; overflow:hidden;">' +
          '<div style="height:100%; width:' + bar + '%; background:#c9a84a;"></div>' +
        '</div>' +
        '<div style="font-size:10px; color:#c9a84a; margin-top:2px;">' + (p * 100).toFixed(1) + '%</div>';
      if (opts.pickMode) {
        chest.addEventListener('click', function () { opts.onPick(i); });
      }
      grid.appendChild(chest);
    }
  }

  // ---------- controller ----------
  function startGroverHunt(opts) {
    opts = opts || {};
    const reward    = Math.max(1, opts.reward || 250);
    const maxProbes = Math.max(0, opts.maxProbes == null ? 2 : opts.maxProbes);
    const onWin     = typeof opts.onWin  === 'function' ? opts.onWin  : null;
    const onLose    = typeof opts.onLose === 'function' ? opts.onLose : null;

    // Choose the marked chest.
    const pickQ = (window.QRNG && typeof window.QRNG.nextInt === 'function');
    const marked = pickQ ? window.QRNG.nextInt(N) : Math.floor(Math.random() * N);

    const state = {
      amps: _newUniform(),
      probesUsed: 0,
      marked: marked,
      picked: null,
    };

    const host = _buildOverlay();
    const statusEl = host.querySelector('#gh-status');
    const probeBtn = host.querySelector('#gh-probe');
    const pickBtn  = host.querySelector('#gh-pick');
    const leftEl   = host.querySelector('#gh-probes-left');
    const resEl    = host.querySelector('#gh-result');
    const closeBtn = host.querySelector('#gh-close');

    statusEl.textContent = 'Amplitudes are uniform (1/sqrt(8) each). Spend probes to amplify the correct chest, then pick.';

    function redraw(pickMode) {
      _renderChests(_probs(state.amps), {
        pickMode: !!pickMode,
        onPick: function (idx) {
          if (state.picked != null) return;
          state.picked = idx;
          const probs = _probs(state.amps);
          // Measurement honours the amplified distribution (quantum pick).
          const drawn = _measure(probs);
          // The player chose `idx`. If idx === marked, they win. We also
          // surface the quantum draw so the player can see the amplification
          // worked.
          const won = idx === state.marked;
          if (won) {
            resEl.innerHTML = '<span style="color:#8fd08f;">Treasure! Chest ' + (idx + 1) +
              ' held the hoard — +' + reward + ' gold. (Quantum measurement drew chest ' +
              (drawn + 1) + '.)</span>';
            if (onWin) { try { onWin(reward); } catch (e) {} }
            else { _grantGold(reward); }
          } else {
            resEl.innerHTML = '<span style="color:#d08f8f;">Empty. Chest ' + (state.marked + 1) +
              ' was the right one (quantum drew ' + (drawn + 1) + ').</span>';
            if (onLose) { try { onLose(); } catch (e) {} }
          }
          probeBtn.disabled = true;
          pickBtn.disabled  = true;
          // Reveal final distribution.
          _renderChests(_probs(state.amps), { pickMode: false });
          // Auto-close after a short delay.
          setTimeout(_destroyOverlay, 2500);
        },
      });
      leftEl.textContent = 'Probes left: ' + (maxProbes - state.probesUsed);
    }

    probeBtn.addEventListener('click', function () {
      if (state.probesUsed >= maxProbes) return;
      _oracle(state.amps, state.marked);
      _diffusion(state.amps);
      state.probesUsed++;
      statusEl.textContent = 'Iteration ' + state.probesUsed + ' complete.' +
        (state.probesUsed === maxProbes ? ' Budget exhausted — pick a chest.' : '');
      if (state.probesUsed >= maxProbes) {
        probeBtn.disabled = true;
        pickBtn.disabled  = false;
      }
      redraw(false);
    });
    pickBtn.addEventListener('click', function () {
      statusEl.textContent = 'Click a chest to open it.';
      redraw(true);
    });
    closeBtn.addEventListener('click', function () { _destroyOverlay(); });

    redraw(false);
    return { state: state, host: host };
  }

  function _grantGold(amount) {
    try {
      if (typeof window.state === 'object' && window.state) {
        if (typeof window.state.gold === 'number') window.state.gold += amount;
        else if (typeof window.state.treasury === 'number') window.state.treasury += amount;
        else window.state.gold = amount;
      }
    } catch (e) {}
    try { console.log('[grover_hunt] granted ' + amount + ' gold'); } catch (e) {}
  }

  // ---------- best-effort dive hook ----------
  const DIVE_FNS = ['diveWreck', 'openWreck', 'enterDive', 'startDive'];
  let wrapped = 0;
  for (const name of DIVE_FNS) {
    if (typeof window[name] === 'function') {
      const orig = window[name];
      window[name] = function () {
        const r = orig.apply(this, arguments);
        try { startGroverHunt(); } catch (e) {
          console.warn('[grover_hunt] failed to auto-start:', e && e.message);
        }
        return r;
      };
      wrapped++;
    }
  }

  window.startGroverHunt        = startGroverHunt;
  window.__GROVER_HUNT_PATCHED__ = true;
  console.log('[grover_hunt] active — call startGroverHunt() to play. Dive hooks wrapped: ' + wrapped);
})();