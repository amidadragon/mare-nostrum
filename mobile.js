// mobile.js — Touch controls for mobile play
// Virtual joystick, action buttons, hotbar tap detection, touch event wiring

let _isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let _touchJoystick = { active: false, id: null, cx: 0, cy: 0, x: 0, y: 0, dx: 0, dy: 0 };
let _touchButtons = [];
let _touchActionQueue = [];
let _joystickDeadzone = 12;
let _joystickMaxR = 55;

function _initTouchButtons() {
  let sz = 52, pad = 10;
  let rx = width - sz - pad;
  let by = height - 180;
  _touchButtons = [
    { key: ' ', label: 'ATK',   x: rx - sz - pad, y: by + sz + pad, w: sz, h: sz, col: [180, 60, 60] },
    { key: 'e', label: 'USE',   x: rx, y: by, w: sz, h: sz, col: [60, 160, 120] },
    { key: 'SHIFT', label: 'DASH', x: rx - sz - pad, y: by, w: sz, h: sz, col: [60, 120, 200] },
    { key: 'b', label: 'BUILD', x: rx, y: by + sz + pad, w: sz, h: sz, col: [180, 160, 60] },
    { key: 'f', label: 'FISH',  x: rx - (sz + pad) * 2, y: by + sz + pad, w: sz, h: sz, col: [60, 140, 200] },
  ];
}

function _inRect(tx, ty, bx, by, bw, bh) {
  return tx >= bx && tx <= bx + bw && ty >= by && ty <= by + bh;
}

function _handleTouchButton(tx, ty) {
  for (let btn of _touchButtons) {
    if (_inRect(tx, ty, btn.x, btn.y, btn.w, btn.h)) {
      _touchActionQueue.push(btn.key);
      return true;
    }
  }
  return false;
}

function _handleHotbarTap(tx, ty) {
  if (typeof HOTBAR_ITEMS === 'undefined' || !state || !state.player) return false;
  let slotW = _isMobile ? 44 : 36, slotH = _isMobile ? 44 : 36, gap = 3;
  let totalW = HOTBAR_ITEMS.length * (slotW + gap) - gap;
  let bx = floor((width - totalW) / 2);
  let by = height - slotH - 12;
  let tapPad = 8;
  if (ty >= by - tapPad && ty <= by + slotH + tapPad && tx >= bx - tapPad && tx <= bx + totalW + tapPad) {
    for (let i = 0; i < HOTBAR_ITEMS.length; i++) {
      let sx = bx + i * (slotW + gap);
      if (tx >= sx - 2 && tx <= sx + slotW + 2) {
        state.player.hotbarSlot = i;
        return true;
      }
    }
  }
  return false;
}

function _processTouchActions() {
  if (!state || !state.player) return;
  while (_touchActionQueue.length > 0) {
    let k = _touchActionQueue.shift();
    if (k === 'SHIFT') {
      if (state.player.dashCooldown <= 0 && state.solar >= 10) {
        state.player.dashTimer = 10;
        state.player.dashCooldown = 60;
        state.solar -= 10;
        if (snd) snd.playSFX('dash');
        spawnParticles(state.player.x, state.player.y, 'dash', 5);
      }
    } else {
      let savedKey = window.key, savedCode = window.keyCode;
      window.key = k;
      window.keyCode = k === ' ' ? 32 : k.charCodeAt(0);
      keyPressed();
      window.key = savedKey;
      window.keyCode = savedCode;
    }
  }
}

