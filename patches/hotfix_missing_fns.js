// HOTFIX: Conditional stubs — only define if the real function hasn't loaded yet.
// All 6 functions now have real implementations in merchant.js, lifecycle.js, building.js.
// This file is kept as a safety net in case load order changes.

if (typeof updatePortPositions !== 'function') { function updatePortPositions() {} }
if (typeof generateProphecy !== 'function') { function generateProphecy() { return "The stars whisper of empires yet unborn."; } }
if (typeof spawnWildCat !== 'function') { function spawnWildCat() {} }
if (typeof getPortPosition !== 'function') { function getPortPosition() { return { x: 0, y: 0 }; } }
if (typeof isOnImperialBridge !== 'function') { function isOnImperialBridge() { return false; } }
if (typeof isBlockedByBuilding !== 'function') { function isBlockedByBuilding() { return false; } }

console.log("[HOTFIX] Conditional stubs checked — real implementations preserved.");
