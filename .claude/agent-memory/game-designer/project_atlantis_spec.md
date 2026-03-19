---
name: Atlantis Transformation Technical Spec
description: Technical design for village→city→atlantis era system, concentric rings, ambient citizens, crystal effects, and building palette evolution across 25 island levels
type: project
---

Era system designed and documented in ATLANTIS_TECHNICAL_SPEC.md.

**Why:** Creative vision is island transformation across 25 levels as a core progression feel payoff.

**How to apply:** When implementing any of these features, the spec is the source of truth. Key decisions already made:
- `getEra()` returns 'village'/'city'/'atlantis' based on islandLevel — derived, never stored
- Era boundaries: village=1-8, city=9-17, atlantis=18-25
- Concentric rings are purely visual, inside island, don't change isOnIsland()
- Citizen pool uses Engine.getPool() (engine.js line 79), max 30, formula: floor(constrain((islandLevel-4)*2, 0, 30))
- `state.auroraBorealis` already exists in state (line 791) but was never driven — wire it up
- Building palette: getEraPalette() returns named color table, drawOneBuilding() reads it
- Save guard needed: state.atlantisRings = [] new field, re-init on load if level>=18 and array empty
- Implementation order: getEra first → palette → citizens → rings → effects
