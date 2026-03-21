with open("/Users/ioio/octobot/app.py", "r") as f:
    content = f.read()

changes = 0

# 1. Add Fear & Greed fetch + MA trend detection functions near the indicator section
# Insert after the _vwap function
marker = '''def _vwap(candles):
    """Session VWAP from candle data. Returns VWAP value or None."""
    if not candles or len(candles) < 5: return None
    cum_vol = 0
    cum_tp_vol = 0
    for c in candles:
        tp = (c["high"] + c["low"] + c["close"]) / 3
        v = c["volume"]
        cum_vol += v
        cum_tp_vol += tp * v
    return cum_tp_vol / cum_vol if cum_vol > 0 else None'''

new_marker = '''def _vwap(candles):
    """Session VWAP from candle data. Returns VWAP value or None."""
    if not candles or len(candles) < 5: return None
    cum_vol = 0
    cum_tp_vol = 0
    for c in candles:
        tp = (c["high"] + c["low"] + c["close"]) / 3
        v = c["volume"]
        cum_vol += v
        cum_tp_vol += tp * v
    return cum_tp_vol / cum_vol if cum_vol > 0 else None


# ── MARKET INTELLIGENCE ──────────────────────────────────────

_fng_cache = {"value": 50, "label": "Neutral", "ts": 0}

def _get_fear_greed():
    """Cached Fear & Greed index (refresh every 30min)."""
    now = _time.time()
    if now - _fng_cache["ts"] < 1800:
        return _fng_cache["value"], _fng_cache["label"]
    try:
        r = requests.get("https://api.alternative.me/fng/?limit=1", timeout=8)
        data = r.json().get("data", [{}])[0]
        _fng_cache["value"] = int(data.get("value", 50))
        _fng_cache["label"] = data.get("value_classification", "Neutral")
        _fng_cache["ts"] = now
    except Exception:
        pass
    return _fng_cache["value"], _fng_cache["label"]

def _ma_trend(binance_sym):
    """50 vs 200 period MA on 15min candles. Returns (trend, ma50, ma200).
    trend: 'bullish' if MA50 > MA200, 'bearish' otherwise, 'neutral' if close."""
    c15 = _get_candles(binance_sym, "15m", 200)
    if not c15 or len(c15) < 200:
        return "neutral", 0, 0
    closes = [c["close"] for c in c15]
    ma50 = sum(closes[-50:]) / 50
    ma200 = sum(closes[-200:]) / 200
    spread = (ma50 - ma200) / ma200 if ma200 > 0 else 0
    if spread > 0.002:
        return "bullish", ma50, ma200
    elif spread < -0.002:
        return "bearish", ma50, ma200
    return "neutral", ma50, ma200

def _market_regime_weight():
    """Weight trading decisions by market regime. Returns multiplier 0.5-1.5.
    Conservative during extreme greed, aggressive on extreme fear."""
    fng_val, fng_label = _get_fear_greed()
    if fng_val <= 20:  # Extreme Fear = contrarian opportunity
        return 1.3, fng_val, fng_label
    elif fng_val <= 35:  # Fear = slightly aggressive
        return 1.1, fng_val, fng_label
    elif fng_val >= 80:  # Extreme Greed = very conservative
        return 0.5, fng_val, fng_label
    elif fng_val >= 65:  # Greed = reduce exposure
        return 0.8, fng_val, fng_label
    return 1.0, fng_val, fng_label  # Neutral'''

if marker in content:
    content = content.replace(marker, new_marker)
    changes += 1
    print("1. Added Fear&Greed cache, MA trend detection, market regime weighting")
else:
    print("1. SKIP: _vwap marker not found")

# 2. Integrate Fear & Greed into the scalper entry signal scoring
old_score_sent = '''        # Sentiment integration: Fear & Greed + bias
        try:
            sent = octoscrape.get_state().get("summary", {})
            fng = sent.get("fear_greed", {})
            fng_val = fng.get("value", 50) if fng else 50
            bias = sent.get("bias", "neutral")
            if fng_val <= 20: score += 1  # Extreme Fear = contrarian buy
            if bias == "bearish": score -= 1  # headwind penalty
            if bias == "bullish" and regime == "trending_up": score += 1
        except Exception:
            pass'''

new_score_sent = '''        # Sentiment integration: Fear & Greed + bias + MA trend
        try:
            sent = octoscrape.get_state().get("summary", {})
            fng = sent.get("fear_greed", {})
            fng_val = fng.get("value", 50) if fng else 50
            bias = sent.get("bias", "neutral")
            if fng_val <= 20: score += 2  # Extreme Fear = strong contrarian buy
            elif fng_val <= 35: score += 1  # Fear = mild contrarian
            elif fng_val >= 80: score -= 2  # Extreme Greed = don't buy the top
            elif fng_val >= 65: score -= 1  # Greed = headwind
            if bias == "bearish": score -= 1
            if bias == "bullish" and regime == "trending_up": score += 1
        except Exception:
            pass

        # MA trend confirmation: 50 vs 200 period MA
        try:
            ma_trend, ma50, ma200 = _ma_trend(binance_sym)
            if ma_trend == "bullish": score += 1  # MA50 > MA200 = uptrend
            elif ma_trend == "bearish": score -= 1  # MA50 < MA200 = headwind
            sig_dbg["ma_trend"] = ma_trend
        except Exception:
            pass'''

if old_score_sent in content:
    content = content.replace(old_score_sent, new_score_sent)
    changes += 1
    print("2. Enhanced sentiment scoring: stronger F&G weighting + MA trend confirmation")
else:
    print("2. SKIP: sentiment scoring marker not found")

# 3. Apply Fear & Greed to position sizing via market regime weight
old_vol_scalar = '''        vol_scalar = max(0.5, min(vol_scalar, 1.5))  # clamp 0.5x - 1.5x
        risk_usd = _scalper_balance * 0.015 * vol_scalar'''

new_vol_scalar = '''        vol_scalar = max(0.5, min(vol_scalar, 1.5))  # clamp 0.5x - 1.5x
        # Market regime weight: conservative in greed, aggressive in fear
        regime_mult, fng_v, fng_l = _market_regime_weight()
        risk_usd = _scalper_balance * 0.015 * vol_scalar * regime_mult'''

if old_vol_scalar in content:
    content = content.replace(old_vol_scalar, new_vol_scalar)
    changes += 1
    print("3. Applied Fear&Greed regime weight to position sizing")
else:
    print("3. SKIP: vol_scalar marker not found")

# 4. Raise minimum score gate from 2 to 3 for stronger confluence
old_min_score = '''        # Minimum score gate: need at least 2 points to enter
        if score < 2:
            _scalper_log(f"  {asset} signal too weak (score={score}) — skipping", "info")
            continue'''

new_min_score = '''        # Minimum score gate: need at least 3 points for strong confluence
        if score < 3:
            _scalper_log(f"  {asset} signal too weak (score={score}/3 min) — skipping", "info")
            continue'''

if old_min_score in content:
    content = content.replace(old_min_score, new_min_score)
    changes += 1
    print("4. Raised minimum signal score from 2 to 3 (stronger confluence required)")
else:
    print("4. SKIP: min score marker not found")

with open("/Users/ioio/octobot/app.py", "w") as f:
    f.write(content)

print(f"\nApplied {changes} market intelligence improvements")
