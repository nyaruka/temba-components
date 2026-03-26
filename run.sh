#!/bin/bash
docker exec -w /workspaces/temba-components -it temba-components pnpm "$@"
