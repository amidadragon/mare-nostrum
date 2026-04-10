// graph.js — World Relationship Graph (MiroShark-inspired)
// In-memory graph database for tracking all entities, relationships,
// and emergent faction behavior. This replaces flat arrays with a
// queryable knowledge graph.

class WorldGraph {
  constructor() {
    // Nodes: { id → { id, type, data } }
    this.nodes = new Map();
    // Edges: { id → { id, from, to, type, weight, data, created, updated } }
    this.edges = new Map();
    // Indexes for fast lookup
    this._edgesByFrom = new Map(); // nodeId → Set<edgeId>
    this._edgesByTo = new Map();   // nodeId → Set<edgeId>
    this._edgesByType = new Map(); // edgeType → Set<edgeId>
    this._nodesByType = new Map(); // nodeType → Set<nodeId>
    this._nextEdgeId = 1;
    this.turn = 0;
  }

  // ─── NODE OPERATIONS ──────────────────────────────────────────────

  addNode(id, type, data = {}) {
    if (this.nodes.has(id)) {
      // Merge data into existing node
      let existing = this.nodes.get(id);
      Object.assign(existing.data, data);
      return existing;
    }
    let node = { id, type, data };
    this.nodes.set(id, node);
    if (!this._nodesByType.has(type)) this._nodesByType.set(type, new Set());
    this._nodesByType.get(type).add(id);
    return node;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getNodesByType(type) {
    let ids = this._nodesByType.get(type);
    if (!ids) return [];
    return [...ids].map(id => this.nodes.get(id)).filter(Boolean);
  }

  removeNode(id) {
    // Remove all connected edges first
    let edges = this.getEdgesFrom(id).concat(this.getEdgesTo(id));
    for (let e of edges) this.removeEdge(e.id);
    // Remove from type index
    let node = this.nodes.get(id);
    if (node && this._nodesByType.has(node.type)) {
      this._nodesByType.get(node.type).delete(id);
    }
    this.nodes.delete(id);
  }

  // ─── EDGE OPERATIONS ──────────────────────────────────────────────

  addEdge(from, to, type, weight = 1.0, data = {}) {
    // Check if edge already exists (update it)
    let existing = this.findEdge(from, to, type);
    if (existing) {
      existing.weight = weight;
      Object.assign(existing.data, data);
      existing.updated = this.turn;
      return existing;
    }

    let id = this._nextEdgeId++;
    let edge = { id, from, to, type, weight, data, created: this.turn, updated: this.turn };
    this.edges.set(id, edge);

    // Update indexes
    if (!this._edgesByFrom.has(from)) this._edgesByFrom.set(from, new Set());
    this._edgesByFrom.get(from).add(id);
    if (!this._edgesByTo.has(to)) this._edgesByTo.set(to, new Set());
    this._edgesByTo.get(to).add(id);
    if (!this._edgesByType.has(type)) this._edgesByType.set(type, new Set());
    this._edgesByType.get(type).add(id);

    return edge;
  }

  findEdge(from, to, type) {
    let fromEdges = this._edgesByFrom.get(from);
    if (!fromEdges) return null;
    for (let eid of fromEdges) {
      let e = this.edges.get(eid);
      if (e && e.to === to && e.type === type) return e;
    }
    return null;
  }

  getEdge(id) {
    return this.edges.get(id) || null;
  }

  getEdgesFrom(nodeId) {
    let ids = this._edgesByFrom.get(nodeId);
    if (!ids) return [];
    return [...ids].map(id => this.edges.get(id)).filter(Boolean);
  }

  getEdgesTo(nodeId) {
    let ids = this._edgesByTo.get(nodeId);
    if (!ids) return [];
    return [...ids].map(id => this.edges.get(id)).filter(Boolean);
  }

  getEdgesByType(type) {
    let ids = this._edgesByType.get(type);
    if (!ids) return [];
    return [...ids].map(id => this.edges.get(id)).filter(Boolean);
  }

  removeEdge(id) {
    let edge = this.edges.get(id);
    if (!edge) return;
    // Remove from indexes
    let fromSet = this._edgesByFrom.get(edge.from);
    if (fromSet) fromSet.delete(id);
    let toSet = this._edgesByTo.get(edge.to);
    if (toSet) toSet.delete(id);
    let typeSet = this._edgesByType.get(edge.type);
    if (typeSet) typeSet.delete(id);
    this.edges.delete(id);
  }

  // ─── GRAPH QUERIES ────────────────────────────────────────────────

  // Get all neighbors of a node (following edges in either direction)
  neighbors(nodeId, edgeType = null) {
    let result = new Set();
    for (let e of this.getEdgesFrom(nodeId)) {
      if (!edgeType || e.type === edgeType) result.add(e.to);
    }
    for (let e of this.getEdgesTo(nodeId)) {
      if (!edgeType || e.type === edgeType) result.add(e.from);
    }
    return [...result].map(id => this.nodes.get(id)).filter(Boolean);
  }

  // Get relationship strength between two nodes (sum of all edge weights)
  relationshipStrength(a, b) {
    let total = 0;
    let count = 0;
    for (let e of this.getEdgesFrom(a)) {
      if (e.to === b) { total += e.weight; count++; }
    }
    for (let e of this.getEdgesTo(a)) {
      if (e.from === b) { total += e.weight; count++; }
    }
    return count > 0 ? total / count : 0;
  }

  // Get all agents in a faction
  factionAgents(factionId) {
    return this.getEdgesByType('MEMBER_OF')
      .filter(e => e.to === factionId)
      .map(e => this.nodes.get(e.from))
      .filter(Boolean);
  }

  // Get faction's cities
  factionCities(factionId) {
    return this.getEdgesByType('CONTROLS')
      .filter(e => e.from === factionId)
      .map(e => this.nodes.get(e.to))
      .filter(Boolean);
  }

  // Get faction's military strength (sum of army node strength values)
  factionMilitaryStrength(factionId) {
    let armies = this.getEdgesByType('COMMANDS')
      .filter(e => {
        let agent = this.nodes.get(e.from);
        if (!agent) return false;
        let membership = this.findEdge(e.from, factionId, 'MEMBER_OF');
        return !!membership;
      })
      .map(e => this.nodes.get(e.to))
      .filter(n => n && n.type === 'army');

    return armies.reduce((sum, a) => sum + (a.data.strength || 0), 0);
  }

  // Find all trade routes involving a faction
  factionTradeRoutes(factionId) {
    return this.getEdgesByType('TRADES_WITH')
      .filter(e => e.from === factionId || e.to === factionId);
  }

  // Calculate faction's economic power (trade volume + city income)
  factionEconomicPower(factionId) {
    let tradeIncome = this.factionTradeRoutes(factionId)
      .reduce((sum, e) => sum + (e.data.volume || 0), 0);
    let cityIncome = this.factionCities(factionId)
      .reduce((sum, c) => sum + (c.data.income || 0), 0);
    return tradeIncome + cityIncome;
  }

  // Get agents who want war/peace with a target faction
  warPeaceBalance(factionId, targetFactionId) {
    let agents = this.factionAgents(factionId);
    let proWar = 0;
    let proPeace = 0;
    for (let agent of agents) {
      let beliefKey = `war_with_${targetFactionId}`;
      let belief = agent.data.beliefs ? agent.data.beliefs[beliefKey] : null;
      if (belief) {
        if (belief.stance > 0.5) proWar += belief.confidence * (agent.data.charisma || 0.5);
        else proPeace += belief.confidence * (agent.data.charisma || 0.5);
      } else {
        // Default based on personality
        if ((agent.data.militarism || 0.5) > 0.6) proWar += 0.3;
        else proPeace += 0.3;
      }
    }
    return { proWar, proPeace, ratio: proWar / (proWar + proPeace + 0.001) };
  }

  // Find potential betrayers (low loyalty + high ambition + connections to rivals)
  findPotentialBetrayers(factionId) {
    let agents = this.factionAgents(factionId);
    let suspects = [];
    for (let agent of agents) {
      let d = agent.data;
      if ((d.loyalty || 0.5) < 0.3 && (d.ambition || 0.5) > 0.7) {
        // Check if they have positive relationships with rival factions
        let rivalConnections = this.getEdgesFrom(agent.id)
          .filter(e => e.type === 'TRUSTS' && e.weight > 0.3)
          .map(e => this.nodes.get(e.to))
          .filter(n => n && n.type === 'agent')
          .filter(n => {
            let mem = this.findEdge(n.id, factionId, 'MEMBER_OF');
            return !mem; // not in same faction
          });
        if (rivalConnections.length > 0) {
          suspects.push({
            agent,
            betrayalRisk: (1 - d.loyalty) * d.ambition * (rivalConnections.length / 3),
            rivalContacts: rivalConnections,
          });
        }
      }
    }
    return suspects.sort((a, b) => b.betrayalRisk - a.betrayalRisk);
  }

  // ─── SERIALIZATION ────────────────────────────────────────────────

  serialize() {
    return {
      nodes: [...this.nodes.entries()],
      edges: [...this.edges.entries()],
      nextEdgeId: this._nextEdgeId,
      turn: this.turn,
    };
  }

  deserialize(data) {
    this.nodes = new Map(data.nodes);
    this.edges = new Map(data.edges);
    this._nextEdgeId = data.nextEdgeId || 1;
    this.turn = data.turn || 0;

    // Rebuild indexes
    this._edgesByFrom = new Map();
    this._edgesByTo = new Map();
    this._edgesByType = new Map();
    this._nodesByType = new Map();

    for (let [id, node] of this.nodes) {
      if (!this._nodesByType.has(node.type)) this._nodesByType.set(node.type, new Set());
      this._nodesByType.get(node.type).add(id);
    }
    for (let [id, edge] of this.edges) {
      if (!this._edgesByFrom.has(edge.from)) this._edgesByFrom.set(edge.from, new Set());
      this._edgesByFrom.get(edge.from).add(id);
      if (!this._edgesByTo.has(edge.to)) this._edgesByTo.set(edge.to, new Set());
      this._edgesByTo.get(edge.to).add(id);
      if (!this._edgesByType.has(edge.type)) this._edgesByType.set(edge.type, new Set());
      this._edgesByType.get(edge.type).add(id);
    }
  }

  // ─── DEBUG / STATS ────────────────────────────────────────────────

  stats() {
    let nodeTypes = {};
    for (let [, node] of this.nodes) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }
    let edgeTypes = {};
    for (let [, edge] of this.edges) {
      edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
    }
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodeTypes,
      edgeTypes,
      turn: this.turn,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// WORLD INITIALIZATION — Populate the graph from map data
// ═══════════════════════════════════════════════════════════════════════

function initWorldGraph() {
  const G = new WorldGraph();

  // ── Add faction nodes ──
  for (let fid in SWARM_FACTIONS) {
    let f = SWARM_FACTIONS[fid];
    G.addNode(fid, 'faction', {
      name: f.name,
      fullName: f.fullName,
      color: f.color,
      gold: fid === 'carthage' ? 800 : (fid === 'egypt' ? 700 : 500),
      personality: f.personality,
    });
  }

  // ── Add city nodes ──
  for (let cid in MED_CITIES) {
    let c = MED_CITIES[cid];
    G.addNode(cid, 'city', {
      name: c.name,
      lat: c.lat, lon: c.lon,
      type: c.type,
      population: c.pop,
      port: c.port,
      income: c.type === 'capital' ? 50 : (c.type === 'major' ? 30 : 15),
      defenseLevel: c.type === 'capital' ? 3 : (c.type === 'major' ? 2 : 1),
      buildings: [],
      morale: 0.7,
    });
    // Faction controls city
    if (c.faction) {
      G.addEdge(c.faction, cid, 'CONTROLS', 1.0, { since: 0 });
    }
  }

  // ── Add island nodes ──
  for (let iid in MED_ISLANDS) {
    let isl = MED_ISLANDS[iid];
    G.addNode(iid, 'island', {
      name: isl.name,
      lat: isl.lat, lon: isl.lon,
      controlledBy: isl.faction || null,
    });
    if (isl.faction) {
      G.addEdge(isl.faction, iid, 'CONTROLS', 1.0, { since: 0 });
    }
  }

  // ── Add initial trade routes ──
  for (let route of MED_SEA_ROUTES) {
    let fromCity = MED_CITIES[route.from];
    let toCity = MED_CITIES[route.to];
    if (!fromCity || !toCity) continue;
    if (fromCity.faction && toCity.faction && fromCity.faction !== toCity.faction) {
      // Inter-faction trade
      let existing = G.findEdge(fromCity.faction, toCity.faction, 'TRADES_WITH');
      if (!existing) {
        G.addEdge(fromCity.faction, toCity.faction, 'TRADES_WITH', 0.5, {
          volume: 20,
          routes: [{ from: route.from, to: route.to }],
          satisfaction: 0.6,
          since: 0,
        });
      } else {
        existing.data.routes.push({ from: route.from, to: route.to });
        existing.data.volume += 15;
      }
    }
  }

  // ── Set initial diplomatic relations ──
  // Historical starting tensions
  G.addEdge('rome', 'carthage', 'RIVALRY', 0.7, { reason: 'Sicilian disputes', since: 0 });
  G.addEdge('rome', 'greece', 'NEUTRAL', 0.5, { reason: 'Cultural respect', since: 0 });
  G.addEdge('carthage', 'numidia', 'TENSION', 0.4, { reason: 'Border disputes', since: 0 });
  G.addEdge('egypt', 'seleucid', 'RIVALRY', 0.6, { reason: 'Levantine claims', since: 0 });
  G.addEdge('greece', 'seleucid', 'NEUTRAL', 0.3, { reason: 'Hellenistic kinship', since: 0 });
  G.addEdge('rome', 'gaul', 'TENSION', 0.5, { reason: 'Northern frontier', since: 0 });
  G.addEdge('iberia', 'carthage', 'ALLIED', 0.6, { reason: 'Barcid connections', since: 0 });

  return G;
}

// Global graph instance
let worldGraph = null;
