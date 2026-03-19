---
name: File Conflict Risk Map
description: Which files are frequently co-modified and prone to agent conflicts in Mare Nostrum
type: project
---

High-conflict files (never assign two agents to these simultaneously):

**Why:** sketch.js is 762K/21k+ lines and nearly every sprint item touches it. Multiple agents editing it causes merge hell.

**How to apply:** When deploying agents, only ONE agent should touch sketch.js at a time. Use line-range scoping when possible.

- sketch.js — touched by almost every sprint item. Key regions:
  - Lines 1-2000: draw loop, setup, camera, sky/weather
  - Lines 7400-7600: build mode / ghost
  - Lines 8300-8600: fishing
  - Lines 9700-9900: centurion
  - Lines 11700-11900: trees, port positions
  - Lines 17900-18600: keyPressed handler
  - Lines 19100-19500: save/load
  - Lines 19500-21200: NPC drawing, farm helpers

- combat.js — skill tree lives here (lines 360-614), safe to assign independently
- narrative.js — dialogue pools, safe to assign independently
- islands.js — island update functions, safe for respawn timer work
- economy.js — colony specs, safe independently
