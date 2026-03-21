# Mare Nostrum — Multiplayer Technical Specification

## 1. Architecture Options

### Option A: Peer-to-Peer via WebRTC (No Server)
- Uses browser-native `RTCPeerConnection` + `RTCDataChannel`
- Signaling via manual copy-paste of offer/answer strings (zero infrastructure)
- Or: use a free STUN/TURN server (Google provides public STUN)
- Pros: No hosting cost, low latency for 2 players, works offline after connect
- Cons: NAT traversal can fail (~15% of networks), no persistent state, max 4-6 peers before mesh collapses
- Best for: 2-player sessions, LAN play, quick demos

### Option B: WebSocket Relay Server (Node.js)
- Minimal Node.js server (50-100 lines): accepts connections, broadcasts messages
- Can run on any $5/mo VPS, or free tier (Render, Railway, Fly.io)
- Server is dumb relay — no game logic, just forwards packets
- Pros: Reliable connectivity, easy to add rooms/lobbies, scales to 8+ players
- Cons: Requires hosting, adds ~20-50ms latency per hop
- Best for: Public multiplayer, matchmaking, persistent sessions

### Option C: Turn-Based Async (Easiest)
- Export save file as JSON blob, share via link/file
- Other player imports it, plays their turn, exports back
- No networking code at all — just save/load with a "whose turn" flag
- Pros: Zero infrastructure, works today, no sync issues
- Cons: Not real-time, limited interaction, feels bolted-on
- Best for: MVP proof of concept, testing trade mechanics

### Recommendation
Start with **Option A (WebRTC)** for the 2-player MVP. Zero cost, p5.js already runs in browser, and the `Engine.netSend/netReceive` stubs we're adding make it trivial to swap transports later. If we need lobbies or 4+ players, upgrade to Option B.

---

## 2. What to Sync

### Player Position + Animation
- `{ x, y, facing, anim.walkFrame, anim.emotion, weapon, armor }` at 10Hz
- Interpolate between updates on receiver side (lerp over 100ms)
- Dead reckoning: continue last velocity if packet is late

### Building Placements
- On place: `{ type, x, y, w, h, rot }` — one-shot event
- On demolish: `{ buildingIndex }` — one-shot event
- Buildings are authoritative to island owner

### Trade Between Islands
- Trade offer: `{ offering: { wood: 10 }, requesting: { gold: 5 } }`
- Trade accept/reject: `{ tradeId, accepted: bool }`
- Resources transfer atomically on both sides when accepted

### Combat (Co-op Arena)
- Enemy spawns controlled by host (arena owner)
- Sync: enemy positions + HP at 10Hz from host
- Damage events from guest sent to host for validation
- Loot split: host distributes

### Chat Messages
- Simple `{ from, text, timestamp }` broadcast
- Rate-limited to 2 messages/sec per player
- Max 200 chars per message

---

## 3. State Separation

### Local Only (never synced)
- Camera position (`cam`, `camSmooth`)
- Screen shake (`shakeX`, `shakeY`)
- Particles array
- Sound state (`snd`, lyre mode)
- UI state (menus, hotbar selection, codex, journal)
- `floatOffset`, `horizonOffset`
- Tutorial hints, notifications
- Dialog state
- Photo mode, screenshot mode
- FPS counters, analytics

### Shared State (synced over network)
- Player position + facing + animation frame
- Building list (per-island, owned by island owner)
- Resource counts (only exposed during trade)
- Arena enemy state (host-authoritative)
- Trade offers/responses
- Chat messages
- Day/time (host is time authority)
- Weather (host decides, broadcasts)

### Conflict Resolution
- **Island ownership**: Each player owns their island. Only the owner can build/demolish.
- **Trade atomicity**: Two-phase commit — offer, then accept. If either disconnects, trade cancelled.
- **Combat authority**: Arena host owns enemy state. Guest sends damage intents, host validates and applies.
- **Time authority**: Host's day/time is canonical. Guest syncs on join.
- **Last-write-wins**: For simple state (chat, emotes). No conflict possible.
- **Disconnect**: Other player's avatar freezes for 5s, then fades out. Reconnect restores.

---

## 4. Minimum Viable Multiplayer

### Core Features (MVP)
1. **2 players**, each on their own island
2. **Visit each other's islands** via ship (sailing cutscene, arrive at port)
3. **Trade resources** — offer/accept UI overlay
4. **Co-op arena combat** — both players in same arena, shared enemies
5. **Simple chat** — text input at bottom of screen, messages float above player

### What MVP Does NOT Include
- More than 2 players
- Shared building (guest can't build on host's island)
- PvP combat
- Persistent server / accounts
- Matchmaking (players connect via room code)

### Connection Flow
1. Player A clicks "Host Game" — generates a room code (6-char alphanumeric)
2. Player B clicks "Join Game" — enters room code
3. WebRTC signaling via the room code (encoded SDP offer/answer)
4. Connected — both see each other's player sprite on their own island
5. Ship travel to visit other player's island

---

## 5. Implementation Plan (Phased)

### Phase 1: Networking Layer
- Wire `Engine.netSend` / `Engine.netReceive` to WebRTC DataChannel
- Room code generation + signaling (offer/answer exchange)
- Connection state machine: disconnected → connecting → connected → error
- Heartbeat every 2s, timeout after 10s
- **Effort**: 2-3 days

### Phase 2: Player Sync
- Send local player position at 10Hz via `Engine.netBroadcastPosition`
- Receive remote player position, interpolate with lerp
- Draw remote player sprite (reuse `drawPlayer` with remote state)
- Remote player name tag floating above head
- **Effort**: 2-3 days

