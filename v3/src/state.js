// GameState — the single, owned source of truth for the v3 core.
//
// INVARIANT: each domain reads/writes its OWN slice. No system reaches across to
// mutate another domain's data. The player is moved ONLY by the input layer.
// (This is the rule the legacy code broke — the bot AI drove state.player.)

const SAVE_VERSION = 1;

const GameState = {
  version: SAVE_VERSION,
  cameraTarget: { x: 600, y: 400 }, // world point the camera follows
  time: { t: 0 },                    // frame accumulator (day/night arrives Phase 1)

  init() {
    this.version = SAVE_VERSION;
    this.cameraTarget = { x: Island.CX, y: Island.CY };
    this.time = { t: 0 };
  },

  // Versioned persistence lands in Phase 3.
  save() { /* Phase 3 */ },
  load() { /* Phase 3 */ },
};
