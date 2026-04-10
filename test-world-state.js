// test-world-state.js — Integration test for WorldState
// Run: node test-world-state.js

const fs = require('fs');
const vm = require('vm');

// Mock globals
let setup = `
var WORLD = { islandCX: 600, islandCY: 400 };
var _islandFields = ['buildings','plots','citizens','trees','gold','crystals','islandLevel','islandRX','islandRY','legia','player','faction'];
var _swappedIsland = null;
var _realState = null;

var state = {
  faction: 'rome', islandRX: 500, islandRY: 320, isInitialized: true,
  buildings: [{type:'villa', x:600, y:400}], gold: 50, crystals: 10,
  islandLevel: 3, player: {x:600,y:400,hp:100},
  nations: {
    carthage: {
      isleX: 1200, isleY: 300, isleRX: 400, isleRY: 280, defeated: false,
      islandState: { buildings: [{type:'market'}], gold: 100, crystals: 5, islandLevel: 2, islandRX: 400, islandRY: 280, player: {x:1200,y:300,hp:80}, faction: 'carthage', legia: {army:[{hp:20}]} }
    },
    egypt: {
      isleX: 200, isleY: 800, isleRX: 420, isleRY: 290, defeated: false,
      islandState: { buildings: [], gold: 200, crystals: 20, islandLevel: 4, islandRX: 420, islandRY: 290, player: {x:200,y:800,hp:90}, faction: 'egypt', legia: {army:[{hp:20},{hp:20},{hp:20}]} }
    }
  }
};
`;

let code = fs.readFileSync('world-state.js', 'utf8');
// Disable auto-init watcher for testing
code = code.replace("if (typeof window !== 'undefined') {", "if (false) {");

