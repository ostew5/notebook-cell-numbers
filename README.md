# Notebook Cell Numbers

> Persistent cell numbers, editable titles, and a Notebook Outline sidebar for every VS Code notebook.

No more manually counting cells or hunting for the right one — each cell displays its position directly in the status bar, and a sidebar outline lets you jump anywhere instantly.

Works on VS Code, VSCodium, and Code OSS.

---

## Features

- **Persistent cell numbers** — shown on every cell, both code and markdown
- **Editable cell titles** — set a custom label per cell, stored in notebook metadata
- **Notebook Outline** — sidebar panel listing all cells with language icons, execution status, content preview on hover, and click-to-navigate
- **Go to Cell command** — jump to any cell by number or title from the command palette
- **Universal** — works with Jupyter notebooks, interactive windows, and other native VS Code notebook types
- **Auto-updating** — numbers stay correct when cells are added, removed, or reordered
- **Fully configurable** — control the format string, starting index, and alignment

---

## Notebook Outline

The **Notebook Outline** panel appears in the Explorer sidebar whenever a native VS Code notebook editor is active, regardless of the file extension. It lists every cell with:

- **Language icons** — code cells show the icon for their language (Python, R, TypeScript, etc.), sourced from your active file icon theme
- **Execution status** — once a cell has been run, the icon switches to a coloured status indicator matching the notebook's own style: green check for success, red error for failure
- **Execution order** — the `[n]` run count is shown in the description alongside the first line of the cell
- **Markdown headings** — markdown cell labels strip syntax characters so `## Introduction` appears as `Introduction`
- **Hover preview** — hover any entry to see a syntax-highlighted preview of the full cell content
- **Click to navigate** — clicking an entry scrolls the notebook to that cell

---

## Commands

| Command | Description |
|---|---|
| `Notebook Cell Numbers: Go to Cell...` | Jump to any cell by number or title |
| `Notebook Cell Numbers: Edit Cell Title` | Set a custom title for the focused cell |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `notebookCellNumbers.enabled` | `true` | Show or hide cell numbers |
| `notebookCellNumbers.startFrom` | `1` | Starting number (`0` for zero-indexed) |
| `notebookCellNumbers.format` | `Cell {n}` | Label format — `{n}` is replaced with the cell number |
| `notebookCellNumbers.alignment` | `left` | Position in the status bar: `left` or `right` |

### Format examples

| Format string | Output |
|---|---|
| `Cell {n}` | Cell 1, Cell 2, Cell 3 |
| `In [{n}]` | In [1], In [2], In [3] |
| `#{n}` | #1, #2, #3 |
| `[{n}]` | [1], [2], [3] |

---

## Installation from source

```bash
# Clone the repository
git clone https://github.com/ostew5/notebook-cell-numbers
cd notebook-cell-numbers

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package as .vsix (requires vsce)
npx @vscode/vsce package

# Install in VS Code
# Extensions panel → ⋯ menu → "Install from VSIX…"
```

---

## How it works

The extension uses VS Code's `NotebookCellStatusBarItemProvider` API to inject a label into every cell's built-in status bar — no custom renderers, no webviews, no DOM manipulation. Cell titles are stored in notebook metadata so they persist with the file. The Notebook Outline is a native VS Code tree view that re-renders automatically as the notebook changes. Language icons are resolved at runtime by reading the active file icon theme's JSON definition, so any SVG-based theme works without configuration.

### Custom editor compatibility

Support requires a native VS Code notebook editor. Editors implemented as custom webviews do not expose cells through VS Code's notebook API. In particular, Verso currently registers a custom editor (`verso.blazorNotebook`) for `.verso` files. Changing activation events or the outline's visibility condition does not add support for that editor. Verso support needs an integration with Verso's editor; this change does not resolve issue #3.

## Automated tests

```bash
npm ci
npm test
```

Tests compile the extension and run in an isolated VS Code Extension Development Host. By default the runner downloads the stable VS Code release. Set `VSCODE_VERSION` to test a specific release, or `VSCODE_EXECUTABLE_PATH` to use an existing executable. On Linux without a display, run `xvfb-run -a npm test`.

The suite checks automatic activation without Jupyter, the outline's visibility condition, numbering and outline entries for Jupyter and a test notebook type, navigation, configuration, cell insertions, and title updates. A separate custom webview fixture checks the notebook API limitation; it does not emulate Verso or claim end-to-end Verso coverage. CI runs the same suite on pushes and pull requests. Test fixtures are excluded from the packaged extension.

### Testing the installed Verso extension

An optional smoke test opens an actual `.verso` file with the installed Verso editor, lists its cells through Verso's tools, and executes a C# cell. It requires VS Code 1.99 or later, Verso Notebook, and a compatible .NET runtime. Install Verso into the test profile using your VS Code CLI:

```bash
code --user-data-dir "$PWD/.vscode-test/user-data" \
  --extensions-dir "$PWD/.vscode-test/extensions" \
  --install-extension Datafication.verso-notebook@1.2.3

# Set these paths for your machine; omit VERSO_DOTNET_PATH if dotnet is on PATH.
VSCODE_EXECUTABLE_PATH=/path/to/code \
  VERSO_DOTNET_PATH=/path/to/dotnet npm run test:verso
```

The result is written to `.vscode-test/verso-report.json`. With Verso 1.2.3, the notebook opened as `verso.blazorNotebook` and its C# cell completed successfully, but VS Code exposed zero native notebook documents and the native outline provider returned zero entries. This test records the compatibility limitation; passing does not mean the extension supports Verso. It is separate from the default CI suite because it needs the installed third-party extension and .NET runtime.

---

## License

[MIT](LICENSE.txt)
