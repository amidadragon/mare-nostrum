// mediterranean.js — Real Mediterranean Map Data & Rendering
// Accurate geographic positions mapped to game coordinates
// Bounding box: ~6°W to 36°E longitude, ~30°N to 46°N latitude

const MED_MAP = {
  // Geographic bounds (lat/lon)
  bounds: { west: -6, east: 36, south: 30, north: 46 },

  // Game canvas mapping (will be set in setup based on canvas size)
  canvasW: 1280,
  canvasH: 800,
  padding: 40,

  // Convert lat/lon to game pixel coordinates
  // Longitude → X (west to east), Latitude → Y (north to south, inverted)
  lonToX(lon) {
    let range = this.bounds.east - this.bounds.west; // 42 degrees
    let normalized = (lon - this.bounds.west) / range;
    return this.padding + normalized * (this.canvasW - this.padding * 2);
  },
  latToY(lat) {
    let range = this.bounds.north - this.bounds.south; // 16 degrees
    let normalized = (lat - this.bounds.south) / range;
    return (this.canvasH - this.padding) - normalized * (this.canvasH - this.padding * 2); // flip Y
  },
  toScreen(lat, lon) {
    return { x: this.lonToX(lon), y: this.latToY(lat) };
  },
};

// ─── FACTION DEFINITIONS ──────────────────────────────────────────────
const SWARM_FACTIONS = {
  rome: {
    id: 'rome',
    name: 'ROME',
    fullName: 'Senatus Populusque Romanus',
    color: [175, 28, 28],
    accent: [220, 180, 60],
    darkColor: [120, 18, 18],
    capital: 'roma',
    personality: 'expansionist', // faction-level default bias
  },
  carthage: {
    id: 'carthage',
    name: 'CARTHAGE',
    fullName: 'The Merchant Republic',
    color: [100, 40, 140],
    accent: [200, 160, 60],
    darkColor: [60, 20, 90],
    capital: 'carthago',
    personality: 'mercantile',
  },
  egypt: {
    id: 'egypt',
    name: 'EGYPT',
    fullName: 'Kingdom of the Ptolemies',
    color: [40, 120, 180],
    accent: [220, 190, 60],
    darkColor: [20, 70, 120],
    capital: 'alexandria',
    personality: 'defensive',
  },
  greece: {
    id: 'greece',
    name: 'GREECE',
    fullName: 'The Hellenic League',
    color: [30, 100, 170],
    accent: [240, 240, 240],
    darkColor: [15, 60, 110],
    capital: 'athenae',
    personality: 'cultural',
  },
  seleucid: {
    id: 'seleucid',
    name: 'SELEUCID',
    fullName: 'The Seleucid Empire',
    color: [180, 140, 40],
    accent: [240, 220, 160],
    darkColor: [120, 90, 20],
    capital: 'antiochia',
    personality: 'imperial',
  },
  iberia: {
    id: 'iberia',
    name: 'IBERIA',
    fullName: 'The Iberian Tribes',
    color: [160, 100, 40],
    accent: [220, 180, 120],
    darkColor: [100, 60, 20],
    capital: 'gades',
    personality: 'tribal',
  },
  gaul: {
    id: 'gaul',
    name: 'GAUL',
    fullName: 'The Celtic Confederacy',
    color: [40, 130, 60],
    accent: [180, 220, 140],
    darkColor: [20, 80, 35],
    capital: 'massilia',
    personality: 'warrior',
  },
  numidia: {
    id: 'numidia',
    name: 'NUMIDIA',
    fullName: 'Kingdom of Numidia',
    color: [180, 140, 80],
    accent: [240, 220, 180],
    darkColor: [120, 90, 50],
    capital: 'cirta',
    personality: 'nomadic',
  },
};

