---
name: Skill Tree Implementation
description: Skill tree UI added to combat.js, wired into sketch.js via K key, mousePressed, and draw loop
type: project
---

Skill tree system was implemented with no prior UI (player could earn but not spend skillPoints).

**Why:** state.player.skills had 9 skill slots defined in sketch.js initState() but no spend mechanism existed.

**How to apply:** The skill tree lives entirely in combat.js (appended after drawCombatOverlay). Sketch.js hooks:
- Draw call: `if (typeof drawSkillTree === 'function') drawSkillTree();` after drawInventoryScreen (~line 3607)
- K key toggle: keyPressed(), after inventory toggle
- ESC close: added to the existing ESC overlay block
- mousePressed: `if (typeof handleSkillTreeClick === 'function' && handleSkillTreeClick(mouseX, mouseY)) return;`
- Skill point alert in left HUD: shows "[K] N skill pts ready" in yellow when skillPoints > 0

**Skill branches:**
- Gladiator: whirlwind, shieldBash, battleCry (combat actives)
- Praetor: charge, heal, fortify (utility actives)
- Mystic: harvestBonus, fishingLuck, companionRegen (life-sim passives)

**Passive integrations:**
- getHarvestSkillBonus() — wired into crop harvest calculation (~line 19012)
- getFishingLuckBonus() — multiplies rareMult in rollFishType() (~line 5332)
- getCompanionRegenBonus() — added to companion energy regen in day/night cycle (~line 3735)
