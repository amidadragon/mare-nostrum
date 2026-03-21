with open("/Users/ioio/octobot/octogod.py", "r") as f:
    content = f.read()

# Upgrade the market_bot_loop to gather richer intelligence
old_market_mem = '''            with empire_lock:
                bot_memory["market"] = {
                    "prices": coins,
                    "trending": trending,
                    "ts": datetime.now().isoformat()
                }'''

new_market_mem = '''            # Compute intelligence scores
            momentum = compute_momentum_score(coins)
            vol_health = check_volume_health(coins)
            btc_dumping, btc_chg = check_btc_health(coins)
            trends = compute_trend_score(coins)
            fng = fetch_fear_greed()

            with empire_lock:
                bot_memory["market"] = {
                    "prices": coins,
                    "trending": trending,
                    "momentum": momentum,
                    "volume_health": vol_health,
                    "btc_dumping": btc_dumping,
                    "btc_1h": btc_chg,
                    "trends": trends,
                    "fear_greed": fng,
                    "ts": datetime.now().isoformat()
                }

            if btc_dumping:
                log(f"BTC DUMPING {btc_chg:+.1f}% 1h — alt risk elevated", "MARKETBOT")'''

content = content.replace(old_market_mem, new_market_mem)

# Upgrade the octogod decision prompt to include intelligence data
old_market_summary = '''            market_summary = ""
            if "market" in mem_snapshot:
                prices = mem_snapshot["market"].get("prices", [])[:8]
                market_summary = "\\n".join([
                    f"{p['symbol'].upper()}: ${p['current_price']:,.2f} "
                    f"({p.get('price_change_percentage_24h',0):.1f}% 24h)"
                    for p in prices
                ])'''

new_market_summary = '''            market_summary = ""
            intelligence = ""
            if "market" in mem_snapshot:
                mkt = mem_snapshot["market"]
                prices = mkt.get("prices", [])[:8]
                momentum = mkt.get("momentum", {})
                vol_health = mkt.get("volume_health", {})
                trends = mkt.get("trends", {})
                fng = mkt.get("fear_greed", {})
                btc_dumping = mkt.get("btc_dumping", False)
                market_summary = "\\n".join([
                    f"{p['symbol'].upper()}: ${p['current_price']:,.2f} "
                    f"({p.get('price_change_percentage_1h_in_currency',0):.1f}% 1h, "
                    f"{p.get('price_change_percentage_24h',0):.1f}% 24h) "
                    f"mom={momentum.get(p['symbol'].upper(), 0)} "
                    f"vol={'THIN' if vol_health.get(p['symbol'].upper(), {}).get('thin') else 'OK'} "
                    f"trend={trends.get(p['symbol'].upper(), '?')}"
                    for p in prices
                ])
                intelligence = (
                    f"FEAR_GREED: {fng.get('value', 50)} ({fng.get('label', 'Neutral')})\\n"
                    f"BTC_STATUS: {'DUMPING - DO NOT BUY ALTS' if btc_dumping else 'stable'}\\n"
                    f"RULE: If Fear&Greed > 80 (Extreme Greed), reduce position sizes 50%. "
                    f"If < 20 (Extreme Fear), be aggressive on quality setups.\\n"
                    f"RULE: If volume is THIN for a coin, skip it — no liquidity to exit.\\n"
                    f"RULE: Require momentum score > 0 for BUY. Negative momentum = don't catch falling knife."
                )'''

content = content.replace(old_market_summary, new_market_summary)

# Update the AI prompt to include intelligence
old_prompt_call = '''                f"SIGNAL: {json.dumps(signal)}\\n"
                f"MARKET:\\n{market_summary}\\n"
                f"RESEARCH: {json.dumps(mem_snapshot.get('research',{}))}\\n"
                f"PAST RUNS:\\n{past or 'first run'}\\n"
                f"JSON only."'''

new_prompt_call = '''                f"SIGNAL: {json.dumps(signal)}\\n"
                f"MARKET:\\n{market_summary}\\n"
                f"INTELLIGENCE:\\n{intelligence}\\n"
                f"RESEARCH: {json.dumps(mem_snapshot.get('research',{}))}\\n"
                f"PAST RUNS:\\n{past or 'first run'}\\n"
                f"JSON only."'''

content = content.replace(old_prompt_call, new_prompt_call)

with open("/Users/ioio/octobot/octogod.py", "w") as f:
    f.write(content)

print("Done: upgraded octogod loop with intelligence integration")
