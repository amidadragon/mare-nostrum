# Three.js Hybrid Migration Plan

## 1. Architecture Overview

### Current Stack
- **Renderer**: p5.js Canvas2D (single `<canvas>`, 60fps target)
- **Coordinate system**: World-space `(wx, wy)` converted to screen via `w2sX/w2sY` (simple camera offset from `camSmooth`). Zoom applied via `translate(w/2, h/2); scale(camZoom); translate(-w/2, -h/2)` wrapping all world draws.
- **Draw order**: Manual Y-sorting via `drawWorldObjectsSorted()` — two layers: ground items (re-sorted every 30 frames) and tall objects + characters (sorted every frame).
- **Canvas size**: ~1200x800 typical, scales to window.

### Proposed Hybrid
```
┌─────────────────────────────────────────┐
│           Browser Window                │
│  ┌───────────────────────────────────┐  │
│  │  Three.js WebGL Canvas (z-index 0)│  │
│  │  - Terrain mesh (island)          │  │
│  │  - Ocean plane + shader           │  │
│  │  - 3D buildings (GLTF)            │  │
│  │  - 3D characters (rigged)         │  │
│  │  - Lighting + shadows             │  │
│  │  - Sky (skybox or shader)         │  │
│  │  - Particles (GPU instanced)      │  │
│  ├───────────────────────────────────┤  │
│  │  p5.js Canvas2D (z-index 1)       │  │
│  │  - HUD, hotbar, resource counters │  │
│  │  - Build menu, shop panels        │  │
│  │  - Dialogue boxes, notifications  │  │
│  │  - Minimap, compass               │  │
│  │  - Menus (main, settings, credits)│  │
│  │  - Floating text (could move)     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

The p5.js canvas sits as a transparent overlay on top of the Three.js canvas. p5.js handles all 2D UI; Three.js handles all world rendering.

---

## 2. Current Render Pipeline Analysis

### Home Island Frame (Normal Mode)
The `drawInner()` function at line 3068 of `sketch.js` dispatches to ~12 different game modes. The heaviest is "Normal Island Mode" (line 3465), which calls:

**Background layer** (inside `translate(shakeX, shakeY)`):
1. `drawSky()` — world.js:320 — gradient fill + clouds + sun + stars (~100 draw calls)
2. `drawSkyBirds()` — animated bird silhouettes
3. `drawOcean()` — sketch.js:4552 — 10-band gradient + wave rows + foam caps (~200+ draw calls)
4. `drawOceanWildlife()` — dolphins, turtles
5. `drawAtmosphericHaze()` — overlay rect
6. `drawAmbientShips()` — distant ship silhouettes
7. `drawSeaPeopleShips()` — enemy ships

**Distant islands layer** (inside `translate(shakeX, shakeY)`, no floatOffset):
8. `drawArenaIsleDistant()`, `drawConquestIsleDistant()`, `drawRivalIsleDistant()`
9. `drawImperialBridge()`
10. `drawColonyOverlay()`
11. Various distant island labels

**Island + entities layer** (inside `translate(shakeX, shakeY + floatOffset)`):
12. `drawIsland()` — world.js:797 — ~15 concentric coastline shapes, foam loops, beach layers, pebbles, tide pools, grass layers, hills, paths, farm dirt, shadows (~500+ draw calls)
13. `drawShoreWaves()` — animated wave particles
14. `drawAmbientHouses()` — ~20 procedural houses
15. `drawWorldObjectsSorted()` — Y-sorted render of ALL entities:
    - Ground layer: plots, resources, crystal nodes, faction flora
    - Tall layer: pyramid, ruins, ~35 building types, trees, ambient houses, clutter, shrine, fountain, chickens, wildlife, companions (cat, tortoise, crow, centurion), harvester, woodcutter, quarrier, cook, fisherman, citizens (up to 15 visible), legion soldiers, escort army, NPCs (Livia, Marcus, Vesta, Felix), night market, visitor, temple court visitors, **player**
16. `drawCitySmoke()`, `drawLaundryLines()`, `drawStreetWear()`
17. `drawGranaryArea()`, `drawAmphoraStacks()`, `drawTempleIncense()`
18. `drawForumBanner()`, `drawWindowGlow()`, `drawRuinOverlays()`
19. `drawCompanionTrail()`, `drawPlayerTrail()`
20. `drawNightLighting()` — world.js:3032 — ambient darkness overlay + light sources
21. `drawFishing()` — bobber + line + fish
22. `drawParticles()` — up to 200 particles (capped, auto-throttled)
23. `drawSeasonalEffects()` — falling leaves, snow, pollen
24. `drawAmbientWildlife()` — butterflies, fireflies
25. `drawWeatherEffects()` — rain, fog, storm
26. `drawEnergyArcs()`, `drawFloatingText()`, `drawShip()`, `drawOracleStone()`
27. `drawFestivalDecorations()`, `drawBottles()`, `drawTreasureHint()`

**HUD layer** (screen-space, after pop()):
28. Full HUD, prompts, menus, notifications, cursor, vignette, save indicator

### Estimated Draw Calls Per Frame
- **Sky**: ~100 (gradient bands, clouds, sun rays, stars at night)
- **Ocean**: ~200 (gradient, wave rows every 26px, foam, reflections)
- **Island terrain**: ~500 (15+ coastline shapes each with 60 vertices, beach details, grass layers, hills, paths)
- **Buildings**: ~35 types x ~5-20 draw calls each = ~200
- **Characters**: ~30 entities x ~15 draw calls each = ~450
- **Particles/effects**: ~200-400
- **HUD**: ~100-200
- **TOTAL: ~1500-2000 Canvas2D draw calls per frame**

This is extremely heavy for Canvas2D. Three.js with instancing could reduce this to <100 WebGL draw calls.

### Coordinate System
```javascript
// World → Screen (used everywhere)
function w2sX(wx) { return (wx - camSmooth.x) + width / 2; }
function w2sY(wy) { return (wy - camSmooth.y) + height / 2; }

