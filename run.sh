#!/bin/bash

CONTAINER_NAME="temba-components"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_NAME="$(basename "$SCRIPT_DIR")"
CONTAINER_DIR="/workspaces/worktrees/temba-components/$WORKSPACE_NAME"

# Ensure the devcontainer is running, build if needed
if ! docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q true; then
    if docker inspect "$CONTAINER_NAME" &>/dev/null; then
        echo "Container '$CONTAINER_NAME' is stopped — restarting..."
        docker start "$CONTAINER_NAME"
    else
        echo "Container '$CONTAINER_NAME' not found — building devcontainer..."
        devcontainer up --workspace-folder "$SCRIPT_DIR"
    fi
fi

docker exec -w "$CONTAINER_DIR" -it "$CONTAINER_NAME" sh -c 'lsof -ti:3010 | xargs kill -9 2>/dev/null; pnpm '"$*"