// ─── CITIES / SETTLEMENTS ─────────────────────────────────────────────
// Real lat/lon positions for ancient Mediterranean cities
const MED_CITIES = {
  // ── ROME ──
  roma:         { lat: 41.89, lon: 12.49, name: 'Roma', faction: 'rome', type: 'capital', pop: 5, port: false },
  syracusae:    { lat: 37.07, lon: 15.29, name: 'Syracusae', faction: 'rome', type: 'major', pop: 4, port: true },
  mediolanum:   { lat: 45.46, lon: 9.19,  name: 'Mediolanum', faction: 'rome', type: 'major', pop: 3, port: false },
  neapolis:     { lat: 40.85, lon: 14.27, name: 'Neapolis', faction: 'rome', type: 'major', pop: 3, port: true },
  brundisium:   { lat: 40.64, lon: 17.94, name: 'Brundisium', faction: 'rome', type: 'port', pop: 2, port: true },
  tarentum:     { lat: 40.47, lon: 17.24, name: 'Tarentum', faction: 'rome', type: 'port', pop: 2, port: true },
  ostia:        { lat: 41.76, lon: 12.29, name: 'Ostia', faction: 'rome', type: 'port', pop: 2, port: true },
  ravenna:      { lat: 44.42, lon: 12.20, name: 'Ravenna', faction: 'rome', type: 'port', pop: 2, port: true },

  // ── CARTHAGE ──
  carthago:     { lat: 36.85, lon: 10.32, name: 'Carthago', faction: 'carthage', type: 'capital', pop: 5, port: true },
  utica:        { lat: 37.06, lon: 10.06, name: 'Utica', faction: 'carthage', type: 'major', pop: 3, port: true },
  leptis_magna: { lat: 32.64, lon: 14.29, name: 'Leptis Magna', faction: 'carthage', type: 'major', pop: 3, port: true },
  hadrumetum:   { lat: 35.83, lon: 10.60, name: 'Hadrumetum', faction: 'carthage', type: 'port', pop: 2, port: true },
  hippo_regius: { lat: 36.88, lon: 7.76,  name: 'Hippo Regius', faction: 'carthage', type: 'port', pop: 2, port: true },
  thapsus:      { lat: 35.60, lon: 11.03, name: 'Thapsus', faction: 'carthage', type: 'minor', pop: 1, port: true },

  // ── EGYPT ──
  alexandria:   { lat: 31.20, lon: 29.92, name: 'Alexandria', faction: 'egypt', type: 'capital', pop: 5, port: true },
  memphis:      { lat: 29.85, lon: 31.25, name: 'Memphis', faction: 'egypt', type: 'major', pop: 4, port: false },
  pelusium:     { lat: 31.05, lon: 32.55, name: 'Pelusium', faction: 'egypt', type: 'port', pop: 2, port: true },
  cyrene:       { lat: 32.82, lon: 21.86, name: 'Cyrene', faction: 'egypt', type: 'major', pop: 3, port: false },
  ptolemais:    { lat: 32.90, lon: 20.94, name: 'Ptolemais', faction: 'egypt', type: 'port', pop: 2, port: true },

  // ── GREECE ──
  athenae:      { lat: 37.97, lon: 23.73, name: 'Athenae', faction: 'greece', type: 'capital', pop: 4, port: true },
  sparta:       { lat: 37.08, lon: 22.43, name: 'Sparta', faction: 'greece', type: 'major', pop: 3, port: false },
  corinthus:    { lat: 37.91, lon: 22.88, name: 'Corinthus', faction: 'greece', type: 'major', pop: 3, port: true },
  thessalonica: { lat: 40.64, lon: 22.94, name: 'Thessalonica', faction: 'greece', type: 'major', pop: 3, port: true },
  rhodos:       { lat: 36.43, lon: 28.22, name: 'Rhodos', faction: 'greece', type: 'port', pop: 2, port: true },
  knossos:      { lat: 35.30, lon: 25.16, name: 'Knossos', faction: 'greece', type: 'major', pop: 2, port: true },
  byzantium:    { lat: 41.01, lon: 28.98, name: 'Byzantium', faction: 'greece', type: 'major', pop: 3, port: true },
  delphi:       { lat: 38.48, lon: 22.50, name: 'Delphi', faction: 'greece', type: 'minor', pop: 1, port: false },

  // ── SELEUCID (Eastern Mediterranean) ──
  antiochia:    { lat: 36.20, lon: 36.16, name: 'Antiochia', faction: 'seleucid', type: 'capital', pop: 5, port: false },
  tyrus:        { lat: 33.27, lon: 35.20, name: 'Tyrus', faction: 'seleucid', type: 'major', pop: 3, port: true },
  sidon:        { lat: 33.56, lon: 35.37, name: 'Sidon', faction: 'seleucid', type: 'port', pop: 2, port: true },
  hierosolyma:  { lat: 31.77, lon: 35.23, name: 'Hierosolyma', faction: 'seleucid', type: 'major', pop: 3, port: false },
  damascus:     { lat: 33.51, lon: 36.29, name: 'Damascus', faction: 'seleucid', type: 'major', pop: 4, port: false },
  tarsus:       { lat: 36.92, lon: 34.89, name: 'Tarsus', faction: 'seleucid', type: 'port', pop: 2, port: true },

  // ── IBERIA ──
  gades:        { lat: 36.53, lon: -6.29, name: 'Gades', faction: 'iberia', type: 'capital', pop: 3, port: true },
  carthago_nova:{ lat: 37.60, lon: -0.99, name: 'Carthago Nova', faction: 'iberia', type: 'major', pop: 3, port: true },
  tarraco:      { lat: 41.12, lon: 1.25,  name: 'Tarraco', faction: 'iberia', type: 'major', pop: 2, port: true },
  saguntum:     { lat: 39.68, lon: -0.27, name: 'Saguntum', faction: 'iberia', type: 'minor', pop: 2, port: true },
  hispalis:     { lat: 37.39, lon: -6.00, name: 'Hispalis', faction: 'iberia', type: 'minor', pop: 2, port: false },

  // ── GAUL ──
  massilia:     { lat: 43.30, lon: 5.37,  name: 'Massilia', faction: 'gaul', type: 'capital', pop: 3, port: true },
  narbo:        { lat: 43.18, lon: 3.00,  name: 'Narbo', faction: 'gaul', type: 'major', pop: 2, port: true },
  lugdunum:     { lat: 45.76, lon: 4.83,  name: 'Lugdunum', faction: 'gaul', type: 'major', pop: 2, port: false },
  nicaea:       { lat: 43.70, lon: 7.27,  name: 'Nicaea', faction: 'gaul', type: 'minor', pop: 1, port: true },

  // ── NUMIDIA ──
  cirta:        { lat: 36.37, lon: 6.61,  name: 'Cirta', faction: 'numidia', type: 'capital', pop: 3, port: false },
  thugga:       { lat: 36.42, lon: 9.22,  name: 'Thugga', faction: 'numidia', type: 'minor', pop: 1, port: false },
  zama:         { lat: 35.98, lon: 8.82,  name: 'Zama', faction: 'numidia', type: 'minor', pop: 2, port: false },
  iol:          { lat: 36.66, lon: 2.18,  name: 'Iol', faction: 'numidia', type: 'port', pop: 2, port: true },
};

