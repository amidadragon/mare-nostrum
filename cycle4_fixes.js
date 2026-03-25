// OCTOGODZ CYCLE 4 BUG FIXES
(function () {
  "use strict";
  // FIX 2: Quest Tracker Text Clipping
  if (typeof drawQuestTracker === "function") {
    var _origDrawQuestTracker = drawQuestTracker;
    drawQuestTracker = function () {
      var ctx = drawingContext;
      ctx.save();
      ctx.beginPath();
      ctx.rect(width - 242, 0, 232, height);
      ctx.clip();
      _origDrawQuestTracker.apply(this, arguments);
      ctx.restore();
    };
    console.log("[CYCLE4] Fix 2: quest tracker clip rect");
  }
  // FIX 3: Menu Button Hitbox Alignment
  if (typeof handleMenuClick === "function") {
    var _origHandleMenuClick = handleMenuClick;
    handleMenuClick = function () {
      var iSize = max(13, floor(min(width * 0.02, height * 0.03)));
      var shift = Math.round(iSize * 0.8);
      var savedY = mouseY;
      mouseY = mouseY + shift;
      try { var r = _origHandleMenuClick.apply(this, arguments); }
      finally { mouseY = savedY; }
      return r;
    };
    console.log("[CYCLE4] Fix 3: menu hitbox shifted up");
  }
  console.log("[CYCLE4] All Cycle 4 patches loaded.");
})();
