# Development Data Management

When working with the Temba Components development server, demo flows and API data files are stored outside the project directory to allow for easier iteration without affecting the committed defaults.

## How It Works

- **External Directory**: Development data is stored in `/tmp/temba-dev-data/`
- **Automatic Setup**: When you start the dev server, it automatically copies default files to the external directory if they don't exist
- **Fallback Logic**: The server will use external files when available, but fall back to project defaults if not found
- **Persistence**: Changes persist during development sessions but won't survive container rebuilds

## Directory Structure

```
/tmp/temba-dev-data/
├── flows/          # Modified flow files
│   ├── food-order.json
│   └── sample-flow.json
└── api/            # Modified API response files
    ├── groups.json
    ├── labels.json
    ├── fields.json
    └── ... (15 total API files)
```

## Available Commands

### `yarn dev-data:status`

Shows the current state of development data:

```bash
yarn dev-data:status
```

### `yarn dev-data:copy` / `yarn dev-data:sync`

Copies changes from development directory back to the project:

```bash
yarn dev-data:copy
```

This is useful when you want to commit your development changes.

### `yarn dev-data:reset` / `yarn dev-data:wipe`

Wipes development data and restores from project defaults:

```bash
yarn dev-data:reset
```

This is useful when you want to start fresh or undo experimental changes.

## Typical Workflow

1. **Start Development**: `yarn start`

   - Server automatically sets up external data directory with defaults

2. **Make Changes**: Edit flows or modify API responses through the application

   - Changes are saved to `/tmp/temba-dev-data/`

3. **Check Status**: `yarn dev-data:status`

   - See what files are in development vs project directories

4. **Commit Changes** (if desired): `yarn dev-data:copy`

   - Copies your changes back to the project for committing

5. **Reset When Needed**: `yarn dev-data:reset`
   - Start fresh with default data

## File Locations

- **Project Flows**: `demo/data/flows/`
- **Project API**: `static/api/`
- **Development Flows**: `/tmp/temba-dev-data/flows/`
- **Development API**: `/tmp/temba-dev-data/api/`

## Notes

- Development data doesn't survive container rebuilds
- Always use `yarn dev-data:copy` before committing if you want to keep changes
- The server prioritizes development files over project defaults when both exist
- You can manually edit files in `/tmp/temba-dev-data/` if needed
