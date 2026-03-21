import sys

# Read app.py
with open('/Users/ioio/octobot/app.py', 'r') as f:
    content = f.read()

NEW_CODE = r'''
# ======================================================================
# DASHBOARD API -- unified endpoints for new dashboard UI
# ======================================================================

def _compute_pnl_periods():
    """Compute daily/weekly/monthly P&L from snapshots table."""
    db = pf.get_db()
    now = datetime.datetime.utcnow()
    day_ago = (now - datetime.timedelta(days=1)).isoformat()
    week_ago = (now - datetime.timedelta(days=7)).isoformat()
    month_ago = (now - datetime.timedelta(days=30)).isoformat()

    snap_day = db.execute(
        "SELECT total_value FROM snapshots WHERE timestamp <= ? ORDER BY timestamp DESC LIMIT 1",
        (day_ago,)
    ).fetchone()
    snap_week = db.execute(
        "SELECT total_value FROM snapshots WHERE timestamp <= ? ORDER BY timestamp DESC LIMIT 1",
        (week_ago,)
    ).fetchone()
    snap_month = db.execute(
        "SELECT total_value FROM snapshots WHERE timestamp <= ? ORDER BY timestamp DESC LIMIT 1",
        (month_ago,)
    ).fetchone()
    latest = db.execute(
        "SELECT total_value FROM snapshots ORDER BY timestamp DESC LIMIT 1"
    ).fetchone()
    db.close()

    current_val = latest["total_value"] if latest else 0
    result = {}
    for label, snap in [("daily", snap_day), ("weekly", snap_week), ("monthly", snap_month)]:
        if snap and snap["total_value"] > 0:
            prev = snap["total_value"]
            change = current_val - prev
            pct = (change / prev) * 100
            result[label] = {"amount": round(change, 2), "pct": round(pct, 2)}
        else:
            result[label] = {"amount": 0, "pct": 0}
    return result, current_val


def _compute_win_rate(n=30):
    """Win rate from last n closed trades (SELL with pnl info in reasoning)."""
    db = pf.get_db()
    rows = db.execute(
        "SELECT reasoning, price, value FROM trades WHERE action='SELL' ORDER BY timestamp DESC LIMIT ?",
        (n,)
    ).fetchall()
    db.close()
    if not rows:
        return 0, 0
    wins = sum(1 for r in rows if "pnl:+" in (r.get("reasoning") or ""))
    return round(wins / len(rows) * 100, 1) if rows else 0, len(rows)


def _build_open_positions_with_prices():
    """Build position list with current prices and unrealized P&L."""
    positions = []
    # Scalper positions
    for sp in _scalper_positions:
        sym = sp["symbol"]
        bsym = sym.replace("/USD", "USDT").replace("/", "")
        try:
            cur_price = binance_broker.get_best_price(bsym) or sp["entry"]
        except Exception:
            cur_price = sp["entry"]
        entry = sp["entry"]
        qty = sp.get("filled_qty") or (sp["value"] / entry if entry else 0)
        mv = qty * cur_price if qty else sp["value"]
        pl = mv - sp["value"]
        pl_pct = ((cur_price / entry) - 1) * 100 if entry else 0
        positions.append({
            "symbol": sym.replace("/", "-"),
            "qty": round(qty, 8) if qty else 0,
            "avg_entry": round(entry, 2),
            "current_price": round(cur_price, 2),
            "market_value": round(mv, 2),
            "unrealized_pl": round(pl, 2),
            "unrealized_plpc": round(pl_pct, 2),
            "side": sp.get("side", "LONG"),
            "source": "scalper",
            "strategy": sp.get("strategy", ""),
        })
    # Broker positions
    if binance_broker.binance_enabled():
        balances = binance_broker.get_balances()
        db_positions = {p["symbol"].upper().replace("-USD","").replace("/USD",""): p for p in pf.get_positions()}
        for b in balances:
            asset = b["asset"]
            if asset in ("USDT", "USD"):
                continue
            qty = b["free"] + b["locked"]
            if qty <= 0:
                continue
            db_p = db_positions.get(asset)
            bsym = f"{asset}USDT"
            price = binance_broker.get_best_price(bsym) or 0
            mv = qty * price
            if mv < 1.0 and not db_p:
                continue
            entry = db_p["avg_entry_price"] if db_p else price
            pl = mv - (qty * entry)
            pl_pct = ((price / entry) - 1) * 100 if entry else 0
            positions.append({
                "symbol": f"{asset}-USD",
                "qty": round(qty, 8),
                "avg_entry": round(entry, 2),
                "current_price": round(price, 2),
                "market_value": round(mv, 2),
                "unrealized_pl": round(pl, 2),
                "unrealized_plpc": round(pl_pct, 2),
                "side": "LONG",
                "source": "broker",
            })
    elif coinbase_broker.coinbase_enabled():
        accounts = coinbase_broker.get_accounts()
        db_positions = {p["symbol"].upper().replace("-USD","").replace("/USD",""): p for p in pf.get_positions()}
        for acct_item in accounts:
            cur = acct_item["currency"]
            if cur == "USD" or acct_item["balance"] < 0.0001:
                continue
            product_id = f"{cur}-USD"
            price = coinbase_broker.get_best_price(product_id) or 0
            qty = acct_item["balance"]
            mv = qty * price
            db_p = db_positions.get(cur)
            entry = db_p["avg_entry_price"] if db_p else price
            pl = mv - (qty * entry)
            pl_pct = ((price / entry) - 1) * 100 if entry else 0
            positions.append({
                "symbol": product_id,
                "qty": round(qty, 8),
                "avg_entry": round(entry, 2),
                "current_price": round(price, 2),
                "market_value": round(mv, 2),
                "unrealized_pl": round(pl, 2),
                "unrealized_plpc": round(pl_pct, 2),
                "side": "LONG",
                "source": "broker",
            })
    return positions


def _strategy_performance():
    """Per-strategy breakdown from _asset_stats and trades table."""
    import re as _re
    db = pf.get_db()
    rows = db.execute(
        "SELECT reasoning, price, value FROM trades WHERE market='scalper' AND action='SELL' ORDER BY timestamp DESC LIMIT 200"
    ).fetchall()
    db.close()
    strats = {}
    for r in rows:
        reason = r.get("reasoning") or ""
        parts = reason.split("|")
        strat_name = parts[0].strip() if parts else "unknown"
        for prefix in ["trend_rsi_bb", "grid_range", "trend_pullback"]:
            if prefix in strat_name:
                strat_name = prefix
                break
        if strat_name not in strats:
            strats[strat_name] = {"trades": 0, "wins": 0, "total_pnl": 0}
        strats[strat_name]["trades"] += 1
        if "pnl:+" in reason:
            strats[strat_name]["wins"] += 1
        pnl_match = _re.search(r"pnl_usd:([+-]?[\d.]+)", reason)
        if pnl_match:
            strats[strat_name]["total_pnl"] += float(pnl_match.group(1))
    result = {}
    for name, data in strats.items():
        data["win_rate"] = round(data["wins"] / data["trades"] * 100, 1) if data["trades"] else 0
        data["total_pnl"] = round(data["total_pnl"], 2)
        result[name] = data
    for sym, stats in _asset_stats.items():
        key = f"asset:{sym}"
        result[key] = {
            "trades": stats["trades"],
            "wins": stats["wins"],
            "win_rate": round(stats["wins"] / stats["trades"] * 100, 1) if stats["trades"] else 0,
            "total_pnl": round(stats["total_pnl"], 2),
            "best_pnl": round(stats["best_pnl"] * 100, 2),
            "worst_pnl": round(stats["worst_pnl"] * 100, 2),
        }
    return result


@app.route("/api/dashboard")
def api_dashboard():
    pnl_periods, current_val = _compute_pnl_periods()
    win_rate, trade_count = _compute_win_rate(30)
    positions = _build_open_positions_with_prices()
    invested = sum(p["market_value"] for p in positions)
    cash = round(_scalper_balance, 2) if _scalper_enabled else 0
    total_value = round(cash + invested, 2)
    if current_val > 0:
        total_value = round(current_val, 2)

    return jsonify({
        "total_value": total_value,
        "cash": cash,
        "invested": round(invested, 2),
        "daily_pnl": pnl_periods["daily"],
        "weekly_pnl": pnl_periods["weekly"],
        "monthly_pnl": pnl_periods["monthly"],
        "win_rate": win_rate,
        "win_rate_trades": trade_count,
        "open_positions": positions,
        "strategy_performance": _strategy_performance(),
        "scalper": {
            "enabled": _scalper_enabled,
            "trades": _scalper_trades,
            "wins": _scalper_wins,
            "win_rate": round(_scalper_wins / _scalper_trades * 100, 1) if _scalper_trades else 0,
            "balance": round(_scalper_balance, 2),
            "daily_pnl": round(_scalper_daily_pnl, 2),
        },
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    })


@app.route("/api/chart/pnl")
def api_chart_pnl():
    """Hourly P&L data points for Chart.js. ?period=24h|7d|30d"""
    period = request.args.get("period", "24h")
    now = datetime.datetime.utcnow()
    if period == "7d":
        since = (now - datetime.timedelta(days=7)).isoformat()
    elif period == "30d":
        since = (now - datetime.timedelta(days=30)).isoformat()
    else:
        since = (now - datetime.timedelta(hours=24)).isoformat()

    db = pf.get_db()
    rows = db.execute(
        "SELECT timestamp, total_value, cash FROM snapshots WHERE timestamp >= ? ORDER BY timestamp ASC",
        (since,)
    ).fetchall()
    db.close()

    if not rows:
        return jsonify({"labels": [], "values": [], "period": period})

    base_value = rows[0]["total_value"] if rows else 0
    labels = []
    values = []
    for r in rows:
        labels.append(r["timestamp"])
        values.append(round(r["total_value"] - base_value, 2))

    return jsonify({
        "labels": labels,
        "values": values,
        "base_value": round(base_value, 2),
        "period": period,
    })


@app.route("/api/chart/allocation")
def api_chart_allocation():
    """Position allocation for donut chart."""
    positions = _build_open_positions_with_prices()
    cash = round(_scalper_balance, 2) if _scalper_enabled else 0
    items = []
    for p in positions:
        items.append({
            "label": p["symbol"],
            "value": round(abs(p["market_value"]), 2),
        })
    if cash > 0:
        items.append({"label": "Cash", "value": cash})
    total = sum(i["value"] for i in items) or 1
    for i in items:
        i["pct"] = round(i["value"] / total * 100, 1)
    return jsonify({"items": items, "total": round(total, 2)})


@app.route("/api/strategies")
def api_strategies():
    """Per-strategy stats."""
    return jsonify({"strategies": _strategy_performance()})


# -- Dashboard WebSocket: emit every 30s --
_last_dashboard_emit = 0

def _emit_dashboard_update():
    """Called from background loop to push dashboard data over WebSocket."""
    global _last_dashboard_emit
    now = _time.time()
    if now - _last_dashboard_emit < 30:
        return
    _last_dashboard_emit = now
    try:
        pnl_periods, current_val = _compute_pnl_periods()
        positions = _build_open_positions_with_prices()
        invested = sum(p["market_value"] for p in positions)
        cash = round(_scalper_balance, 2) if _scalper_enabled else 0
        total_value = round(cash + invested, 2)
        if current_val > 0:
            total_value = round(current_val, 2)
        win_rate, trade_count = _compute_win_rate(30)
        socketio.emit("dashboard_update", {
            "total_value": total_value,
            "cash": cash,
            "invested": round(invested, 2),
            "daily_pnl": pnl_periods["daily"],
            "weekly_pnl": pnl_periods["weekly"],
            "monthly_pnl": pnl_periods["monthly"],
            "win_rate": win_rate,
            "open_positions": positions,
            "scalper": {
                "enabled": _scalper_enabled,
                "trades": _scalper_trades,
                "wins": _scalper_wins,
                "balance": round(_scalper_balance, 2),
                "daily_pnl": round(_scalper_daily_pnl, 2),
            },
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        })
    except Exception as e:
        print(f"[DASHBOARD] Emit error: {e}", flush=True)

'''

