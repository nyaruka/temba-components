# Claude Code Instructions

All build/test commands must be run inside the devcontainer to ensure consistency. The container should be named `temba-components-{workspace}` where `{workspace}` is the basename of the workspace directory (e.g., `temba-components-dublin`).

## Starting the Devcontainer

Before running any commands, ensure the devcontainer is running:

```bash
# Check if container exists and is running
docker ps --format "{{.Names}}" | grep temba-components-{workspace}

# If not running, check if it exists but is stopped
docker ps -a --format "{{.Names}}" | grep temba-components-{workspace}

# If stopped, start it
docker start temba-components-{workspace}

# If it doesn't exist, create and rename it
devcontainer up --workspace-folder .
docker rename $(docker ps -l --format "{{.Names}}") temba-components-{workspace}

# After creating a new container, install dependencies
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn install
```

Replace `{workspace}` with the actual workspace basename (e.g., `dublin`).

## Running Tests

```bash
# Run all tests
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn test

# Run tests in fast mode (skips screenshot comparisons)
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn test:fast

# Run tests with coverage
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn test:coverage

# Run a specific test file
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn test --files test/filename.test.ts
```

## Making Commits

Since this is a git worktree, git commands must run from the host. Run pre-commit checks inside the container first, then commit from the host:

```bash
# Run pre-commit checks inside container
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn format
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn build

# Commit from host (use --no-verify since hooks can't run natively)
git add <files>
git commit --no-verify -m "message"
git push origin <branch>
```

## Other Commands

```bash
# Build the project
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn build

# Format code
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn format

# Run validation (format + build + test with coverage)
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn validate
```

## Why Devcontainers?

- Screenshot tests require a consistent environment (same fonts, browser version, etc.)
- Build tools require native modules only available in the container
- The devcontainer includes Chromium with proper fonts (including emoji fonts)
- Different workspaces have separate containers to avoid conflicts
