# Claude Code Instructions

## Running Tests

All tests must be run inside the devcontainer to ensure screenshot test consistency. The devcontainer name is workspace-specific using the pattern `temba-components-{workspace}` where `{workspace}` is the basename of the workspace directory (e.g., `lisbon`).

### Test Commands

Run tests inside the devcontainer using docker exec:

```bash
# Run all tests
docker exec -it temba-components-{workspace} yarn test

# Run tests in fast mode (skips screenshot comparisons)
docker exec -it temba-components-{workspace} yarn test:fast

# Run tests with coverage
docker exec -it temba-components-{workspace} yarn test:coverage

# Run a specific test file
docker exec -it temba-components-{workspace} yarn test --files test/filename.test.ts
```

Replace `{workspace}` with the actual workspace basename (the directory name this repo is cloned into).

### Why Devcontainers?

- Screenshot tests require a consistent environment (same fonts, browser version, etc.)
- The devcontainer includes Chromium with proper fonts (including emoji fonts)
- Different workspaces have separate containers to avoid conflicts

### Other Commands

```bash
# Build the project
docker exec -it temba-components-{workspace} yarn build

# Format code
docker exec -it temba-components-{workspace} yarn format

# Run validation (format + build + test with coverage)
docker exec -it temba-components-{workspace} yarn validate
```
