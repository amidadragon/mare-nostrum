with open("/Users/ioio/octobot/app.py", "r") as f:
    content = f.read()

insert_marker = '@app.route("/api/scalper_asset_stats")'

if insert_marker not in content:
    print("ERROR: cannot find scalper_asset_stats route")
else:
    idx = content.index(insert_marker)

    new_api = '''@app.route("/api/analytics")
def analytics_data():
    """P&L breakdown by day/week/month + strategy performance."""
    import sqlite3 as _sq
    import datetime as _dt
    try:
        db = pf.get_db()
        rows = db.execute(
            "SELECT timestamp, symbol, reasoning, value, price FROM trades "
            "WHERE market='scalper' AND action='SELL' ORDER BY id DESC LIMIT 200"
        ).fetchall()
        db.close()

        daily, weekly, monthly, strategy_perf = {}, {}, {}, {}
        hourly_pnl = []

        for r in rows:
            ts_str, sym, reasoning, value, price = r
            pnl_pct = 0
            if "pnl:" in (reasoning or ""):
                try:
                    pnl_str = reasoning.split("pnl:")[1].split("%")[0].strip()
                    pnl_pct = float(pnl_str)
                except Exception:
                    pass
            pnl_usd = (value or 0) * pnl_pct / 100

            try:
                ts = _dt.datetime.fromisoformat(ts_str) if ts_str else _dt.datetime.utcnow()
            except Exception:
                ts = _dt.datetime.utcnow()

            day_key = ts.strftime("%Y-%m-%d")
            week_key = ts.strftime("%Y-W%W")
            month_key = ts.strftime("%Y-%m")

            for bucket, key in [(daily, day_key), (weekly, week_key), (monthly, month_key)]:
                bucket.setdefault(key, {"pnl": 0, "trades": 0, "wins": 0})
                bucket[key]["pnl"] += pnl_usd
                bucket[key]["trades"] += 1
                if pnl_usd > 0: bucket[key]["wins"] += 1

            strat = "unknown"
            if reasoning:
                for s in ["trend_rsi_bb", "grid_range", "trend_pullback"]:
                    if s in reasoning:
                        strat = s
                        break
            strategy_perf.setdefault(strat, {"pnl": 0, "trades": 0, "wins": 0})
            strategy_perf[strat]["pnl"] += pnl_usd
            strategy_perf[strat]["trades"] += 1
            if pnl_usd > 0: strategy_perf[strat]["wins"] += 1

            hourly_pnl.append({"ts": ts_str, "pnl": round(pnl_usd, 2)})

        for d in [daily, weekly, monthly, strategy_perf]:
            for k in d:
                d[k]["pnl"] = round(d[k]["pnl"], 2)
                d[k]["wr"] = round(d[k]["wins"] / d[k]["trades"] * 100, 1) if d[k]["trades"] else 0

        asset_perf = {}
        for sym, s in _asset_stats.items():
            asset_perf[sym] = {
                "trades": s["trades"], "wins": s["wins"],
                "pnl": round(s["total_pnl"], 2),
                "wr": round(s["wins"] / s["trades"] * 100, 1) if s["trades"] else 0,
                "avg_hold": round(s["total_hold_min"] / s["trades"], 1) if s["trades"] else 0,
            }

        return jsonify({
            "daily": dict(sorted(daily.items(), reverse=True)[:14]),
            "weekly": dict(sorted(weekly.items(), reverse=True)[:8]),
            "monthly": dict(sorted(monthly.items(), reverse=True)[:6]),
            "strategies": strategy_perf,
            "assets": asset_perf,
            "pnl_series": hourly_pnl[:100],
            "current": {
                "balance": round(_scalper_balance, 2),
                "daily_pnl": round(_scalper_daily_pnl, 2),
                "trades": _scalper_trades,
                "wins": _scalper_wins,
                "win_rate": round(_scalper_wins / _scalper_trades * 100, 1) if _scalper_trades else 0,
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)})

'''
    content = content[:idx] + new_api + content[idx:]
    print("Added /api/analytics endpoint")

with open("/Users/ioio/octobot/app.py", "w") as f:
    f.write(content)

print("Done")
