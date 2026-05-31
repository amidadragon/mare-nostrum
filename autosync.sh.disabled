#!/usr/bin/env bash
# autosync.sh - Bidirectional git sync for Mare Nostrum
# Pulls from origin every INTERVAL seconds AND pushes any local changes.
# Drop-in replacement for the one-way octogodz-autopush.sh daemon.
#
# Usage:
#   chmod +x autosync.sh
#   ./autosync.sh                    # run in foreground
#   nohup ./autosync.sh > autosync.log 2>&1 &   # run in background
#
# Stop: kill the process (ps aux | grep autosync.sh)

set -u

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANCH="${BRANCH:-lod-world}"
INTERVAL="${INTERVAL:-20}"
AUTHOR_NAME="${AUTHOR_NAME:-Mare Nostrum Autosync}"
AUTHOR_EMAIL="${AUTHOR_EMAIL:-autosync@marenostrum.local}"

cd "$REPO_DIR" || { echo "[autosync] cannot cd to $REPO_DIR"; exit 1; }

echo "[autosync] repo=$REPO_DIR branch=$BRANCH interval=${INTERVAL}s"

sync_once() {
  # 1. Pull remote changes (Claude's commits land here)
    git fetch origin "$BRANCH" --quiet 2>/dev/null || return 1
      LOCAL="$(git rev-parse HEAD 2>/dev/null)"
        REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null)"
          if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
              # merge with --ff-only; if fails, stash local + rebase
                  if ! git pull --ff-only origin "$BRANCH" --quiet 2>/dev/null; then
                        git stash push -u -m "autosync-stash-$(date +%s)" --quiet 2>/dev/null
                              git pull --rebase origin "$BRANCH" --quiet 2>/dev/null
                                    git stash pop --quiet 2>/dev/null || true
                                        fi
                                            echo "[autosync] pulled $(git log --oneline -1)"
                                              fi

                                                # 2. Push local changes (any edits you make land on GitHub)
                                                  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
                                                      git add -A
                                                          GIT_AUTHOR_NAME="$AUTHOR_NAME" GIT_AUTHOR_EMAIL="$AUTHOR_EMAIL" \
                                                              GIT_COMMITTER_NAME="$AUTHOR_NAME" GIT_COMMITTER_EMAIL="$AUTHOR_EMAIL" \
                                                                    git commit -m "autosync: $(date '+%Y-%m-%d %H:%M:%S')" --quiet 2>/dev/null
                                                                        git push origin "$BRANCH" --quiet 2>/dev/null && echo "[autosync] pushed local changes"
                                                                          fi
                                                                          }

                                                                          trap 'echo "[autosync] stopping"; exit 0' INT TERM

                                                                          while true; do
                                                                            sync_once
                                                                              sleep "$INTERVAL"
                                                                              done
                                                                              