// Screen → World (used for mouse input)
function s2wX(sx) { return (sx - width / 2) / camZoom + camSmooth.x; }
function s2wY(sy) { return (sy - height / 2) / camZoom + camSmooth.y; }

// Camera follows player with upward bias
cam.x = state.player.x;
cam.y = state.player.y - height * 0.12;
camSmooth lerps toward cam at 0.08

// Zoom applied as scale() transform around screen center
// camZoom range: ~0.5 (sailing) to 1.0+ (normal)

// Island floats with sinusoidal bob
floatOffset = sin(frameCount * 0.015) * 1.5;

// Everything on the island is drawn inside:
translate(shakeX, shakeY + floatOffset);
```

### Island Geometry
- Center: `WORLD.islandCX=600, islandCY=400`
- Radii: `state.islandRX` x `state.islandRY` (expands with progression)
- Shape: Elliptical with organic coastline noise offsets (60 vertices via `getCoastlineVerts()`)
- Walkable surface: 90% x 36% of island radii
- Rendered as ~15 concentric filled ellipses (water → beach → grass → hills)
- Y-axis is depth (isometric-ish top-down, not true isometric)

---

## 3. Breaking Points & Solutions

### 3.1 Coordinate Conversion (w2sX/w2sY)
**Problem**: Every entity uses `w2sX/w2sY` to position itself on the Canvas2D. Three.js uses its own 3D coordinate system.

**Solution**: In Three.js, world objects are positioned directly in 3D space — no screen conversion needed. The camera handles the projection. `w2sX/w2sY` would only be needed for the p5.js overlay (HUD labels positioned above 3D objects). Use Three.js `Vector3.project(camera)` to get screen coordinates when needed.

### 3.2 Mouse/Touch Input
**Problem**: Current code uses `s2wX(mouseX)`, `s2wY(mouseY)` to convert clicks to world positions. Building placement, NPC interaction, click-to-move all depend on this.

**Solution**: Replace with Three.js `Raycaster`. Cast a ray from camera through mouse position, intersect with terrain mesh to get world position. For building placement, intersect with the ground plane.

### 3.3 Camera System
**Problem**: Camera is a simple offset (`camSmooth`) with scale(`camZoom`). Build mode pulls back, sailing zooms out, idle breathes.

**Solution**: Use `THREE.OrthographicCamera` for the isometric view. Map `camSmooth` to camera position, `camZoom` to camera frustum size. All the lerping/breathing logic stays identical — just drives different parameters.

### 3.4 Draw Order / Y-Sorting
**Problem**: `drawWorldObjectsSorted()` manually Y-sorts ~50+ entities every frame using `_sortItems.sort((a,b) => a.y - b.y)`.

**Solution**: Three.js handles depth via the Z-buffer automatically. In a top-down isometric view, map `worldY` to `mesh.position.z` (or use `renderOrder`). No manual sorting needed. **This is a major performance win.**

### 3.5 Zoom
**Problem**: `scale(camZoom)` applied as a Canvas2D transform. Below 1.0 during sailing.

**Solution**: Adjust `OrthographicCamera` frustum: `camera.left = -halfW / zoom`, etc. Identical behavior, hardware-accelerated.

### 3.6 Island Float/Bob
**Problem**: `translate(shakeX, shakeY + floatOffset)` applied before all island draws. `floatOffset = sin(frameCount * 0.015) * 1.5`.

**Solution**: Apply to the island's parent `THREE.Group`. `islandGroup.position.y = floatOffset`. All children inherit the bob.

### 3.7 Screen Shake
**Problem**: `translate(shakeX, shakeY)` applied to world rendering.

**Solution**: Offset the Three.js camera position by `(shakeX, shakeY)` each frame.

### 3.8 Day/Night Cycle
**Problem**: `getSkyBrightness()` drives color multipliers on every surface. `drawNightLighting()` draws a dark overlay with light holes.

**Solution**: Three.js `DirectionalLight` + `AmbientLight` with intensity/color driven by `state.time`. The entire scene darkens naturally. Point lights at torches/braziers replace the light-hole overlay. **Major visual upgrade.**

### 3.9 Building Rendering
**Problem**: 35+ building types, each hand-drawn with 5-20 `rect/ellipse/line` calls in `drawOneBuilding()`. Faction-aware colors. Construction rise animation. Directional shadows.

**Solution**: Replace with GLTF models. Each building type gets one `.glb` file. Faction color applied via material swap or shader uniform. Construction animation: scale Y from 0 to 1. Shadows are free (shadow maps). **This is the largest asset creation effort.**

### 3.10 Character Rendering
**Problem**: Player (`drawPlayer()`, player.js:499), NPCs (`drawNPC()`, `drawNewNPC()`), companions, citizens — all hand-drawn with ~50 rect calls each. Walk cycles via frame-based offsets. Faction-specific appearances.

**Solution**: Rigged 3D models with skeletal animation. One base humanoid mesh, swapped textures/materials per faction. Walk/idle/combat animations in the .glb file. **Massive visual upgrade but large asset effort.**

### 3.11 Particles
**Problem**: Up to 200 particles in `particles[]` array, each drawn as a rect/ellipse with position, velocity, life.

**Solution**: Three.js `InstancedMesh` or `THREE.Points` with custom shader. GPU-accelerated — could handle 10,000+ particles. Move to Three.js in Phase 2.

### 3.12 Coastline Shape
**Problem**: `drawCoastlineShape()` uses 60 vertices via `beginShape/endShape` with noise offsets. Called 15+ times for concentric rings.

**Solution**: Generate a terrain mesh from the coastline vertices. Height values encode water depth → beach → grass → hills. Single mesh with vertex colors or texture atlas. **Replaces 500+ draw calls with one mesh.**

---

## 4. Migration Scope Estimate

| File | Lines | % Rewrite | Effort | Notes |
|------|-------|-----------|--------|-------|
| **world.js** | 3,999 | ~95% | HIGH | Terrain → 3D mesh, sky → skybox/shader, ocean → water shader, night lighting → scene lights |
| **sketch.js** | 29,881 | ~35% | HIGH | Render pipeline, drawOcean, drawOneBuilding (35 types), drawWorldObjectsSorted, particles, weather, all draw* in world context |
| **player.js** | 1,597 | ~75% | MEDIUM | 3D model + animation replaces rect drawing. Movement/input logic stays. |
| **npc.js** | 4,111 | ~75% | MEDIUM | 4 NPCs + citizens + visitors → 3D models. Dialogue/AI logic stays. |
| **combat.js** | 5,186 | ~25% | MEDIUM | Visual effects (skill animations, enemy rendering). Core combat logic stays. |
| **farming.js** | 1,240 | ~30% | LOW | Crop visuals → 3D sprites or small meshes. Growth logic stays. |
| **fishing.js** | ~800 | ~30% | LOW | Bobber/fish visuals. Mechanics stay. |
| **ui.js** | 4,353 | ~10% | LOW | Stays in p5.js. Only needs screen-space projection for in-world labels. |
| **islands.js** | 1,747 | ~90% | HIGH | 4 unique island terrains → 3D meshes |
| **wreck.js** | 3,170 | ~80% | MEDIUM | Wreck beach → 3D scene |
| **cinematics.js** | 1,242 | ~50% | MEDIUM | Cutscenes rendered in 3D |
| **economy.js** | 1,780 | 0% | NONE | Pure logic |
| **sound.js** | 2,712 | 0% | NONE | Audio — independent |
| **narrative.js** | 1,151 | 0% | NONE | Quest logic |
| **events.js** | 1,607 | ~5% | LOW | Random events — mostly logic, some visual triggers |
| **engine.js** | ~400 | ~20% | LOW | Camera culling → frustum culling |
| **multiplayer.js** | 573 | ~5% | LOW | State sync, not rendering |
| **sprites.js** | ~150 | 100% DELETE | — | Replaced by GLTF loader |
| **debug.js** | 615 | ~5% | LOW | Console overlay stays in p5.js |
| **menu.js** | 1,634 | ~10% | LOW | 2D menus stay in p5.js |

**Total estimated rewrite: ~18,000 of 70,900 lines (25%)**

---

## 5. Phase Breakdown

### Phase 0: Proof of Concept (1 week)
- Load Three.js + p5.js on same page
- Flat green elliptical plane (island) + blue plane (ocean) + one box (building)
- p5.js transparent overlay with HUD text
- Isometric camera matching current view
- Mouse raycasting to ground plane
- Validate: both renderers share input, no z-fighting, acceptable performance

### Phase 1: Terrain & Sky (2-3 weeks)
- Generate island mesh from `getCoastlineVerts()` with height map
- Water shader (animated waves, day/night color shift)
- Sky: gradient shader or skybox driven by `state.time`
- Day/night lighting (DirectionalLight + AmbientLight)
- Distant islands as simple meshes
- **Milestone**: Island renders in 3D, everything else still p5.js overlay

### Phase 2: Buildings (3-4 weeks)
- Model all 35 building types in Blender → GLTF export
- GLTF loader + instancing for repeated types (walls, floors)
- Faction material variants (color swaps)
- Construction rise animation (scale Y)
- Shadow maps from buildings
- Adjacency bonus indicators (3D or p5.js overlay)
- **Milestone**: Buildings render as 3D models on the terrain

### Phase 3: Characters (3-4 weeks)
- Base humanoid mesh with skeletal rig
- Animations: idle, walk, combat, fishing, farming
- Player + 4 NPCs + companions (cat, tortoise, crow, centurion)
- Citizens (instanced with variation)
- Faction appearance variants (texture/material swaps)
- Wardrobe system → material swaps
- **Milestone**: Characters are 3D, animated, on the terrain

### Phase 4: Effects & Polish (2-3 weeks)
- GPU particles (pollen, sparkles, combat effects, weather)
- Shore waves (shader or particle system)
- Weather effects (rain → particle system, fog → volumetric, storm → shader)
- Seasonal effects (falling leaves, snow)
- Night lighting (point lights at torches, braziers, windows)
- Screen shake → camera shake
- **Milestone**: Visual parity with current game + massive upgrade

### Phase 5: Secondary Scenes (2-3 weeks)
- Conquest islands, Arena, Wreck Beach
- 4 explorable islands (Vulcan, Hyperborea, Plenty, Necropolis)
- Temple/Castrum interiors
- Sailing/rowing (ocean scene)
- Cutscenes in 3D
- **Milestone**: All game modes render in 3D

### Phase 6: Cleanup & Optimization (1-2 weeks)
- Remove all p5.js world-rendering code
- LOD system for distant objects
- Frustum culling
- Texture atlasing
- Mobile performance testing
- **Milestone**: Ship-ready

**Total estimate: 14-20 weeks (3.5-5 months)**

---

## 6. Risk Assessment

### High Risk
1. **Asset creation bottleneck**: 35 building types + 10+ character models + 6+ island terrains need 3D models. This is the biggest time sink and requires Blender skills or asset store purchases.
2. **p5.js + Three.js input conflict**: Both canvases capture mouse events. Need careful event routing — Three.js for world clicks (raycasting), p5.js for UI clicks (when over HUD elements).
3. **Mobile performance**: WebGL on mobile Safari/Chrome can be slow. Current Canvas2D is already pushing 30fps on low-end devices. Three.js could be worse if not optimized (shadow maps, draw calls).
4. **Coordinate system mismatch**: The current game uses a top-down 2D coordinate system where Y increases downward. Three.js uses Y-up. Every position calculation needs to be audited.

### Medium Risk
5. **Save compatibility**: Positions stored as `{x, y}` in saves. If the coordinate system changes scale, old saves break. Mitigation: keep world coordinates identical, only change rendering.
6. **Sprite fallback removal**: Current system falls back to rect drawing when sprites fail to load. The 3D pipeline has no such fallback — if a GLTF fails to load, the building is invisible.
7. **Text rendering in 3D**: Floating text, damage numbers, interaction prompts currently use p5.js `text()`. In hybrid mode, these need screen-space projection from 3D world positions.

### Low Risk
8. **p5.js library overhead**: Even with p5.js only doing HUD, the library still runs its draw loop. Minimal performance impact if the canvas is transparent with few draw calls.
9. **Sound system**: Completely decoupled from rendering. Zero risk.
10. **Game logic**: Economy, narrative, combat calculations — all pure JS, zero rendering dependency.

---

## 7. Performance Considerations

### Canvas2D (Current) vs WebGL (Three.js)

| Metric | Canvas2D (now) | Three.js (projected) |
|--------|---------------|---------------------|
| Draw calls/frame | ~1500-2000 | ~50-100 (with instancing) |
| Fill rate | Software rasterized | GPU hardware |
| Transparency | CPU compositing | GPU alpha blending |
| Shadows | Fake (manual quads) | Real-time shadow maps |
| Particles | CPU, capped at 200 | GPU instanced, 10,000+ |
| Y-sorting | CPU sort every frame | Depth buffer (free) |
| Texture memory | Minimal (rect drawing) | GLTF textures (~50-100MB) |
| Init time | Instant | 2-5s (model loading) |
| Mobile | OK (Canvas2D well-supported) | Varies (WebGL support spotty on old devices) |

### Key Optimizations for Three.js
- **Instanced meshes** for repeated objects (walls, floors, trees, citizens)
- **LOD** (Level of Detail) for distant islands — low-poly when zoomed out
- **Frustum culling** (Three.js does this automatically)
- **Texture atlas** — pack all building textures into one 2048x2048 atlas
- **Baked ambient occlusion** in GLTF models
- **Cascaded shadow maps** — only near-player shadows at full res

---

## 8. Required Dependencies

```html
<!-- Three.js core (r162+) -->
<script src="libs/three.min.js"></script>