// ─── MAJOR ISLANDS ────────────────────────────────────────────────────
const MED_ISLANDS = {
  sicilia:    { lat: 37.50, lon: 14.00, name: 'Sicilia', rx: 40, ry: 25, faction: 'rome' },
  sardinia:   { lat: 40.00, lon: 9.00,  name: 'Sardinia', rx: 20, ry: 35, faction: null },
  corsica:    { lat: 42.15, lon: 9.10,  name: 'Corsica', rx: 15, ry: 28, faction: null },
  creta:      { lat: 35.24, lon: 24.90, name: 'Creta', rx: 40, ry: 10, faction: 'greece' },
  cyprus:     { lat: 35.13, lon: 33.43, name: 'Cyprus', rx: 30, ry: 12, faction: 'seleucid' },
  malta:      { lat: 35.90, lon: 14.51, name: 'Malta', rx: 5, ry: 3, faction: null },
  mallorca:   { lat: 39.57, lon: 2.96,  name: 'Mallorca', rx: 15, ry: 10, faction: 'iberia' },
  menorca:    { lat: 39.95, lon: 4.09,  name: 'Menorca', rx: 10, ry: 5, faction: 'iberia' },
  ibiza:      { lat: 38.91, lon: 1.43,  name: 'Ibiza', rx: 8, ry: 6, faction: 'iberia' },
};

