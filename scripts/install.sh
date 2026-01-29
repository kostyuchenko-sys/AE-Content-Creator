#!/usr/bin/env bash

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "[install] .git/hooks not found. Run from a git clone."
  exit 1
fi

echo "[install] Installing git hooks"
cp "$REPO_ROOT/scripts/hooks/post-merge" "$HOOKS_DIR/post-merge"
cp "$REPO_ROOT/scripts/hooks/post-checkout" "$HOOKS_DIR/post-checkout"
chmod +x "$HOOKS_DIR/post-merge" "$HOOKS_DIR/post-checkout"

echo "[install] Running initial deploy"
"$REPO_ROOT/scripts/deploy.sh"

echo "[install] Done."
