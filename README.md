# editortrail

EditorTrail allow you to switch context and keep track of your work across projects/repo/branches.

## Features

- Save all current tabs and restore them later

## Usage

```bash
npm install
# Get the vsix file
make package
```

In VSCode/Cursor, `cmd + shift + p` and search for `Extensions: Install from VSIX...` and select the vsix file you just created.

## Known Issues

- VSCode version is `^1.99.0` because cursor is still using [1.99.3](https://forum.cursor.com/t/cursor-still-on-vscode-1-99-3-update-plans/135066/13)

## License

MIT