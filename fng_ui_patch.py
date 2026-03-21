with open("/Users/ioio/octobot/templates/index.html", "r") as f:
    content = f.read()

changes = 0

# Find where the F&G stat chip is updated in the portfolio refresh
# The existing s-fng chip exists but may not be getting data from the new field
# Let's find the portfolio data handler and add F&G update

old_fng_update = """      $('s-fng').textContent = '--';"""

# Check what's actually there
import re

# Look for where s-fng is set
fng_matches = [m.start() for m in re.finditer(r"s-fng", content)]
print(f"Found s-fng at {len(fng_matches)} locations")

# Find the portfolio refresh handler where scalper data is used
# The scalper data section that sets win rate etc
old_scalper_wr = """      $('s-winrate').textContent = sc.win_rate+'%';"""

if old_scalper_wr in content:
    # Add F&G update right after
    new_scalper_wr = """      $('s-winrate').textContent = sc.win_rate+'%';
      // Fear & Greed from API
      if (d.fear_greed) {
        const fv = d.fear_greed.value;
        const fl = d.fear_greed.label;
        const fColor = fv <= 25 ? 'var(--red)' : fv <= 45 ? 'var(--amber)' : fv >= 75 ? 'var(--red)' : 'var(--green)';
        $('s-fng').textContent = fv + ' ' + fl;
        $('s-fng').style.color = fColor;
      }"""
    content = content.replace(old_scalper_wr, new_scalper_wr, 1)
    changes += 1
    print("1. Wired up Fear&Greed chip from portfolio API")
else:
    print("1. SKIP: scalper win rate marker not found")

with open("/Users/ioio/octobot/templates/index.html", "w") as f:
    f.write(content)

print(f"Applied {changes} changes")
