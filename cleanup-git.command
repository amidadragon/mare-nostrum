#!/usr/bin/env bash
# ============================================================================
# cleanup-git.command  —  Mare Nostrum: ORGANIZE & STOP THE CHAOS
# ----------------------------------------------------------------------------
# Run this ON YOUR MAC (double-click in Finder).
# Goal: one folder, one branch, no background agents wiping your work.
#
# SAFE: never deletes source code, never rewrites history, never force-pushes,
# never touches `main`. `git rm --cached` only un-TRACKS files (they stay on disk).
#
# Steps:
#   1. Stop the two background agents that were fighting you:
#        - autosync.sh  (auto-commit/push every 20s)
#        - mn-boot.applescript  (git reset --hard on boot = wipes your work)
#   2. Clear any stale git lock
#   3. Commit your current work on lod-world so nothing can wipe it
#   4. Install a strong .gitignore + un-track cruft
#   5. Print the simple daily workflow
# ============================================================================
set -u
cd "$(dirname "$0")" || exit 1
REPO="$(pwd)"
CODE_DIR="$(cd .. && pwd)"
echo "=== Mare Nostrum — Organize & Stop the Chaos ==="
echo "repo: $REPO"
echo

# --- 1. Stop the background agents -----------------------------------------
echo "[1/5] Stopping background agents..."
pkill -f "autosync.sh"       2>/dev/null && echo "  - killed autosync.sh"       || echo "  - autosync.sh not running"
pkill -f "octogodz-autopush" 2>/dev/null && echo "  - killed octogodz-autopush" || echo "  - octogodz not running"
# Neutralize so they can't restart:
[ -f "$REPO/autosync.sh" ]            && mv "$REPO/autosync.sh"            "$REPO/autosync.sh.disabled"            2>/dev/null && echo "  - disabled autosync.sh"
[ -f "$CODE_DIR/mn-boot.applescript" ] && mv "$CODE_DIR/mn-boot.applescript" "$CODE_DIR/mn-boot.applescript.disabled" 2>/dev/null && echo "  - disabled mn-boot.applescript (the boot-time hard reset)"
# Best-effort: unload any matching LaunchAgents
launchctl list 2>/dev/null | grep -iE "mare|autosync|octogodz" | awk '{print $3}' | while read -r lbl; do
  [ -n "$lbl" ] && launchctl remove "$lbl" 2>/dev/null && echo "  - unloaded launch agent: $lbl"
done
echo "  >> ALSO CHECK BY HAND: System Settings → General → Login Items."
echo "     Remove anything named 'mn-boot', 'autosync', or 'Mare Nostrum' so it can't run at login."
echo

# --- 2. Clear stale lock ----------------------------------------------------
echo "[2/5] Clearing stale git lock..."
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "  - removed .git/index.lock" || echo "  - no lock present"
echo

# --- 3. Commit current work FIRST (so nothing can wipe it) ------------------
echo "[3/5] Securing your current work on lod-world..."
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "  - current branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "lod-world" ]; then
  echo "  !! You are NOT on lod-world (the newest branch). Switch first: git checkout lod-world"
  echo "     Stopping here to be safe."
  exit 1
fi

# --- 4. .gitignore + untrack cruft ------------------------------------------
echo "[4/5] Installing .gitignore and un-tracking cruft..."
cat > .gitignore <<'EOF'
node_modules/
.DS_Store
*.swp
*.log
autosync.log
loop-log.json
.claude/settings.local.json
.claude/worktrees/
*.backup
*.backup-*
index.html.backup*
*~
dist/
*.zip
_test_*.png
render_test.txt
EOF
git rm -r --cached --quiet --ignore-unmatch \
  "index.html.backup-20260423" "index.html.backup-20260423_214850" \
  "autosync.log" "loop-log.json" "_test_cube.png" "dist" \
  "sounds/_kenney_packs/*.zip" 2>/dev/null
git add -A
git commit -m "chore: organize repo — stop autosync/mn-boot, fix SW caching, ignore cruft" \
  && echo "  - committed locally on lod-world (NOT pushed)" \
  || echo "  - nothing new to commit"
echo

# --- 5. The simple workflow -------------------------------------------------
echo "[5/5] DONE. Your simple workflow from now on:"
echo
echo "  EDIT:    work in this folder only ($REPO), on branch lod-world."
echo "  PREVIEW: double-click start-server.command → open http://localhost:8888"
echo "           (localhost never caches anymore — reload shows fresh code instantly)"
echo "  SAVE:    git add -A && git commit -m \"...\"   then   git push origin lod-world"
echo "  DEPLOY:  when you want it LIVE on GitHub Pages, tag a release:"
echo "             git tag v1.0.x && git push origin v1.0.x"
echo "           (the deploy workflow builds dist/ and publishes it)"
echo
echo "  main branch: leave it alone. Deploys come from TAGS, not from main."
echo "  Old service workers self-clear on localhost now — if you ever still see a"
echo "  stale screen: DevTools → Application → Clear site data → reload once."
echo
echo "=== Review:  git log --oneline -5   &&   git status ==="
