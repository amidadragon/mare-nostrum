with open("/Users/ioio/octobot/templates/index.html", "r") as f:
    content = f.read()

changes = 0

# 1. Make win rate stat-chip more prominent with color
old_wr = '<div class="stat-chip"><span class="val" id="s-winrate">--%</span><span class="lbl">W/R</span></div>'
new_wr = '<div class="stat-chip" style="border:1px solid var(--border-hi)"><span class="val" id="s-winrate" style="font-size:16px;font-weight:700">--%</span><span class="lbl">WIN RATE</span></div>'
if old_wr in content:
    content = content.replace(old_wr, new_wr)
    changes += 1
    print("1. Made win rate chip more prominent")

# 2. Add analytics panel HTML between trade history and terminal
marker = '  <!-- ═══ TERMINAL ═══ -->'
analytics_html = '''  <!-- ═══ ANALYTICS ═══ -->
  <button class="term-toggle" onclick="toggleAnalytics()" style="margin-top:8px">
    <span class="arrow" id="an-arrow">&#9654;</span> ANALYTICS & P&L
  </button>
  <div id="analytics-panel" style="display:none;background:var(--bg1);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px">
    <div id="analytics-content" style="font-size:10px;line-height:1.6">Loading analytics...</div>
  </div>

  '''
if marker in content:
    content = content.replace(marker, analytics_html + marker)
    changes += 1
    print("2. Added analytics panel HTML")

