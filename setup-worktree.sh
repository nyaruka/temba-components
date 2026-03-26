#!/bin/bash

# Sets up a temba-components worktree for development.
# Ensures the devcontainer is built/running and installs dependencies.
#
# Usage: ./setup-worktree.sh

set -e

CONTAINER_NAME="temba-components"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_NAME="$(basename "$SCRIPT_DIR")"

# Ensure the devcontainer is running, build if needed
if ! docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q true; then
    # Remove stopped container if it exists (stale mounts, etc.)
    docker rm "$CONTAINER_NAME" 2>/dev/null || true

    echo "Container '$CONTAINER_NAME' is not running — starting devcontainer..."
    devcontainer up --workspace-folder "$SCRIPT_DIR"
fi

# Install deps into a shared directory, then symlink into the worktree.
# This avoids a per-worktree pnpm install (~20s) on every new workspace.
docker exec "$CONTAINER_NAME" bash -c '
    WORKTREE_DIR="/workspaces/worktrees/temba-components/'"$WORKSPACE_NAME"'"
    DEPS_DIR="/workspaces/worktrees/.deps/temba-components"
    mkdir -p "$DEPS_DIR"

    # Install into shared deps dir if not done or lockfile has changed
    LOCK_HASH=$(md5sum "$WORKTREE_DIR/pnpm-lock.yaml" | cut -d" " -f1)
    CACHED_HASH=$(cat "$DEPS_DIR/.lock-hash" 2>/dev/null || echo "")
    if [ "$LOCK_HASH" != "$CACHED_HASH" ]; then
        echo "Installing shared dependencies..."
        cp "$WORKTREE_DIR/package.json" "$WORKTREE_DIR/pnpm-lock.yaml" "$DEPS_DIR/"
        cd "$DEPS_DIR"
        pnpm install
        echo "$LOCK_HASH" > "$DEPS_DIR/.lock-hash"
    fi

    # Symlink node_modules into the worktree
    target="$WORKTREE_DIR/node_modules"
    if [ -L "$target" ] && [ "$(readlink "$target")" = "$DEPS_DIR/node_modules" ]; then
        : # already symlinked
    else
        rm -rf "$target"
        ln -s "$DEPS_DIR/node_modules" "$target"
    fi

    echo "Worktree '\'''"$WORKSPACE_NAME"''\'' ready for development"
'
