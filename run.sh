#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_NAME="$(basename "$SCRIPT_DIR")"
CONTAINER_DIR="/workspaces/worktrees/temba-components/$WORKSPACE_NAME"

docker exec -w "$CONTAINER_DIR" -it temba-components sh -c 'lsof -ti:3010 | xargs kill -9 2>/dev/null; pnpm '"$*"
