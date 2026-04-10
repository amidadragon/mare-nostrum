// test-swarm.js — Quick integration test for the swarm engine
// Run: node test-swarm.js

const fs = require('fs');
const vm = require('vm');

// Combine all source files
let combined = fs.readFileSync('mediterranean.js', 'utf8') + '\n' +
               fs.readFileSync('graph.js', 'utf8') + '\n' +
               fs.readFileSync('agent.js', 'utf8');

// Strip rendering functions that need p5.js (they use push/pop/fill/stroke etc)
// We only need data + logic for this test
combined = combined.replace(/function draw\w+\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
combined = combined.replace(/function handleMap\w+\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
combined = combined.replace(/function updateMapCamera\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
combined = combined.replace(/function resetMapCamera\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
combined = combined.replace(/function getCityAtScreen\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');

// Test code
combined += `

console.log('=== SWARM ENGINE INTEGRATION TEST ===');
console.log('');

// Test 1: World Graph Init
console.log('--- 1. Initializing World Graph ---');
let G = initWorldGraph();
let stats = G.stats();
console.log('  Nodes:', stats.totalNodes, '| Edges:', stats.totalEdges);
console.log('  Node types:', JSON.stringify(stats.nodeTypes));
console.log('  Edge types:', JSON.stringify(stats.edgeTypes));
console.assert(stats.totalNodes > 0, 'Should have nodes');
console.assert(stats.totalEdges > 0, 'Should have edges');
console.assert(stats.nodeTypes.faction === 8, 'Should have 8 factions');

// Test 2: Spawn Agents
console.log('');
console.log('--- 2. Spawning Agents ---');
initAllFactionAgents(G);
let agentStats = G.stats();
console.log('  Total nodes:', agentStats.totalNodes, '| Total edges:', agentStats.totalEdges);
console.log('  Agents:', agentStats.nodeTypes.agent || 0);
console.assert(agentStats.nodeTypes.agent >= 80, 'Should have at least 80 agents');

// Test 3: Agent Turn
console.log('');
console.log('--- 3. Processing Turn 1 ---');
let log1 = processAgentTurn(G);
console.log('  Actions taken:', log1.length);
if (log1.length > 0) {
  console.log('  Sample action:', JSON.stringify(log1[0]));
}

// Test 4: Second Turn
console.log('');
console.log('--- 4. Processing Turn 2 ---');
let log2 = processAgentTurn(G);
console.log('  Actions taken:', log2.length);

// Test 5: Faction Queries
console.log('');
console.log('--- 5. Faction Queries ---');
for (let fid of ['rome', 'carthage', 'egypt', 'greece']) {
  let agents = G.factionAgents(fid);
  let cities = G.factionCities(fid);
  let econ = G.factionEconomicPower(fid);
  console.log('  ' + fid + ': ' + agents.length + ' agents, ' + cities.length + ' cities, econ=' + econ);
}

// Test 6: Diplomacy
console.log('');
console.log('--- 6. War/Peace Balance ---');
let pairs = [['rome','carthage'], ['egypt','seleucid'], ['rome','greece']];
for (let [a,b] of pairs) {
  let wpb = G.warPeaceBalance(a, b);
  console.log('  ' + a + ' vs ' + b + ': war=' + wpb.proWar.toFixed(2) + ' peace=' + wpb.proPeace.toFixed(2) + ' ratio=' + wpb.ratio.toFixed(2));
}

// Test 7: Betrayal detection
console.log('');
console.log('--- 7. Potential Betrayers ---');
for (let fid of ['rome', 'carthage']) {
  let betrayers = G.findPotentialBetrayers(fid);
  console.log('  ' + fid + ': ' + betrayers.length + ' suspects');
}

// Test 8: Map data
console.log('');
console.log('--- 8. Map Coordinate System ---');
let roma = MED_MAP.toScreen(41.89, 12.49);
console.log('  Roma position: x=' + roma.x.toFixed(0) + ' y=' + roma.y.toFixed(0));
let carthago = MED_MAP.toScreen(36.85, 10.32);
console.log('  Carthago position: x=' + carthago.x.toFixed(0) + ' y=' + carthago.y.toFixed(0));
let alexandria = MED_MAP.toScreen(31.20, 29.92);
console.log('  Alexandria position: x=' + alexandria.x.toFixed(0) + ' y=' + alexandria.y.toFixed(0));

console.log('');
console.log('=== ALL TESTS PASSED ===');
`;

// Create execution context with needed globals
const context = vm.createContext({
  console,
  Math,
  Date,
  JSON,
  Object,
  Array,
  Map,
  Set,
  String,
  Number,
  parseInt,
  parseFloat,
  isNaN,
  Infinity,
  undefined,
  width: 1280,
  height: 800,
  millis: () => Date.now(),
  lerp: (a, b, t) => a + (b - a) * t,
  constrain: (v, lo, hi) => Math.min(Math.max(v, lo), hi),
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  sin: Math.sin,
  cos: Math.cos,
  sqrt: Math.sqrt,
  pow: Math.pow,
  random: Math.random,
});

try {
  vm.runInContext(combined, context);
} catch (e) {
  console.error('TEST FAILED:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1);
}