// ─── SEA ROUTES (major ancient trade/naval routes) ────────────────────
const MED_SEA_ROUTES = [
  // Western Med
  { from: 'gades', to: 'carthago_nova', type: 'trade', danger: 0.1 },
  { from: 'carthago_nova', to: 'carthago', type: 'trade', danger: 0.2 },
  { from: 'carthago', to: 'syracusae', type: 'trade', danger: 0.3 },
  { from: 'massilia', to: 'narbo', type: 'trade', danger: 0.1 },
  { from: 'massilia', to: 'ostia', type: 'trade', danger: 0.2 },
  { from: 'ostia', to: 'neapolis', type: 'trade', danger: 0.1 },
  { from: 'neapolis', to: 'syracusae', type: 'trade', danger: 0.15 },

  // Central Med
  { from: 'syracusae', to: 'carthago', type: 'contested', danger: 0.4 },
  { from: 'carthago', to: 'hippo_regius', type: 'trade', danger: 0.1 },
  { from: 'brundisium', to: 'corinthus', type: 'trade', danger: 0.2 },
  { from: 'corinthus', to: 'athenae', type: 'trade', danger: 0.1 },
  { from: 'tarentum', to: 'brundisium', type: 'trade', danger: 0.05 },

  // Eastern Med
  { from: 'athenae', to: 'rhodos', type: 'trade', danger: 0.15 },
  { from: 'rhodos', to: 'alexandria', type: 'trade', danger: 0.2 },
  { from: 'athenae', to: 'byzantium', type: 'trade', danger: 0.2 },
  { from: 'rhodos', to: 'tyrus', type: 'trade', danger: 0.25 },
  { from: 'tyrus', to: 'sidon', type: 'trade', danger: 0.1 },
  { from: 'sidon', to: 'alexandria', type: 'trade', danger: 0.2 },
  { from: 'alexandria', to: 'cyrene', type: 'trade', danger: 0.15 },
  { from: 'cyrene', to: 'leptis_magna', type: 'trade', danger: 0.3 },
  { from: 'leptis_magna', to: 'carthago', type: 'trade', danger: 0.2 },

  // Cross-Med
  { from: 'ostia', to: 'carthago', type: 'contested', danger: 0.35 },
  { from: 'alexandira', to: 'knossos', type: 'trade', danger: 0.2 },
  { from: 'thessalonica', to: 'byzantium', type: 'trade', danger: 0.15 },
];

// ─── SIMPLIFIED COASTLINE DATA ────────────────────────────────────────
// Approximate coastline vertices for the Mediterranean
// These define the LAND masses — the sea is everything else
// Format: arrays of [lon, lat] pairs tracing coastlines
// Simplified to ~30-50 points per major landmass for performance