<!-- Required addons -->
<script src="libs/three/OrbitControls.js"></script>    <!-- Camera pan/zoom -->
<script src="libs/three/GLTFLoader.js"></script>        <!-- 3D model loading -->
<script src="libs/three/DRACOLoader.js"></script>       <!-- Compressed GLTF -->
<script src="libs/three/SkeletonUtils.js"></script>     <!-- Character cloning -->

<!-- Optional addons -->
<script src="libs/three/Water2.js"></script>            <!-- Ocean shader -->
<script src="libs/three/Sky.js"></script>               <!-- Procedural sky -->
<script src="libs/three/EffectComposer.js"></script>    <!-- Post-processing -->
<script src="libs/three/OutlinePass.js"></script>       <!-- Selection highlight -->
```

Total additional JS: ~300KB minified (Three.js core is ~160KB).

### Asset Pipeline
- **Blender 3.6+** for modeling
- **glTF 2.0** format (`.glb` binary, smaller than `.gltf`)
- **Draco compression** for mesh data (~70% size reduction)
- **KTX2 textures** for GPU-compressed textures (optional, saves VRAM)

---

## 9. Running Both Renderers Side by Side

During migration, both systems run simultaneously:

```javascript
// In index.html — two canvases stacked
// Three.js canvas: id="three-canvas", position: absolute, z-index: 0
// p5.js canvas: id="defaultCanvas0", position: absolute, z-index: 1, background: transparent