# Insert before the `if __name__ == "__main__":` line
marker = 'if __name__ == "__main__":'
if marker not in content:
    print("ERROR: Could not find main marker", file=sys.stderr)
    sys.exit(1)

content = content.replace(marker, NEW_CODE + "\n" + marker)

# Patch _bg_loop to call _emit_dashboard_update
old_bg = '        except Exception as e:\n            print(f"[BG] Loop error: {e}", flush=True)\n        socketio.sleep(30)'
new_bg = '        except Exception as e:\n            print(f"[BG] Loop error: {e}", flush=True)\n        try:\n            _emit_dashboard_update()\n        except Exception:\n            pass\n        socketio.sleep(30)'
if old_bg in content:
    content = content.replace(old_bg, new_bg)
else:
    print("WARNING: Could not patch _bg_loop for dashboard emit", file=sys.stderr)

# Add dashboard endpoints to _PUBLIC_PATHS
old_paths = '_PUBLIC_PATHS = {"/", "/health", "/api/status", "/api/register", "/api/login", "/api/logout", "/api/tick", "/api/scalper_debug", "/api/scalper_run", "/api/vm_push", "/api/vm_state", "/vm"}'
new_paths = '_PUBLIC_PATHS = {"/", "/health", "/api/status", "/api/register", "/api/login", "/api/logout", "/api/tick", "/api/scalper_debug", "/api/scalper_run", "/api/vm_push", "/api/vm_state", "/vm", "/api/dashboard", "/api/chart/pnl", "/api/chart/allocation", "/api/strategies"}'
if old_paths in content:
    content = content.replace(old_paths, new_paths)

with open('/Users/ioio/octobot/app.py', 'w') as f:
    f.write(content)

print("OK: Patched app.py successfully")