const MED_COASTLINES = {
  // Iberian Peninsula (southern coast)
  iberia: [
    [-5.6, 36.0], [-4.5, 36.7], [-3.8, 36.7], [-2.5, 36.8], [-1.6, 37.0],
    [-0.5, 37.4], [0.0, 38.0], [0.2, 38.7], [0.5, 39.5], [0.8, 40.5],
    [1.3, 41.0], [2.0, 41.3], [3.1, 42.0], [3.2, 42.5],
  ],

  // Southern France
  gaul_coast: [
    [3.2, 42.5], [3.5, 43.0], [4.0, 43.1], [5.0, 43.2], [5.8, 43.1],
    [6.5, 43.4], [7.0, 43.6], [7.5, 43.8],
  ],

  // Italian Peninsula (west coast down, east coast up)
  italia_west: [
    [7.5, 43.8], [8.2, 44.0], [9.5, 44.3], [9.8, 44.1], [10.0, 43.6],
    [10.5, 43.0], [11.0, 42.5], [11.5, 42.0], [12.0, 41.8], [12.3, 41.7],
    [12.5, 41.2], [13.0, 40.7], [14.0, 40.6], [14.5, 40.3],
    [15.0, 40.0], [15.6, 39.8], [15.6, 39.1], [16.0, 38.9],
    [15.7, 38.2], [15.6, 38.0],
  ],
  italia_toe: [
    [15.6, 38.0], [16.0, 37.9], [16.5, 38.1], [17.0, 38.5],
    [17.1, 39.1], [17.2, 39.8], [17.5, 40.3], [18.0, 40.5],
    [18.5, 40.3], [18.5, 40.0], [18.3, 39.5],
  ],
  italia_east: [
    [18.5, 40.3], [17.9, 40.6], [17.2, 41.0], [16.5, 41.2],
    [15.5, 41.8], [14.5, 42.0], [13.8, 42.5], [13.5, 43.5],
    [13.2, 44.0], [12.5, 44.5], [12.3, 45.0],
  ],

  // North Africa (west to east)
  africa_west: [
    [-5.6, 36.0], [-5.3, 35.8], [-4.0, 35.2], [-2.5, 35.1],
    [-1.5, 35.0], [0.0, 35.4], [1.0, 36.0], [2.0, 36.5],
    [3.0, 36.8], [4.0, 36.9], [5.0, 36.8],
  ],
  africa_tunisia: [
    [5.0, 36.8], [6.5, 37.0], [7.5, 37.1], [8.5, 37.0],
    [9.5, 37.0], [10.0, 37.0], [10.5, 37.1], [11.0, 37.0],
    [11.0, 36.5], [10.5, 35.5], [10.8, 35.0], [11.5, 34.5],
  ],
  africa_east: [
    [11.5, 34.5], [12.5, 33.5], [13.5, 33.0], [14.5, 32.5],
    [15.0, 32.5], [16.0, 32.0], [18.0, 31.5], [20.0, 31.0],
    [22.0, 31.5], [24.0, 31.5], [25.5, 31.5], [27.0, 31.2],
    [29.0, 31.0], [30.0, 31.2], [31.0, 31.5], [32.5, 31.3],
  ],

  // Greece & Balkans
  greece_coast: [
    [20.0, 39.8], [20.5, 39.5], [21.0, 38.8], [21.5, 38.3],
    [21.7, 37.8], [21.5, 37.0], [22.0, 36.8], [22.5, 36.5],
    [23.0, 36.4], [23.5, 37.0], [23.7, 37.8], [24.0, 38.0],
    [24.5, 38.5], [24.0, 39.0], [23.5, 39.5], [23.0, 40.0],
    [23.0, 40.6], [24.0, 40.8], [25.0, 40.8], [26.0, 40.5],
    [26.5, 40.8], [27.5, 41.0], [28.5, 41.0], [29.0, 41.0],
  ],

  // Turkey (southern coast)
  anatolia: [
    [29.0, 41.0], [29.5, 41.0], [30.5, 41.2], [31.5, 41.5],
    [35.0, 36.5], [34.5, 36.2], [33.5, 36.0], [32.5, 36.3],
    [31.0, 36.5], [30.0, 36.7], [29.0, 36.7], [28.5, 36.6],
    [28.0, 36.7], [27.5, 37.0], [27.0, 37.3], [26.5, 37.5],
    [26.5, 38.0], [27.0, 38.5], [27.5, 38.8], [26.5, 39.5],
    [26.0, 39.8], [27.0, 40.5],
  ],

  // Levant coast (south to north)
  levant: [
    [32.5, 31.3], [34.0, 31.3], [34.5, 31.5], [35.0, 32.0],
    [35.2, 32.5], [35.4, 33.0], [35.5, 33.5], [35.6, 34.0],
    [35.8, 34.5], [36.0, 35.0], [36.0, 35.5], [36.2, 36.0],
    [36.5, 36.5], [35.0, 36.5],
  ],
};

// ─── STRAITS (narrow passages) ────────────────────────────────────────
const MED_STRAITS = [
  { name: 'Pillars of Hercules', lat: 35.96, lon: -5.50, width: 14 },
  { name: 'Strait of Messina', lat: 38.20, lon: 15.60, width: 3 },
  { name: 'Bosphorus', lat: 41.12, lon: 29.05, width: 1 },
  { name: 'Hellespont', lat: 40.20, lon: 26.40, width: 1.5 },
];


// ═══════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════

// Mediterranean color palette
const MED_COLORS = {
  deepSea:     [18, 40, 75],
  sea:         [30, 65, 115],
  shallowSea:  [45, 90, 140],
  coastWater:  [60, 115, 160],
  sand:        [210, 195, 155],
  land:        [170, 155, 120],
  darkLand:    [140, 125, 95],
  mountain:    [130, 120, 105],
  forest:      [80, 110, 65],
  cityGlow:    [255, 220, 120],
};

// Camera for panning/zooming the map
const medCam = {
  x: 0,
  y: 0,
  zoom: 1.0,
  targetZoom: 1.0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  camStartX: 0,
  camStartY: 0,
};

// Pre-rendered map buffer (redrawn only when camera changes)
let _mapBuffer = null;
let _mapBufferDirty = true;
let _mapLastZoom = 0;

