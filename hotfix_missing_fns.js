// HOTFIX: Missing function stubs
// Load BEFORE sketch.js in index.html

function updatePortPositions() {}

function generateProphecy() {
  var p = ["The stars whisper of empires yet unborn.","Sol Invictus watches over this shore.","The sea remembers what the land forgets.","Fortune favors those who build with patience.","From salt and stone, a civilization rises."];
  return p[Math.floor(Math.random() * p.length)];
}

function spawnWildCat() {}
function getPortPosition() { return { x: 0, y: 0 }; }
function isOnImperialBridge() { return false; }
function isBlockedByBuilding() { return false; }

console.log("[HOTFIX] 6 missing function stubs loaded.");
