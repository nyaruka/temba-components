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

# Install deps if needed (pnpm store is shared via Docker volume, so installs are fast)
docker exec "$CONTAINER_NAME" bash -c '
    WORKTREE_DIR="/workspaces/worktrees/temba-components/'"$WORKSPACE_NAME"'"
    cd "$WORKTREE_DIR"

    if [ ! -d "node_modules/lit" ]; then
        echo "Installing dependencies..."
        pnpm install
    fi

    echo "Worktree '\'''"$WORKSPACE_NAME"''\'' ready for development"
'
