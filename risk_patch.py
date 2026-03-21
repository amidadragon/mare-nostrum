with open("/Users/ioio/octobot/app.py", "r") as f:
    content = f.read()

changes = 0

# 1. Upgrade daily loss limit from 2% to 3% with 2-hour pause
old_daily = """    # Daily loss limit: 2% of equity per day
    daily_limit = _scalper_balance * 0.02
    if _scalper_daily_pnl < -daily_limit:
        _scalper_log(f"Daily loss limit ${_scalper_daily_pnl:+.1f} / -${daily_limit:.0f} — no new entries", "warning")
        return"""

new_daily = """    # Daily loss limit: 3% of equity — circuit breaker pauses trading 2 hours
    daily_limit = _scalper_balance * 0.03
    if _scalper_daily_pnl < -daily_limit:
        if now < _scalper_pause_until:
            _scalper_log(f"CIRCUIT BREAKER active — {(_scalper_pause_until - now)/60:.0f}m left (daily loss ${_scalper_daily_pnl:+.1f})", "error")
            return
        _scalper_pause_until = now + 7200  # 2 hour pause
        _scalper_log(f"CIRCUIT BREAKER: daily loss ${_scalper_daily_pnl:+.1f} > -${daily_limit:.0f} — pausing 2h", "error")
        _tg(f"CIRCUIT BREAKER: daily P&L ${_scalper_daily_pnl:+.1f} hit -3% limit. Pausing 2h.")
        return

    # Win rate gate: if win rate drops below 40% (min 10 trades), reduce max positions
    _dynamic_max_pos = _scalper_max_positions
    if _scalper_trades >= 10:
        wr = _scalper_wins / _scalper_trades
        if wr < 0.40:
            _dynamic_max_pos = max(1, _scalper_max_positions - 1)
            _scalper_log(f"Win rate {wr*100:.0f}% < 40% — reducing max positions to {_dynamic_max_pos}", "warning")"""

if old_daily in content:
    content = content.replace(old_daily, new_daily)
    changes += 1
    print("1. Upgraded daily loss limit to 3% with 2h circuit breaker + win rate gate")
else:
    print("1. SKIP: daily loss limit marker not found")

# 2. Replace the max positions check to use dynamic max
old_max = """    if _effective_positions(_scalper_positions) >= _scalper_max_positions:
        _scalper_log(f"Max {_scalper_max_positions} effective positions — waiting", "info")
        return"""

new_max = """    _pos_limit = _dynamic_max_pos if '_dynamic_max_pos' in dir() else _scalper_max_positions
    if _effective_positions(_scalper_positions) >= _pos_limit:
        _scalper_log(f"Max {_pos_limit} effective positions — waiting", "info")
        return"""

if old_max in content:
    content = content.replace(old_max, new_max)
    changes += 1
    print("2. Dynamic position limit based on win rate")
else:
    print("2. SKIP: max positions marker not found")

# 3. Improve position sizing: add ATR-based volatility scaling
old_sizing = """        # Quarter Kelly position sizing: risk 1.5% of balance per trade
        risk_pct = sig.get("risk_pct", 0.025)
        risk_usd = _scalper_balance * 0.015  # quarter Kelly for crypto
        value = risk_usd / risk_pct if risk_pct > 0 else 0"""

new_sizing = """        # ATR-based dynamic position sizing: risk 1.5% of balance, scaled by volatility
        risk_pct = sig.get("risk_pct", 0.025)
        atr_pct_val = sig.get("atr_pct", 0.015)
        # Higher volatility = smaller position (inverse relationship)
        # Base: 1.5% risk. If ATR > 2%, scale down. If ATR < 1%, scale up.
        vol_scalar = 0.015 / max(atr_pct_val, 0.005)  # normalize to 1.5% ATR baseline
        vol_scalar = max(0.5, min(vol_scalar, 1.5))  # clamp 0.5x - 1.5x
        risk_usd = _scalper_balance * 0.015 * vol_scalar
        value = risk_usd / risk_pct if risk_pct > 0 else 0"""

if old_sizing in content:
    content = content.replace(old_sizing, new_sizing)
    changes += 1
    print("3. ATR-based dynamic position sizing")
else:
    print("3. SKIP: position sizing marker not found")

# 4. Improve trailing stop: move stop to breakeven at +3%, trail at 2% below peak
# The _should_exit function already has good zone logic, let's tighten it
old_zone3 = """    # Zone 3: big gains (>3% peak) — tight lock, keep 70%
    if peak >= 0.03 and pnl_pct <= peak * 0.70:
        return True, "zone3_lock"

    # Zone 2: ATR-adaptive trailing (higher activation = let winners run)
    trail_activate = max(atr_pct * 1.5, 0.012)
    trail_distance = atr_pct * 0.5
    if peak >= trail_activate and pnl_pct <= peak - trail_distance:
        return True, "trailing_stop"

    # Zone 1: breakeven protection (peak > 0.8%, drop back to flat)
    if peak >= 0.008 and pnl_pct <= 0.0:
        return True, "breakeven_stop\""""

new_zone3 = """    # Zone 3: big gains (>3% peak) — lock 75% of peak profit
    if peak >= 0.03 and pnl_pct <= peak * 0.75:
        return True, "zone3_lock"

    # Zone 2: trail 2% below peak once peak > 1.5% (ATR-adaptive floor)
    trail_activate = max(atr_pct * 1.2, 0.015)
    trail_distance = min(0.02, atr_pct * 0.8)  # trail at 2% or 0.8*ATR, whichever is tighter
    if peak >= trail_activate and pnl_pct <= peak - trail_distance:
        return True, "trailing_stop"

    # Zone 1: breakeven at +1% peak (was +0.8% — avoids premature breakeven on noise)
    if peak >= 0.01 and pnl_pct <= 0.001:
        return True, "breakeven_stop\""""

if old_zone3 in content:
    content = content.replace(old_zone3, new_zone3)
    changes += 1
    print("4. Tightened trailing stop zones: 75% lock, 2% trail, +1% breakeven")
else:
    print("4. SKIP: zone3 marker not found")

with open("/Users/ioio/octobot/app.py", "w") as f:
    f.write(content)

print(f"\nApplied {changes} risk management improvements")
