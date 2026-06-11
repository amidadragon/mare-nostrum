// Assets — reused art/sound live in ../sprites and ../sounds (shared with legacy).
// Phase 0 loads nothing yet; this is the seam where sprite/sound loading goes
// when we add them (Phase 1+), e.g. Assets.img.player = loadImage('../sprites/...').

const Assets = {
  img: {},
  snd: {},
  preload() {
    // Phase 1+: load only what the clean core actually uses.
  },
};