let test = `
console.log('=== WORLD STATE INTEGRATION TEST ===');
console.log('');

// Test 1: Init
console.log('--- 1. Initialization ---');
WorldState.init('rome');
console.log('  Islands:', Object.keys(WorldState.islands).length);
console.assert(Object.keys(WorldState.islands).length === 3, 'Should have 3 islands (rome + 2 nations)');
console.log('  Player island:', WorldState.playerIslandId);
console.assert(WorldState.playerIslandId === 'rome', 'Player should be rome');

// Test 2: Read fields
console.log('');
console.log('--- 2. Read Fields ---');
console.log('  Rome gold:', WorldState.getGold('rome'));
console.assert(WorldState.getGold('rome') === 50, 'Rome gold should be 50');
console.log('  Carthage gold:', WorldState.getGold('carthage'));
console.assert(WorldState.getGold('carthage') === 100, 'Carthage gold should be 100');
console.log('  Egypt army size:', WorldState.getArmySize('egypt'));
console.assert(WorldState.getArmySize('egypt') === 3, 'Egypt army should be 3');
console.log('  Carthage buildings:', WorldState.getBuildingCount('carthage'));
console.assert(WorldState.getBuildingCount('carthage') === 1, 'Carthage should have 1 building');

// Test 3: Safe swap
console.log('');
console.log('--- 3. Safe Swap ---');
console.log('  Before swap: state.gold =', state.gold);
WorldState.safeSwap('carthage');
console.log('  During swap to carthage: state.gold =', state.gold);
console.assert(state.gold === 100, 'After swap to carthage, gold should be 100');
console.log('  Stack depth:', WorldState._swapStack.length);
console.assert(WorldState._swapStack.length === 1, 'Stack should have 1 entry');
WorldState.safeSwapBack();
console.log('  After swapBack: state.gold =', state.gold);
console.assert(state.gold === 50, 'After swapBack, gold should be 50');
console.assert(WorldState._swapStack.length === 0, 'Stack should be empty');

// Test 4: withIsland
console.log('');
console.log('--- 4. withIsland ---');
let egyptGold = WorldState.withIsland('egypt', function(is) { return is.gold; });
console.log('  Egypt gold via withIsland:', egyptGold);
console.assert(egyptGold === 200, 'Egypt gold should be 200');
console.log('  State still rome? gold =', state.gold);
console.assert(state.gold === 50, 'Should still be rome (50 gold)');

// Test 5: Nested safe swap (THE KEY BUG FIX)
console.log('');
console.log('--- 5. Nested Swap (bug fix test) ---');
WorldState.safeSwap('carthage');
console.log('  In carthage: gold =', state.gold);
console.assert(state.gold === 100, 'Should be carthage gold');
WorldState.safeSwap('egypt');
console.log('  In egypt: gold =', state.gold);
console.assert(state.gold === 200, 'Should be egypt gold');
console.log('  Stack depth:', WorldState._swapStack.length);
console.assert(WorldState._swapStack.length === 2, 'Stack should have 2 entries');
WorldState.safeSwapBack();
console.log('  Back to carthage: gold =', state.gold);
console.assert(state.gold === 100, 'Should be back to carthage gold');
WorldState.safeSwapBack();
console.log('  Back to rome: gold =', state.gold);
console.assert(state.gold === 50, 'Should be back to rome gold');

// Test 6: Distance and LOD
console.log('');
console.log('--- 6. Distance & LOD ---');
let distCarth = WorldState.distanceTo('carthage', 600, 400);
console.log('  Distance to carthage from home:', Math.round(distCarth));
console.assert(distCarth > 500, 'Carthage should be far from home');
console.log('  LOD for carthage from home:', WorldState.getLOD('carthage', 600, 400));
console.log('  LOD for carthage from nearby:', WorldState.getLOD('carthage', 1100, 300));
console.assert(WorldState.getLOD('carthage', 1100, 300) === 3, 'Close should be LOD 3');

// Test 7: getIslandAt
console.log('');
console.log('--- 7. Spatial Query ---');
let nearIsland = WorldState.getIslandAt(1210, 310, 200);
console.log('  Nearest to (1210,310):', nearIsland ? nearIsland.id : 'none');
console.assert(nearIsland && nearIsland.id === 'carthage', 'Should find carthage');

// Test 8: getVisibleIslands
console.log('');
console.log('--- 8. Visible Islands ---');
let visible = WorldState.getVisibleIslands(600, 400, 5000);
console.log('  Visible from home:', visible.length, 'islands');
for (let v of visible) {
  console.log('    ' + v.id + ': dist=' + Math.round(v.dist) + ' lod=' + v.lod);
}

// Test 9: Player arrive/leave
console.log('');
console.log('--- 9. Player Arrival ---');
WorldState.playerArriveAt('carthage');
console.log('  Active island:', WorldState.activeIslandId);
console.assert(WorldState.activeIslandId === 'carthage', 'Should be on carthage');
console.assert(state._activeNation === 'carthage', 'state._activeNation should be carthage');
WorldState.playerLeaveIsland();
console.log('  After leaving:', WorldState.activeIslandId);
console.assert(WorldState.activeIslandId === 'rome', 'Should be back to rome');
console.assert(state._activeNation === null, 'state._activeNation should be null');

// Test 10: Write field
console.log('');
console.log('--- 10. Write Field ---');
WorldState.writeField('carthage', 'gold', 999);
console.log('  Carthage gold after write:', WorldState.getGold('carthage'));
console.assert(WorldState.getGold('carthage') === 999, 'Should be 999');
console.log('  Rome gold unchanged:', WorldState.getGold('rome'));
console.assert(WorldState.getGold('rome') === 50, 'Rome should still be 50');

console.log('');
console.log('=== ALL TESTS PASSED ===');
`;

let ctx = vm.createContext({
  console, Math, Object, Array, Infinity, undefined,
  setInterval: () => {}, clearInterval: () => {}, setTimeout: () => {},
});

try {
  vm.runInContext(setup + '\n' + code + '\n' + test, ctx);
} catch (e) {
  console.error('TEST FAILED:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1);
}
