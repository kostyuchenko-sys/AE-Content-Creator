#!/usr/bin/env bash

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_ROOT/extension/cep/AEContentConstructor"
DEST_BASE="$HOME/Library/Application Support/Adobe/CEP/extensions"
DEST_DIR="$DEST_BASE/AEContentConstructor"

if [ ! -d "$SRC_DIR" ]; then
  echo "[deploy] CEP source dir not found: $SRC_DIR"
  exit 1
fi

mkdir -p "$DEST_DIR"

echo "[deploy] Sync CEP panel to: $DEST_DIR"
rsync -a --delete "$SRC_DIR"/ "$DEST_DIR"/

if [ -d "$REPO_ROOT/templates" ]; then
  mkdir -p "$DEST_DIR/templates"
  echo "[deploy] Sync templates to: $DEST_DIR/templates"
  rsync -a --delete "$REPO_ROOT/templates"/ "$DEST_DIR/templates"/
fi

if [ -d "$REPO_ROOT/projects" ]; then
  mkdir -p "$DEST_DIR/projects"
  echo "[deploy] Sync projects to: $DEST_DIR/projects"
  rsync -a --delete "$REPO_ROOT/projects"/ "$DEST_DIR/projects"/
fi

echo "[deploy] Done."
