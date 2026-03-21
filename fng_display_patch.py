with open("/Users/ioio/octobot/app.py", "r") as f:
    content = f.read()

changes = 0

# 1. Add Fear & Greed to the /api/portfolio response
old_portfolio_return = '''        "vm": _vm_state,
        "boot_time": _boot_time,
        "sentiment": octoscrape.get_state(),'''

new_portfolio_return = '''        "vm": _vm_state,
        "boot_time": _boot_time,
        "sentiment": octoscrape.get_state(),
        "fear_greed": {"value": _fng_cache.get("value", 50), "label": _fng_cache.get("label", "Neutral")},'''

if old_portfolio_return in content:
    content = content.replace(old_portfolio_return, new_portfolio_return)
    changes += 1
    print("1. Added Fear&Greed to /api/portfolio response")
else:
    print("1. SKIP: portfolio return marker not found")

# 2. Add MA trend info to scalper debug endpoint
old_debug = '''@app.route("/api/scalper_debug")
def scalper_debug():'''

# Find the debug function body
idx = content.find(old_debug)
if idx >= 0:
    # Find the return jsonify in this function
    ret_idx = content.find("return jsonify(", idx)
    if ret_idx >= 0:
        # Find the closing ) of jsonify
        paren_count = 0
        end_idx = ret_idx + len("return jsonify(")
        for i in range(end_idx, len(content)):
            if content[i] == '(':
                paren_count += 1
            elif content[i] == ')':
                if paren_count == 0:
                    end_idx = i
                    break
                paren_count -= 1
        # Check if fear_greed already in response
        debug_section = content[ret_idx:end_idx]
        if "fear_greed" not in debug_section:
            # Add fear_greed before the closing paren
            insert_text = '\n        "fear_greed": {"value": _fng_cache.get("value", 50), "label": _fng_cache.get("label", "Neutral")},\n        "ma_trends": {sym: _ma_trend(_BINANCE_MAP.get(sym, "BTCUSDT"))[0] for sym in _SCALP_ASSETS[:3]},\n    '
            # This is getting complex, let me skip and do it simpler
            pass
    print("2. Skipped debug endpoint (complex insertion)")
else:
    print("2. SKIP: debug endpoint not found")

# 3. Log Fear&Greed + regime weight at start of each scalper cycle
old_cycle_reset = '''    # Reset daily P&L at midnight UTC
    import datetime
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    if _scalper_day_start != today:
        _scalper_daily_pnl = 0.0
        _scalper_day_start = today'''

new_cycle_reset = '''    # Reset daily P&L at midnight UTC
    import datetime
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    if _scalper_day_start != today:
        _scalper_daily_pnl = 0.0
        _scalper_day_start = today
        _scalper_log(f"New day: {today} — daily P&L reset", "info")

    # Log market conditions
    fng_v, fng_l = _get_fear_greed()
    regime_w, _, _ = _market_regime_weight()
    _scalper_log(f"Tick | F&G={fng_v} ({fng_l}) | regime_weight={regime_w}x | bal=${_scalper_balance:,.0f} | day_pnl=${_scalper_daily_pnl:+.1f}", "info")'''

if old_cycle_reset in content:
    content = content.replace(old_cycle_reset, new_cycle_reset)
    changes += 1
    print("3. Added F&G + regime weight logging to scalper cycle start")
else:
    print("3. SKIP: cycle reset marker not found")

with open("/Users/ioio/octobot/app.py", "w") as f:
    f.write(content)

print(f"\nApplied {changes} changes")
