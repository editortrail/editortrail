# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EditorTrail is a VSCode/Cursor extension that allows users to save and restore tab configurations across projects, repos, and branches. It provides a custom activity bar view to manage saved tab states with drag-and-drop reordering support.

## Build and Development Commands

### Setup
```bash
npm install
```

### Development
```bash
# Build the extension
make build
# Or: npm run compile

# Watch mode (rebuilds on changes)
make watch
# Or: npm run watch

# Type checking only
make typecheck
# Or: npm run check-types
```

### Testing and Quality
```bash
# Run tests
make test
# Or: npm test

# Lint code
make lint
# Or: npm run lint

# Format code with Biome
make format
# Or: npm run format

# Check formatting without modifying
make format-check
# Or: npm run format:check

# Run all checks (format-check, lint, typecheck, build)
make all
```

### Packaging
```bash
# Create .vsix package for distribution
make package

# Clean build artifacts
make clean
```

### Manual Testing
Open `src/extension.ts` and press `F5` to launch the extension in a new VSCode window for testing.

## Architecture

### Core Components

The extension follows a modular architecture with clear separation of concerns:

- **extension.ts**: Main entry point that registers all commands and initializes the tree view. Handles command registration for save/restore/rename/delete operations and manages the lifecycle of the extension.

- **savedTabsProvider.ts**: Implements the tree data provider and drag-and-drop controller for the custom tree view in the activity bar. Provides hierarchical display of saved tab states and their files. Supports reordering via drag-and-drop by updating the `order` property.

- **tabOperations.ts**: Core logic for capturing and restoring tab states. Handles serialization of tab groups, view columns, active states, pinned states, and scroll positions. Supports various VSCode tab input types (text, diff, custom, notebook).

- **storageManager.ts**: Manages persistence of tab states and history entries. Stores data in `~/.editortrail/tabs/projects/<project-name>/state.json`. Provides CRUD operations for saved tab states.

- **fileUtils.ts**: Low-level file system utilities for JSON/JSONL operations. Handles directory creation, file existence checks, and safe file I/O.

- **projectUtils.ts**: Determines unique project identifiers from git remote URLs or workspace folder names. Also retrieves current git branch for automatic naming.

- **types.ts**: TypeScript interfaces for SavedTab, SavedTabGroup, SavedTabState, and related data structures.

### Data Flow

1. User saves tabs: TabOperations captures current editor state -> StorageManager persists to disk -> SavedTabsProvider refreshes view
2. User restores tabs: TreeView item selected -> TabOperations closes all editors and reopens from saved state
3. Drag-and-drop reorder: SavedTabsProvider updates order properties -> StorageManager saves all states

### Storage Structure

Tab states are stored per-project in `~/.editortrail/tabs/projects/<project-name>/state.json`. Project names are derived from git remote URLs (e.g., `github.com-editortrail-editortrail`) or workspace folder names. The state file contains a `TabStateCollection` with an array of `SavedTabState` objects.

## Technical Notes

- Uses esbuild for bundling with watch mode support via `esbuild.js`
- TypeScript configured with strict mode, Node16 modules, ES2022 target
- Formatting enforced via Biome (indent width: 2, line width: 100, double quotes)
- VSCode engine version pinned to `^1.99.0` for Cursor compatibility
- All source files use `.js` extensions in imports despite being TypeScript (Node16 module resolution)
