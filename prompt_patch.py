with open("/Users/ioio/octobot/octogod_prompt.py", "r") as f:
    content = f.read()

changes = 0

# 1. Add momentum/volume/correlation rules to the decision matrix
old_special = '''  SPECIAL RULES:
  - If cash < $30: HOLD only (cash guard — survive to fight another day)
  - If already holding 3+ positions: HOLD unless selling (don't overextend)
  - If same coin was a loss in last 3 trades: SKIP (don't revenge trade)
  - If 24h change > +15%: CAUTION — likely overextended, wait for pullback
  - If 24h change < -15%: OPPORTUNITY — look for bounce setup with tiny size
  - If 1h change > +5% AND volume spike: MOMENTUM PLAY — ride it with tight stop'''

new_special = '''  SPECIAL RULES:
  - If cash < $30: HOLD only (cash guard — survive to fight another day)
  - If already holding 3+ positions: HOLD unless selling (don't overextend)
  - If same coin was a loss in last 3 trades: SKIP (don't revenge trade)
  - If 24h change > +15%: CAUTION — likely overextended, wait for pullback
  - If 24h change < -15%: OPPORTUNITY — look for bounce setup with tiny size
  - If 1h change > +5% AND volume spike: MOMENTUM PLAY — ride it with tight stop

  INTELLIGENCE RULES (CRITICAL — these override gut feeling):
  - If momentum score is NEGATIVE for a coin: DO NOT BUY (falling knife)
  - If volume is THIN: DO NOT BUY (no liquidity to exit cleanly)
  - If BTC_STATUS is DUMPING: DO NOT BUY ANY ALTS (correlated crash)
  - If Fear&Greed > 80 (Extreme Greed): reduce all positions by 50%, be very selective
  - If Fear&Greed < 20 (Extreme Fear): this is where fortunes are made — be aggressive on quality
  - If trend is "strong_down": only SELL or HOLD, never BUY
  - If trend is "reversal_up": potential opportunity but needs strong volume confirmation'''

if old_special in content:
    content = content.replace(old_special, new_special)
    changes += 1
    print("1. Added intelligence rules to decision matrix")

# 2. Update the prompt builder to include intelligence section
old_signal_block = '''    # Signals (from bot swarm if available)
    signal_block = ""
    if signals:
        signal_lines = [f"  [{s.get('type','?')}] {s.get('coin','?')}: {s.get('detail','')}" for s in signals]
        signal_block = f"\\n--- LIVE SIGNALS ---\\n" + "\\n".join(signal_lines)'''

new_signal_block = '''    # Signals (from bot swarm if available)
    signal_block = ""
    if signals:
        signal_lines = [f"  [{s.get('type','?')}] {s.get('coin','?')}: {s.get('detail','')}" for s in signals]
        signal_block = f"\\n--- LIVE SIGNALS ---\\n" + "\\n".join(signal_lines)

    # Intelligence section (momentum, volume, trends)
    intel_block = ""
    # These will be injected by octogod.py if available'''

if old_signal_block in content:
    content = content.replace(old_signal_block, new_signal_block)
    changes += 1
    print("2. Updated prompt builder signal section")

with open("/Users/ioio/octobot/octogod_prompt.py", "w") as f:
    f.write(content)

print(f"Applied {changes} prompt improvements")