function initMedMap(canvasW, canvasH) {
  MED_MAP.canvasW = canvasW || 1280;
  MED_MAP.canvasH = canvasH || 800;

  // Center camera on the Mediterranean
  medCam.x = 0;
  medCam.y = 0;
  medCam.zoom = 1.0;
  medCam.targetZoom = 1.0;
  _mapBufferDirty = true;
}

// Convert coastline array to screen coords
function coastToScreen(coastArr) {
  let pts = [];
  for (let c of coastArr) {
    pts.push(MED_MAP.toScreen(c[1], c[0]));
  }
  return pts;
}

// Draw the full Mediterranean map
function drawMediterraneanMap() {
  push();

  // Apply camera transform
  translate(width / 2, height / 2);
  scale(medCam.zoom);
  translate(-width / 2 + medCam.x, -height / 2 + medCam.y);

  // ── Sea background ──
  background(MED_COLORS.deepSea[0], MED_COLORS.deepSea[1], MED_COLORS.deepSea[2]);

  // Sea gradient bands (deeper = darker)
  noStroke();
  fill(MED_COLORS.sea[0], MED_COLORS.sea[1], MED_COLORS.sea[2], 80);
  ellipse(width * 0.5, height * 0.5, width * 0.9, height * 0.7);
  fill(MED_COLORS.shallowSea[0], MED_COLORS.shallowSea[1], MED_COLORS.shallowSea[2], 50);
  ellipse(width * 0.5, height * 0.55, width * 0.7, height * 0.5);

  // ── Draw coastlines (land masses) ──
  drawLandMasses();

  // ── Draw sea routes ──
  drawSeaRoutes();

  // ── Draw islands ──
  drawMedIslands();

  // ── Draw cities ──
  drawMedCities();

  // ── Draw straits markers ──
  drawStraits();

  // ── Draw faction territories (subtle overlay) ──
  drawFactionTerritories();

  pop();
}

function drawLandMasses() {
  // Draw each coastline region as a filled shape
  for (let key in MED_COASTLINES) {
    let coast = MED_COASTLINES[key];
    let pts = coastToScreen(coast);

    // Land fill
    fill(MED_COLORS.land[0], MED_COLORS.land[1], MED_COLORS.land[2]);
    stroke(MED_COLORS.sand[0], MED_COLORS.sand[1], MED_COLORS.sand[2], 120);
    strokeWeight(1.5 / medCam.zoom);

    // Extend land to edges where needed
    beginShape();
    // Add edge extension for coastlines that touch map borders
    if (key === 'iberia' || key === 'gaul_coast' || key === 'italia_west') {
      // Northern coastlines — extend up to top edge
      let first = pts[0];
      let last = pts[pts.length - 1];
      vertex(first.x, 0);
      for (let p of pts) vertex(p.x, p.y);
      vertex(last.x, 0);
    } else if (key.startsWith('africa')) {
      // African coastlines — extend down to bottom edge
      let first = pts[0];
      let last = pts[pts.length - 1];
      vertex(first.x, height);
      for (let p of pts) vertex(p.x, p.y);
      vertex(last.x, height);
    } else if (key === 'levant') {
      // Levant — extend right to edge
      let first = pts[0];
      let last = pts[pts.length - 1];
      vertex(width, first.y);
      for (let p of pts) vertex(p.x, p.y);
      vertex(width, last.y);
    } else {
      // Generic coastline
      for (let p of pts) vertex(p.x, p.y);
    }
    endShape(CLOSE);

    // Coastal shadow/highlight
    noFill();
    stroke(MED_COLORS.coastWater[0], MED_COLORS.coastWater[1], MED_COLORS.coastWater[2], 80);
    strokeWeight(3 / medCam.zoom);
    beginShape();
    for (let p of pts) vertex(p.x, p.y);
    endShape();
  }
}