function drawMobileControls() {
  if (!_isMobile || typeof gameScreen === 'undefined' || gameScreen !== 'game' || screenshotMode) return;
  if (!state || state.introPhase !== 'done') return;
  if (_touchButtons.length === 0) _initTouchButtons();

  push();
  noStroke();

  // Virtual joystick
  let jzX = 30, jzY = height - 170, jzR = 60;
  if (_touchJoystick.active) {
    fill(255, 255, 255, 30);
    ellipse(_touchJoystick.cx, _touchJoystick.cy, jzR * 2, jzR * 2);
    fill(255, 255, 255, 80);
    ellipse(_touchJoystick.x, _touchJoystick.y, 40, 40);
  } else {
    fill(255, 255, 255, 15);
    ellipse(jzX + jzR, jzY + jzR, jzR * 2, jzR * 2);
    fill(255, 255, 255, 25);
    ellipse(jzX + jzR, jzY + jzR, 30, 30);
  }

  // Action buttons
  for (let btn of _touchButtons) {
    fill(btn.col[0], btn.col[1], btn.col[2], 60);
    rect(btn.x, btn.y, btn.w, btn.h, 10);
    stroke(btn.col[0], btn.col[1], btn.col[2], 100);
    strokeWeight(1.5);
    noFill();
    rect(btn.x, btn.y, btn.w, btn.h, 10);
    noStroke();
    fill(255, 255, 255, 160);
    textSize(10);
    textAlign(CENTER, CENTER);
    text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }

  pop();
}

// Wire up raw touch events for the virtual joystick (multitouch)
// p5's touchStarted/touchMoved/touchEnded only give single-touch info via mouseX/mouseY.
// We need the canvas element's native touch events for proper multitouch joystick + tap.
window.addEventListener('DOMContentLoaded', function() {
  // Wait for p5 to create canvas
  let _wired = false;
  let _wireInterval = setInterval(function() {
    let cvs = document.querySelector('canvas');
    if (!cvs || _wired) return;
    _wired = true;
    clearInterval(_wireInterval);

    cvs.addEventListener('touchstart', function(e) {
      if (typeof snd !== 'undefined' && snd) snd.resume();
      if (typeof gameScreen === 'undefined' || gameScreen !== 'game') return;
      if (!state || state.introPhase !== 'done') return;
      if (_touchButtons.length === 0 && typeof _initTouchButtons === 'function') _initTouchButtons();

      for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        let tx = t.clientX, ty = t.clientY;

        // Check action buttons first
        if (_handleTouchButton(tx, ty)) { e.preventDefault(); continue; }

        // Check hotbar tap
        if (_handleHotbarTap(tx, ty)) { e.preventDefault(); continue; }

        // Left half of screen = joystick zone
        if (tx < width * 0.4 && ty > height * 0.4 && !_touchJoystick.active) {
          _touchJoystick.active = true;
          _touchJoystick.id = t.identifier;
          _touchJoystick.cx = tx;
          _touchJoystick.cy = ty;
          _touchJoystick.x = tx;
          _touchJoystick.y = ty;
          _touchJoystick.dx = 0;
          _touchJoystick.dy = 0;
          e.preventDefault();
          continue;
        }
      }
    }, { passive: false });

    cvs.addEventListener('touchmove', function(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        if (_touchJoystick.active && t.identifier === _touchJoystick.id) {
          let dx = t.clientX - _touchJoystick.cx;
          let dy = t.clientY - _touchJoystick.cy;
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d > _joystickMaxR) {
            dx = dx / d * _joystickMaxR;
            dy = dy / d * _joystickMaxR;
          }
          _touchJoystick.x = _touchJoystick.cx + dx;
          _touchJoystick.y = _touchJoystick.cy + dy;
          if (d > _joystickDeadzone) {
            _touchJoystick.dx = dx / _joystickMaxR;
            _touchJoystick.dy = dy / _joystickMaxR;
          } else {
            _touchJoystick.dx = 0;
            _touchJoystick.dy = 0;
          }
          e.preventDefault();
        }
      }
    }, { passive: false });

    cvs.addEventListener('touchend', function(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        if (_touchJoystick.active && t.identifier === _touchJoystick.id) {
          _touchJoystick.active = false;
          _touchJoystick.id = null;
          _touchJoystick.dx = 0;
          _touchJoystick.dy = 0;
        }
      }
    }, { passive: false });

    cvs.addEventListener('touchcancel', function(e) {
      _touchJoystick.active = false;
      _touchJoystick.id = null;
      _touchJoystick.dx = 0;
      _touchJoystick.dy = 0;
    }, { passive: false });
  }, 200);
});
