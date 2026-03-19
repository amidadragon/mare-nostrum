# Mare Nostrum Playtest Report

**Date:** 2026-03-19
**Build:** v0.9 (Mare Nostrum Engine v0.9)
**URL:** http://localhost:8080
**Tester:** Automated (Claude Code + Playwright)

---

## Test Results

### Test 1: Main Menu -- PASS
- **Screenshot:** test1_menu.png
- Title "MARE NOSTRUM" and subtitle "Shipwrecked. Sunlit. Reborn." visible
- All 4 menu buttons present: Continue Voyage, New Voyage, Settings, Credits
- Background art loaded: beautiful pixel-art Roman coastal sunset scene with woman, boats, hillside town
- Version "v0.9" shown at bottom
- **Note:** Clicking "New Voyage" at estimated canvas coordinates hit "Continue Voyage" instead on first attempt. Button hit targets may be tighter than expected, or button positions differ from estimated percentages. Succeeded on second click attempt.

### Test 2: Intro Cinematic -- SKIPPED
- Game loaded a saved game (Continue Voyage was triggered), bypassing the intro cinematic
- Could not test New Voyage intro flow in this session

### Test 3: Home Island (Insula Domus) -- PASS
- **Screenshot:** test1_after_click2.png
- Landed on Home Island with full HUD visible
- Resource panel (top-left): Seeds, Harvest, Wood, Stone, Crystals, Gold, Fish, Critter/Cutter bars, Citizen LV1, Season (Spring), Ship status, Crop info
- Quest tracker (top-right): "I -- Awakening" with objectives (Scavenge supplies, Repair trireme, Reach home island)
- Toolbar (bottom): 10 item slots with labels, "[D] Dive" prompt
- Controls legend (bottom-right): WASD, SPACE, B, K, ESC, P
- Island renders correctly with buildings, docks, ship, temple, fountain, NPCs

### Test 4: Movement -- PASS
- **Screenshots:** test4_move_up.png, test4_move_right.png
- W key: player/camera moved up correctly, picked up "+1 Crystal" during movement
- D key: player/camera moved right correctly
- Day/night cycle triggered during movement: "DIES 1 Daily Summary" popup appeared
- Daily summary tracks: Crops Harvested, Fish Caught, Buildings Placed, Hearts Given, Meals Cooked, Cats Petted, Best Combo
- Auto-trade system active: "+8G FROM AUTO-TRADE" messages appearing
- **Minor issue:** "DRIFT STORM ACTIVE" weather event triggered, causing dark clouds. Not a bug, but notable.

### Test 5: Build Mode -- PASS
- **Screenshot:** test5_build_mode.png
- B key opens build bar at bottom
- "AEDIFICIUM [B TO CLOSE]" label displayed
- Build items visible: Tile, Wall, Arch, Arca, Bridge, Balluster, Brazier, Roses, Lucerna, Mosaic, Aqueduct, Balneum
- Current selection shown: "WALL -- 2S" (costs 2 Stone)
- Controls update to: "WASD MOVE | CLICK PLACE | Q ROTATE"
- B key closes build mode correctly

### Test 6: Skill Tree -- PASS
- **Screenshot:** test6_skill_tree.png
- K key opens skill tree overlay
- All 3 branches visible:
  - **Gladiator** (Combat actives): Whirlwind, Shield Bash, Battle Cry
  - **Praetor** (Utility & healing): War Charge, Field Heal, Fortify
  - **Mystic** (Life-sim passives): Fertile Hands, Sea Favor, Loyal Bond
- Shows "Skill Points Available: 0 (Level 1)" and "Next point at level 2 -- 0/100 XP"
- Each skill shows cost and description
- "[K] OR CLICK X TO CLOSE" instruction visible
- K key closes skill tree correctly

### Test 7: ESC Menu Toggle -- PASS
- **Screenshots:** test7_esc_menu.png, test7_esc_return.png
- ESC opens main menu (same as title screen with all 4 buttons)
- ESC again returns to game with full HUD restored
- Toggle works cleanly with no visual glitches

### Test 8: Debug Console -- PASS
- **Screenshot:** test8_debug_console.png
- Backtick (`) opens debug console at bottom of screen
- Shows "MARE NOSTRUM DEBUG CONSOLE" header
- Shows "> " input prompt
- Instructions: "` to close | /help for commands"
- Backtick closes console correctly

### Test 9: Visual Check -- PASS (minor notes)
- **Screenshot:** test9_final.png
- Night sky renders with stars -- looks good
- Ocean water renders correctly with wave texture
- Island shape and shoreline render cleanly (elliptical with beach/sand edge)
- Buildings, temple, docks, ship all rendering properly
- NPCs visible on island
- "Arena Isle" label visible for nearby island
- No obvious rendering artifacts, z-fighting, or sprite misalignment

**Visual observations:**
- Dark elliptical cloud shapes in sky look slightly flat/uniform -- could benefit from more variation
- "ARENA ISLE" label appears twice on screen (at different zoom distances) -- possible duplicate label rendering
- Quest tracker text is slightly clipped on the right edge of the screen ("...TO SAIL" cut off)
- HUD resource panel text "CROP: GRAIN (1/2/3/4)" overlaps slightly at small sizes

---

## Console Errors
- **Errors: 0**
- **Warnings: 0**
- Clean console. Engine, Diving system, Debug console, and Sound manager all initialized without issues.

---

## Bugs Found

| # | Severity | Description |
|---|----------|-------------|
| 1 | Low | "ARENA ISLE" label renders twice on screen at certain camera positions (duplicate label) |
| 2 | Low | Quest tracker text clips on right screen edge -- objectives like "REPAIR THE TRIREME ENOUGH TO SAIL" get cut off |
| 3 | Low | Cloud shapes (dark ellipses) are uniform/repetitive -- visual polish issue |
| 4 | Minor | Menu button click targets may be imprecise -- clicking estimated center of "NEW VOYAGE" hit "CONTINUE VOYAGE" instead |

---

## Overall Assessment

**Verdict: PLAYABLE -- solid alpha state.**

The game runs smoothly with zero console errors. All core systems work:
- Menu navigation, save/load (Continue Voyage)
- WASD movement with camera follow
- Build mode with 12+ building types
- Skill tree with 3 branches and 9 skills
- Day/night cycle with daily summary
- Weather events (Drift Storm)
- Auto-trade economy
- Debug console for development
- ESC menu toggle

The pixel art is charming and cohesive. The island, ocean, and sky all render well. HUD is informative without being cluttered. The Roman/Mediterranean theme comes through strongly in naming (Aedificium, Dies, Insula Domus) and visuals.

Main areas for polish: quest text clipping, duplicate island labels, cloud variety, and menu button hit detection precision.