function drawMedIslands() {
  for (let key in MED_ISLANDS) {
    let isl = MED_ISLANDS[key];
    let pos = MED_MAP.toScreen(isl.lat, isl.lon);
    let rxS = isl.rx * medCam.zoom * 0.7;
    let ryS = isl.ry * medCam.zoom * 0.7;

    // Island shadow
    noStroke();
    fill(0, 0, 0, 30);
    ellipse(pos.x + 2, pos.y + 2, rxS * 2, ryS * 2);

    // Island body
    if (isl.faction && SWARM_FACTIONS[isl.faction]) {
      let fc = SWARM_FACTIONS[isl.faction].color;
      fill(lerp(MED_COLORS.land[0], fc[0], 0.2), lerp(MED_COLORS.land[1], fc[1], 0.2), lerp(MED_COLORS.land[2], fc[2], 0.2));
    } else {
      fill(MED_COLORS.land[0], MED_COLORS.land[1], MED_COLORS.land[2]);
    }
    stroke(MED_COLORS.sand[0], MED_COLORS.sand[1], MED_COLORS.sand[2], 150);
    strokeWeight(1 / medCam.zoom);

    // Organic island shape using noise
    beginShape();
    let nVerts = 24;
    for (let i = 0; i < nVerts; i++) {
      let angle = (i / nVerts) * TWO_PI;
      let nv = noise(cos(angle) * 2 + key.length * 10, sin(angle) * 2 + key.length * 10);
      let offset = 1 + (nv - 0.5) * 0.3;
      vertex(pos.x + cos(angle) * rxS * offset, pos.y + sin(angle) * ryS * offset);
    }
    endShape(CLOSE);

    // Island name
    if (medCam.zoom > 0.8) {
      noStroke();
      fill(240, 230, 210);
      textAlign(CENTER, TOP);
      textSize(max(9, 11 / medCam.zoom));
      text(isl.name, pos.x, pos.y + ryS + 4);
    }
  }
}

function drawMedCities() {
  for (let key in MED_CITIES) {
    let city = MED_CITIES[key];
    let pos = MED_MAP.toScreen(city.lat, city.lon);
    let faction = SWARM_FACTIONS[city.faction];
    if (!faction) continue;

    let fc = faction.color;
    let isCapital = city.type === 'capital';
    let radius = isCapital ? 6 : (city.type === 'major' ? 4 : 3);
    radius /= medCam.zoom;
    radius = max(2, radius);

    // City glow for capitals
    if (isCapital) {
      noStroke();
      fill(MED_COLORS.cityGlow[0], MED_COLORS.cityGlow[1], MED_COLORS.cityGlow[2], 40);
      ellipse(pos.x, pos.y, radius * 6, radius * 6);
      fill(MED_COLORS.cityGlow[0], MED_COLORS.cityGlow[1], MED_COLORS.cityGlow[2], 25);
      ellipse(pos.x, pos.y, radius * 10, radius * 10);
    }

    // City dot
    stroke(0, 0, 0, 100);
    strokeWeight(1 / medCam.zoom);
    fill(fc[0], fc[1], fc[2]);
    if (isCapital) {
      // Star shape for capitals
      rectMode(CENTER);
      push();
      translate(pos.x, pos.y);
      rotate(PI / 4);
      rect(0, 0, radius * 2, radius * 2);
      pop();
      rectMode(CORNER);
    } else {
      ellipse(pos.x, pos.y, radius * 2, radius * 2);
    }

    // Port indicator
    if (city.port) {
      noFill();
      stroke(MED_COLORS.coastWater[0], MED_COLORS.coastWater[1], MED_COLORS.coastWater[2], 120);
      strokeWeight(1 / medCam.zoom);
      arc(pos.x, pos.y, radius * 4, radius * 4, 0, PI);
    }

    // City name (only when zoomed in enough)
    let minZoom = isCapital ? 0.6 : (city.type === 'major' ? 0.9 : 1.3);
    if (medCam.zoom >= minZoom) {
      noStroke();
      fill(240, 230, 210, isCapital ? 255 : 200);
      textAlign(CENTER, TOP);
      textSize(max(8, (isCapital ? 12 : 10) / medCam.zoom));
      if (typeof textFont === 'function') {
        try { textFont('Cinzel'); } catch(e) {}
      }
      text(city.name, pos.x, pos.y + radius + 3);
      // Faction label for capitals
      if (isCapital && medCam.zoom >= 0.8) {
        fill(fc[0], fc[1], fc[2], 180);
        textSize(max(7, 9 / medCam.zoom));
        text(faction.name, pos.x, pos.y + radius + 16);
      }
    }
  }
}