### Phase 3: Island Visiting
- "Sail to [Player]'s Island" option at port
- Sailing cutscene (reuse existing `startSailingCutscene`)
- Load remote island's buildings/terrain from sync packet
- Guest is read-only on remote island (can walk, can't build)
- **Effort**: 3-4 days

### Phase 4: Trade System
- Trade UI: select resources to offer/request
- Network messages: `trade_offer`, `trade_accept`, `trade_reject`, `trade_cancel`
- Both players must be on same island or at port
- **Effort**: 2-3 days

### Phase 5: Co-op Combat
- Arena entry synced — both players teleport to arena
- Host spawns enemies, broadcasts positions at 10Hz
- Guest sends `damage_intent { enemyId, damage }`, host validates
- Shared loot distribution at wave end
- **Effort**: 4-5 days

### Phase 6: Shared World Events
- Host broadcasts weather changes
- Synchronized day/night cycle
- Shared festivals (both players see festival decorations)
- Merchant Hanno visits both islands
- **Effort**: 2-3 days

### Total Estimate: ~15-20 days for full multiplayer

---

## 6. Code Hooks Needed

### sketch.js — Functions Needing Multiplayer Awareness

| Function | Line | Change Needed |
|----------|------|---------------|
| `initState()` | 443 | Add `state.multiplayer = { connected, peerId, remotePlayers: {} }` |
| `draw()` | 1685 | Call `Engine.netTick()` each frame for send queue |
| `drawInner()` | 1761 | Draw remote players after local player |
| `saveGame()` | 17516 | Exclude multiplayer transient state from save |
| `loadGame()` | 17820 | Re-initialize multiplayer state on load |
| `placeBuilding()` | 7855 | Broadcast `building_placed` event |

### player.js — Functions Needing Hooks

| Function | Line | Change Needed |
|----------|------|---------------|
| `updatePlayer()` | 23 | After position update, call `Engine.netBroadcastPosition()` |
| `drawPlayer()` | ~462 | Accept optional remote player state parameter |

### combat.js — Functions Needing Hooks

| Function | Change Needed |
|----------|---------------|
| `spawnArenaWave()` | Host broadcasts enemy spawn list |
| `updateArenaEnemies()` | Host broadcasts enemy positions; guest reads them |
| `damageEnemy()` | Guest sends damage intent instead of applying directly |

### economy.js — Functions Needing Hooks

| Function | Change Needed |
|----------|---------------|
| `createTradeRoute()` | Multiplayer trade uses direct player-to-player, not NPC routes |

### engine.js — Network Injection Points

| Function | Purpose |
|----------|---------|
| `Engine.netSend(type, data)` | Send message to peer (stub added) |
| `Engine.netReceive(type, callback)` | Register handler for incoming message type |
| `Engine.netBroadcastPosition(x, y, anim)` | Throttled position broadcast at 10Hz |
| `Engine.netTick()` | Called each frame, flushes send queue |

### Where to Inject Network Send/Receive

```
sketch.js draw() → Engine.netTick()
                  ↓
         flush queued messages via WebRTC/WebSocket
                  ↓
         incoming messages → Engine._netHandlers[type](data)
                  ↓
         update state.multiplayer.remotePlayers
                  ↓
sketch.js drawInner() → drawRemotePlayers()
```

### State Serialization Format (Network Packets)

All packets are JSON over DataChannel:

```json
{
  "t": "pos",
  "d": { "x": 612.5, "y": 398.2, "f": "right", "w": 2, "e": "happy" },
  "seq": 14523
}
```

Message types:
- `pos` — player position (10Hz, ~80 bytes)
- `bld` — building placed/removed (~120 bytes, event-driven)
- `trd` — trade offer/accept/reject (~100 bytes, event-driven)
- `dmg` — damage intent in co-op combat (~40 bytes, event-driven)
- `cht` — chat message (~250 bytes max, event-driven)
- `syn` — full state sync on join (~2-5KB, once)
- `hbt` — heartbeat (~10 bytes, every 2s)
- `day` — day/time sync from host (~20 bytes, every 30s)
- `wthr` — weather change (~30 bytes, event-driven)

Short keys to minimize bandwidth. Sequence numbers for ordering. No compression needed at this scale.

---

## 7. Effort Summary

| Phase | Scope | Days | Complexity |
|-------|-------|------|------------|
| 1. Networking Layer | WebRTC + signaling | 2-3 | Medium |
| 2. Player Sync | Position broadcast + remote render | 2-3 | Low |
| 3. Island Visiting | Sailing + remote island load | 3-4 | Medium |
| 4. Trade System | Offer/accept UI + sync | 2-3 | Low |
| 5. Co-op Combat | Host-authoritative arena | 4-5 | High |
| 6. Shared Events | Weather, time, festivals | 2-3 | Low |
| **Total** | | **15-21** | |

Prerequisites: Ship single-player v1.0 first. Multiplayer is a post-launch feature.

---

## Appendix: Why Not a Game Server?

Mare Nostrum is a p5.js browser game with no backend. Adding an authoritative game server would:
- Require rewriting game logic to run on Node.js
- Add hosting costs ($10-50/mo)
- Introduce server-side state management complexity
- Be overkill for 2-4 player co-op

The relay approach (dumb WebSocket or peer-to-peer WebRTC) keeps all game logic in the browser where it already works. The host player's browser is the authority for shared state. This is fine for cooperative play between trusted friends, which is the target use case.