// In sketch.js setup():
function setup() {
  let p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.style('position', 'absolute');
  p5Canvas.style('z-index', '1');
  p5Canvas.style('pointer-events', 'none'); // Three.js handles world clicks
  // ... existing setup code ...
}

// New file: renderer3d.js
function initThreeJS() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(/*...*/);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.id = 'three-canvas';
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.zIndex = '0';
  document.body.prepend(renderer.domElement);
}

// Migration flag per system:
const USE_3D = {
  terrain: false,   // Phase 1
  buildings: false,  // Phase 2
  characters: false, // Phase 3
  particles: false,  // Phase 4
  sky: false,        // Phase 1
  ocean: false,      // Phase 1
};

// In drawInner(), conditionally skip p5.js rendering:
if (!USE_3D.terrain) drawIsland();    // p5.js fallback
if (!USE_3D.buildings) drawBuildings(); // p5.js fallback
// Three.js always renders its scene — toggled systems add/remove meshes
```

This allows incremental migration: flip one flag at a time, test, ship.

---

## 10. Fallback Plan

If Three.js doesn't work on target hardware:

1. **WebGL detection**: At startup, check `document.createElement('canvas').getContext('webgl2')`. If null, fall back to pure p5.js (current renderer). No code changes needed — the p5.js draw functions still exist until Phase 6.

2. **Performance gate**: After 60 frames of Three.js rendering, check average FPS. If below 20, disable Three.js and fall back to p5.js with a user notification.

3. **Settings toggle**: Add "Graphics: Classic / Enhanced" to settings menu. Classic = p5.js only. Enhanced = Three.js hybrid. Let the user choose.

4. **Keep p5.js code**: Don't delete p5.js rendering code until the Three.js version is proven stable across browsers for 2+ weeks of user testing.

---

## 11. Proof-of-Concept Specification

### Goal
Validate that p5.js and Three.js can coexist on the same page with shared input and acceptable performance.

### What It Renders
**Three.js layer:**
- Flat elliptical green plane (island shape, matching current `islandRX`/`islandRY`)
- Blue plane below (ocean) with simple wave vertex animation
- One textured box (building placeholder) positioned on the island
- OrthographicCamera at isometric angle (~60 degrees from horizontal)
- DirectionalLight casting shadow from the box onto the island
- Camera follows a moving point (simulating player position)
- Mouse scroll zooms camera (adjusts frustum)

**p5.js layer (transparent overlay):**
- "MARE NOSTRUM" title text
- Resource counter HUD (top-left)
- FPS counter (top-right)
- "Click to place building" prompt
- Minimap outline (bottom-right)

### Interactions
- **WASD**: Moves the "player" point; Three.js camera follows
- **Mouse click on Three.js canvas**: Raycast to ground plane, place a new box at hit point
- **Mouse click on p5.js HUD**: Intercepted by p5.js, not passed to Three.js
- **Scroll wheel**: Zoom in/out (Three.js camera frustum)
- **Day/night slider** (p5.js UI): Changes DirectionalLight intensity + color

### Success Criteria
1. Both canvases render simultaneously at 60fps on desktop
2. Mouse input correctly routes to Three.js (world) or p5.js (UI)
3. Building placement via raycasting works
4. Camera zoom/pan matches current game feel
5. No z-fighting or transparency artifacts between canvases
6. Works on Chrome, Firefox, Safari, Edge
7. Memory usage under 200MB

### Files Created
- `prototype/index.html` — dual canvas setup
- `prototype/renderer3d.js` — Three.js scene, camera, raycaster
- `prototype/overlay.js` — p5.js HUD overlay
- `prototype/shared.js` — shared state (player position, buildings, time)

### Time Estimate
2-3 days for a developer familiar with Three.js.

---

## 12. Open Questions

1. **Art style direction**: Should the 3D models maintain the pixel-art aesthetic (low-poly + nearest-neighbor textures) or go for a more polished look? Low-poly would be faster to create and closer to the current vibe.

2. **Model source**: Create models from scratch in Blender, use an asset store (Kenney, Quaternius — free low-poly packs), or AI-generate with tools like Meshy/Tripo?

3. **Island belly**: The current island has a visible underside (`drawIslandBelly`) — a floating island aesthetic. In 3D this means modeling the bottom too, not just the top surface.

4. **Multiple island support**: The game has 8+ distinct islands (home, wreck, vulcan, hyperborea, plenty, necropolis, conquest, arena, nation islands). Each needs a unique terrain mesh. Consider procedural generation from parameters.

5. **PWA/offline**: Three.js + GLTF models add ~50-100MB to the offline cache. Current game is ~2MB. The service worker needs updating.

6. **Electron build**: The desktop build (`electron.js`) may need WebGL flags. Test early.