function drawSeaRoutes() {
  for (let route of MED_SEA_ROUTES) {
    let fromCity = MED_CITIES[route.from];
    let toCity = MED_CITIES[route.to];
    if (!fromCity || !toCity) continue;

    let from = MED_MAP.toScreen(fromCity.lat, fromCity.lon);
    let to = MED_MAP.toScreen(toCity.lat, toCity.lon);

    // Route line
    let alpha = route.type === 'contested' ? 60 : 30;
    if (route.type === 'contested') {
      stroke(200, 80, 80, alpha);
    } else {
      stroke(MED_COLORS.coastWater[0], MED_COLORS.coastWater[1], MED_COLORS.coastWater[2], alpha);
    }
    strokeWeight(max(0.5, 1 / medCam.zoom));

    // Dashed line effect
    let dx = to.x - from.x;
    let dy = to.y - from.y;
    let dist = sqrt(dx * dx + dy * dy);
    let dashLen = 6 / medCam.zoom;
    let steps = floor(dist / dashLen);
    for (let i = 0; i < steps; i += 2) {
      let t1 = i / steps;
      let t2 = min((i + 1) / steps, 1);
      line(from.x + dx * t1, from.y + dy * t1, from.x + dx * t2, from.y + dy * t2);
    }
  }
}

function drawStraits() {
  for (let strait of MED_STRAITS) {
    let pos = MED_MAP.toScreen(strait.lat, strait.lon);
    // Subtle marker
    noFill();
    stroke(MED_COLORS.coastWater[0], MED_COLORS.coastWater[1], MED_COLORS.coastWater[2], 100);
    strokeWeight(1 / medCam.zoom);
    let sz = max(8, 12 / medCam.zoom);
    line(pos.x - sz, pos.y - sz / 2, pos.x + sz, pos.y + sz / 2);
    line(pos.x - sz, pos.y + sz / 2, pos.x + sz, pos.y - sz / 2);

    if (medCam.zoom > 1.0) {
      noStroke();
      fill(200, 200, 220, 150);
      textAlign(CENTER, TOP);
      textSize(max(7, 8 / medCam.zoom));
      text(strait.name, pos.x, pos.y + sz + 2);
    }
  }
}

function drawFactionTerritories() {
  // Subtle colored glow around faction cities
  for (let key in MED_CITIES) {
    let city = MED_CITIES[key];
    let faction = SWARM_FACTIONS[city.faction];
    if (!faction) continue;

    let pos = MED_MAP.toScreen(city.lat, city.lon);
    let fc = faction.color;
    let influence = city.type === 'capital' ? 50 : (city.type === 'major' ? 35 : 20);
    influence /= medCam.zoom;

    noStroke();
    fill(fc[0], fc[1], fc[2], 12);
    ellipse(pos.x, pos.y, influence * 2, influence * 2);
  }
}

// ─── MAP INTERACTION ──────────────────────────────────────────────────
function handleMapMousePressed(mx, my) {
  medCam.dragging = true;
  medCam.dragStartX = mx;
  medCam.dragStartY = my;
  medCam.camStartX = medCam.x;
  medCam.camStartY = medCam.y;
}

function handleMapMouseDragged(mx, my) {
  if (!medCam.dragging) return;
  medCam.x = medCam.camStartX + (mx - medCam.dragStartX) / medCam.zoom;
  medCam.y = medCam.camStartY + (my - medCam.dragStartY) / medCam.zoom;
}

function handleMapMouseReleased() {
  medCam.dragging = false;
}

function handleMapMouseWheel(delta) {
  let zoomSpeed = 0.1;
  if (delta > 0) {
    medCam.targetZoom = max(0.3, medCam.targetZoom - zoomSpeed);
  } else {
    medCam.targetZoom = min(4.0, medCam.targetZoom + zoomSpeed);
  }
}

function updateMapCamera() {
  // Smooth zoom interpolation
  medCam.zoom = lerp(medCam.zoom, medCam.targetZoom, 0.15);
}

// Find city under mouse cursor (for click interaction)
function getCityAtScreen(mx, my) {
  // Transform mouse coords back to map space
  let mapX = (mx - width / 2) / medCam.zoom + width / 2 - medCam.x;
  let mapY = (my - height / 2) / medCam.zoom + height / 2 - medCam.y;

  let bestCity = null;
  let bestDist = 20; // click tolerance in pixels

  for (let key in MED_CITIES) {
    let city = MED_CITIES[key];
    let pos = MED_MAP.toScreen(city.lat, city.lon);
    let d = dist(mapX, mapY, pos.x, pos.y);
    if (d < bestDist) {
      bestDist = d;
      bestCity = key;
    }
  }
  return bestCity;
}
