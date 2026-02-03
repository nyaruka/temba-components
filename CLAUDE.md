# Claude Code Instructions

## Running Tests

All tests must be run inside the devcontainer to ensure screenshot test consistency. The container should be named `temba-components-{workspace}` where `{workspace}` is the basename of the workspace directory (e.g., `temba-components-dublin`).

### Starting the Devcontainer

Before running tests, ensure the devcontainer is running:

```bash
# Check if container exists
docker ps -a --format "{{.Names}}" | grep temba-components-{workspace}

# If not, create and rename it
devcontainer up --workspace-folder .
docker rename $(docker ps -l --format "{{.Names}}") temba-components-{workspace}
```

### Test Commands

Run tests inside the devcontainer using docker exec:

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

Replace `{workspace}` with the actual workspace basename (e.g., `dublin`).

### Why Devcontainers?

- Screenshot tests require a consistent environment (same fonts, browser version, etc.)
- The devcontainer includes Chromium with proper fonts (including emoji fonts)
- Different workspaces have separate containers to avoid conflicts

### Other Commands

```bash
# Build the project
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn build

# Format code
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn format

# Run validation (format + build + test with coverage)
docker exec -w /workspaces/{workspace} temba-components-{workspace} yarn validate
```
