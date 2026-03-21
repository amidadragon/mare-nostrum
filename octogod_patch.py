with open("/Users/ioio/octobot/octogod.py", "r") as f:
    content = f.read()

# Fix price_change_percentage to include 7d
content = content.replace(
    '"price_change_percentage":"1h,24h"',
    '"price_change_percentage":"1h,24h,7d"'
)

# Find end of fetch_crypto and insert new functions after it
marker = '''    except Exception as e:
        log(f"Crypto fetch error: {e}")
        return []'''

new_funcs = '''    except Exception as e:
        log(f"Crypto fetch error: {e}")
        return []

def fetch_fear_greed():
    """Fetch Fear & Greed Index."""
    try:
        r = requests.get("https://api.alternative.me/fng/?limit=1", timeout=10)
        data = r.json().get("data", [{}])[0]
        return {"value": int(data.get("value", 50)), "label": data.get("value_classification", "Neutral")}
    except Exception:
        return {"value": 50, "label": "Neutral"}

def compute_momentum_score(coins):
    """Score momentum: weight 1h change 3x, 24h 1x."""
    scores = {}
    for c in coins:
        sym = c.get("symbol", "").upper()
        chg_1h = c.get("price_change_percentage_1h_in_currency", 0) or 0
        chg_24h = c.get("price_change_percentage_24h", 0) or 0
        scores[sym] = round(chg_1h * 3 + chg_24h, 2)
    return scores

def check_volume_health(coins):
    """Flag coins with thin volume (vol/mcap < 3%)."""
    flags = {}
    for c in coins:
        sym = c.get("symbol", "").upper()
        vol = c.get("total_volume", 0) or 0
        mcap = c.get("market_cap", 1) or 1
        ratio = vol / mcap if mcap > 0 else 0
        flags[sym] = {"vol_mcap": round(ratio, 4), "thin": ratio < 0.03}
    return flags

def check_btc_health(coins):
    """If BTC 1h drop > 2%, alts are risky."""
    btc = next((c for c in coins if c.get("symbol", "").upper() == "BTC"), None)
    if not btc:
        return False, 0
    chg = btc.get("price_change_percentage_1h_in_currency", 0) or 0
    return chg < -2.0, chg

def compute_trend_score(coins):
    """Simple trend classification per coin."""
    scores = {}
    for c in coins:
        sym = c.get("symbol", "").upper()
        chg_1h = c.get("price_change_percentage_1h_in_currency", 0) or 0
        chg_24h = c.get("price_change_percentage_24h", 0) or 0
        if chg_1h > 0 and chg_24h > 0: scores[sym] = "strong_up"
        elif chg_1h < 0 and chg_24h < 0: scores[sym] = "strong_down"
        elif chg_1h > 0 and chg_24h < 0: scores[sym] = "reversal_up"
        else: scores[sym] = "reversal_down"
    return scores
'''

content = content.replace(marker, new_funcs)

with open("/Users/ioio/octobot/octogod.py", "w") as f:
    f.write(content)

print("Done: added intelligence helpers to octogod.py")
