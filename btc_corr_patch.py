with open("/Users/ioio/octobot/app.py", "r") as f:
    content = f.read()

changes = 0

# 1. Add BTC correlation check before the asset scan loop
# When BTC is dumping hard, skip all alt entries
old_scan_start = '''    # ── SCAN WITH REGIME DETECTION ─────────────────────
    open_symbols = {p.get("symbol") for p in _scalper_positions}
    _scalper_last_signal = "FLAT"

    for asset in _SCALP_ASSETS:'''

new_scan_start = '''    # ── BTC CORRELATION GATE ──────────────────────────
    # If BTC is in freefall on 15m, skip all alt entries (correlated crash risk)
    try:
        btc_c15 = _get_candles("BTCUSDT", "15m", 10)
        if btc_c15 and len(btc_c15) >= 5:
            btc_closes = [c["close"] for c in btc_c15]
            btc_drop = (btc_closes[-1] - btc_closes[-5]) / btc_closes[-5] if btc_closes[-5] else 0
            if btc_drop < -0.02:  # BTC dropped >2% in last 5 candles (75min)
                _scalper_log(f"BTC CORRELATION GATE: BTC {btc_drop*100:+.1f}% in 75m — skipping all entries", "warning")
                return
    except Exception:
        pass

    # ── SCAN WITH REGIME DETECTION ─────────────────────
    open_symbols = {p.get("symbol") for p in _scalper_positions}
    _scalper_last_signal = "FLAT"

    for asset in _SCALP_ASSETS:'''

if old_scan_start in content:
    content = content.replace(old_scan_start, new_scan_start)
    changes += 1
    print("1. Added BTC correlation gate before entry scan")
else:
    print("1. SKIP: scan start marker not found")

# 2. Add volume decline detection to entry signal
# In the entry signal, add a check that current volume > previous 3 candles avg
old_vol_check = '''    # Volume must confirm selling pressure preceded the dip
    if vol_ratio < vol_threshold:
        return None, debug'''

new_vol_check = '''    # Volume must confirm selling pressure preceded the dip
    if vol_ratio < vol_threshold:
        return None, debug

    # Volume trend: declining volume over last 5 bars = fading interest, skip
    if len(volumes) >= 7:
        vol_recent = sum(volumes[-6:-1]) / 5
        vol_older = sum(volumes[-11:-6]) / 5 if len(volumes) >= 11 else vol_recent
        if vol_older > 0 and vol_recent / vol_older < 0.6:
            debug["vol_declining"] = True
            return None, debug'''

if old_vol_check in content:
    content = content.replace(old_vol_check, new_vol_check)
    changes += 1
    print("2. Added volume decline detection to entry signal")
else:
    print("2. SKIP: volume check marker not found")

# 3. Add a log line showing Fear&Greed and regime weight in the entry
old_entry_log = '''        rr = (target_price - entry) / (entry - stop_price) if entry > stop_price else 0
        _scalper_log(
            f"BUY {asset} ${value:.0f} @ ${entry:,.2f} | {strat_name} | stop=${stop_price:,.0f} target=${target_price:,.0f} R/R={rr:.1f}",
            "success"
        )'''

new_entry_log = '''        rr = (target_price - entry) / (entry - stop_price) if entry > stop_price else 0
        fng_v2, fng_l2 = _get_fear_greed()
        _scalper_log(
            f"BUY {asset} ${value:.0f} @ ${entry:,.2f} | {strat_name} | stop=${stop_price:,.0f} target=${target_price:,.0f} R/R={rr:.1f} | F&G={fng_v2} score={score}",
            "success"
        )'''

if old_entry_log in content:
    content = content.replace(old_entry_log, new_entry_log)
    changes += 1
    print("3. Added F&G and score to entry log")
else:
    print("3. SKIP: entry log marker not found")

with open("/Users/ioio/octobot/app.py", "w") as f:
    f.write(content)

print(f"\nApplied {changes} changes")