# 3. Add the analytics JS before </script>
script_end = '</script>\n</body>'
analytics_js = '''
/* ═══ ANALYTICS ═══ */
let analyticsOpen = false;
let analyticsLoaded = false;
function toggleAnalytics() {
  analyticsOpen = !analyticsOpen;
  const p = $('analytics-panel');
  p.style.display = analyticsOpen ? 'block' : 'none';
  $('an-arrow').innerHTML = analyticsOpen ? '&#9660;' : '&#9654;';
  if (analyticsOpen && !analyticsLoaded) loadAnalytics();
}
function loadAnalytics() {
  fetch('/api/analytics').then(r=>r.json()).then(d=>{
    analyticsLoaded = true;
    if (d.error) { $('analytics-content').textContent = 'Error: '+d.error; return; }
    let html = '';

    // Current summary
    const c = d.current || {};
    const wrColor = c.win_rate >= 50 ? 'var(--green)' : c.win_rate >= 40 ? 'var(--amber)' : 'var(--red)';
    html += '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:12px;flex-wrap:wrap">';
    html += '<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:'+wrColor+'">'+c.win_rate+'%</div><div style="font-size:8px;color:var(--text-3)">WIN RATE</div></div>';
    html += '<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--green)">$'+(c.balance||0).toLocaleString()+'</div><div style="font-size:8px;color:var(--text-3)">BALANCE</div></div>';
    const dpColor = (c.daily_pnl||0) >= 0 ? 'var(--green)' : 'var(--red)';
    html += '<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:'+dpColor+'">'+((c.daily_pnl||0)>=0?'+':'')+'$'+(c.daily_pnl||0).toFixed(2)+'</div><div style="font-size:8px;color:var(--text-3)">TODAY</div></div>';
    html += '<div style="text-align:center"><div style="font-size:20px;font-weight:700">'+c.trades+'</div><div style="font-size:8px;color:var(--text-3)">TOTAL TRADES</div></div>';
    html += '</div>';

    // Strategy performance table
    const strats = d.strategies || {};
    if (Object.keys(strats).length) {
      html += '<div style="margin-top:8px;font-size:11px;color:var(--text-2);font-weight:700">STRATEGY PERFORMANCE</div>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px">';
      html += '<tr style="color:var(--text-3)"><th style="text-align:left;padding:3px 6px">Strategy</th><th>Trades</th><th>Win Rate</th><th>P&L</th></tr>';
      for (const [name, s] of Object.entries(strats)) {
        const pColor = s.pnl >= 0 ? 'var(--green)' : 'var(--red)';
        const wColor = s.wr >= 50 ? 'var(--green)' : s.wr >= 40 ? 'var(--amber)' : 'var(--red)';
        html += '<tr style="border-top:1px solid var(--border)">';
        html += '<td style="padding:3px 6px;color:var(--text-2)">'+name+'</td>';
        html += '<td style="text-align:center">'+s.trades+'</td>';
        html += '<td style="text-align:center;color:'+wColor+'">'+s.wr+'%</td>';
        html += '<td style="text-align:center;color:'+pColor+'">'+(s.pnl>=0?'+':'')+'$'+s.pnl.toFixed(2)+'</td>';
        html += '</tr>';
      }
      html += '</table>';
    }

    // Asset performance table
    const assets = d.assets || {};
    if (Object.keys(assets).length) {
      html += '<div style="margin-top:12px;font-size:11px;color:var(--text-2);font-weight:700">ASSET PERFORMANCE</div>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px">';
      html += '<tr style="color:var(--text-3)"><th style="text-align:left;padding:3px 6px">Asset</th><th>Trades</th><th>Win Rate</th><th>P&L</th><th>Avg Hold</th></tr>';
      for (const [name, s] of Object.entries(assets)) {
        const pColor = s.pnl >= 0 ? 'var(--green)' : 'var(--red)';
        const wColor = s.wr >= 50 ? 'var(--green)' : s.wr >= 40 ? 'var(--amber)' : 'var(--red)';
        html += '<tr style="border-top:1px solid var(--border)">';
        html += '<td style="padding:3px 6px;color:var(--text-2)">'+name.replace("/USD","")+'</td>';
        html += '<td style="text-align:center">'+s.trades+'</td>';
        html += '<td style="text-align:center;color:'+wColor+'">'+s.wr+'%</td>';
        html += '<td style="text-align:center;color:'+pColor+'">'+(s.pnl>=0?'+':'')+'$'+s.pnl.toFixed(2)+'</td>';
        html += '<td style="text-align:center">'+s.avg_hold+'m</td>';
        html += '</tr>';
      }
      html += '</table>';
    }

    // Daily P&L breakdown
    const daily = d.daily || {};
    if (Object.keys(daily).length) {
      html += '<div style="margin-top:12px;font-size:11px;color:var(--text-2);font-weight:700">DAILY P&L (last 14 days)</div>';
      html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">';
      for (const [day, s] of Object.entries(daily)) {
        const bg = s.pnl >= 0 ? 'rgba(0,255,65,0.08)' : 'rgba(255,0,64,0.08)';
        const color = s.pnl >= 0 ? 'var(--green)' : 'var(--red)';
        html += '<div style="background:'+bg+';border:1px solid var(--border);border-radius:4px;padding:4px 8px;text-align:center;min-width:65px">';
        html += '<div style="font-size:8px;color:var(--text-3)">'+day.slice(5)+'</div>';
        html += '<div style="font-size:11px;font-weight:700;color:'+color+'">'+(s.pnl>=0?'+':'')+'$'+s.pnl.toFixed(1)+'</div>';
        html += '<div style="font-size:8px;color:var(--text-3)">'+s.trades+' ('+s.wr+'%)</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Weekly P&L
    const weekly = d.weekly || {};
    if (Object.keys(weekly).length) {
      html += '<div style="margin-top:12px;font-size:11px;color:var(--text-2);font-weight:700">WEEKLY P&L</div>';
      html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">';
      for (const [wk, s] of Object.entries(weekly)) {
        const bg = s.pnl >= 0 ? 'rgba(0,255,65,0.08)' : 'rgba(255,0,64,0.08)';
        const color = s.pnl >= 0 ? 'var(--green)' : 'var(--red)';
        html += '<div style="background:'+bg+';border:1px solid var(--border);border-radius:4px;padding:4px 8px;text-align:center;min-width:80px">';
        html += '<div style="font-size:8px;color:var(--text-3)">'+wk+'</div>';
        html += '<div style="font-size:11px;font-weight:700;color:'+color+'">'+(s.pnl>=0?'+':'')+'$'+s.pnl.toFixed(1)+'</div>';
        html += '<div style="font-size:8px;color:var(--text-3)">'+s.trades+' trades ('+s.wr+'%)</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // P&L chart using canvas
    const series = (d.pnl_series || []).reverse();
    if (series.length > 2) {
      html += '<div style="margin-top:12px;font-size:11px;color:var(--text-2);font-weight:700">CUMULATIVE P&L</div>';
      html += '<canvas id="pnl-chart" width="580" height="120" style="width:100%;margin-top:4px"></canvas>';
    }

    $('analytics-content').innerHTML = html;

    // Draw P&L chart if data exists
    if (series.length > 2) {
      const canvas = document.getElementById('pnl-chart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        let cum = 0;
        const points = series.map(s => { cum += s.pnl; return cum; });
        const maxV = Math.max(...points.map(Math.abs), 1);
        const w = canvas.width, h = canvas.height;
        const pad = 10;
        ctx.clearRect(0, 0, w, h);
        // Zero line
        const zeroY = h/2;
        ctx.strokeStyle = 'rgba(0,255,65,0.1)';
        ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
        // P&L line
        ctx.strokeStyle = cum >= 0 ? '#00ff41' : '#ff0040';
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((v, i) => {
          const x = pad + (i / (points.length-1)) * (w - 2*pad);
          const y = zeroY - (v / maxV) * (zeroY - pad);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Fill under curve
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = cum >= 0 ? '#00ff41' : '#ff0040';
        ctx.lineTo(pad + (w - 2*pad), zeroY);
        ctx.lineTo(pad, zeroY);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Labels
        ctx.font = '9px JetBrains Mono';
        ctx.fillStyle = '#006618';
        ctx.fillText('$'+points[points.length-1].toFixed(1), w-60, zeroY - (points[points.length-1]/maxV)*(zeroY-pad) - 6);
      }
    }
  }).catch(e => {
    $('analytics-content').textContent = 'Failed to load: '+e;
  });
}
// Auto-refresh analytics every 2 min if open
setInterval(() => { if (analyticsOpen) { analyticsLoaded = false; loadAnalytics(); } }, 120000);

'''
if script_end in content:
    content = content.replace(script_end, analytics_js + script_end)
    changes += 1
    print("3. Added analytics JS with P&L chart, strategy perf, daily/weekly breakdown")

with open("/Users/ioio/octobot/templates/index.html", "w") as f:
    f.write(content)

print(f"Applied {changes} UI changes")
