const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vscode = require("vscode");
const { NotebookOutlineProvider } = require("../out/CellTocProvider");

async function withTimeout(promise, description) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out: ${description}`)), 90000); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

exports.run = async function () {
  const verso = vscode.extensions.getExtension("datafication.verso-notebook");
  assert.ok(verso, "Install Datafication.verso-notebook into .vscode-test/extensions before running this suite");
  const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "verso-smoke.verso");
  await withTimeout(vscode.commands.executeCommand("vscode.openWith", uri, "verso.blazorNotebook"), "opening the real Verso editor");
  assert.ok(verso.isActive, "The installed Verso extension must activate");
  assert.ok(vscode.extensions.getExtension("ostew5.notebook-cell-numbers")?.isActive, "Notebook Cell Numbers must also be active");
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  assert.ok(tab?.input instanceof vscode.TabInputCustom);
  assert.equal(tab.input.viewType, "verso.blazorNotebook");

  // These tools belong to the installed Verso extension, not a fixture.
  const cells = await withTimeout(vscode.lm.invokeTool("verso_listCells", { input: {} }), "listing cells from the real Verso host");
  const cellText = cells.content.map((part) => part.value || "").join("\n");
  assert.match(cellText, /2 cell\(s\)/);
  assert.match(cellText, /Verso compatibility test/);
  const execution = await withTimeout(vscode.lm.invokeTool("verso_runCell", { input: { cellNumber: 2 } }), "executing a C# cell in Verso");
  const executionText = execution.content.map((part) => part.value || "").join("\n");
  assert.match(executionText, /Cell 2: completed/);
  assert.match(executionText, /Verso integration test/);

  const outline = new NotebookOutlineProvider();
  try {
    const nativeNotebookCount = vscode.workspace.notebookDocuments.length;
    assert.equal(vscode.window.activeNotebookEditor, undefined);
    assert.equal(nativeNotebookCount, 0);
    assert.deepEqual(outline.getChildren(), []);
    const report = {
      vscodeVersion: vscode.version,
      versoVersion: verso.packageJSON.version,
      editorType: tab.input.viewType,
      cells: cellText,
      execution: executionText,
      nativeNotebookCount,
      nativeOutlineEntries: outline.getChildren().length,
      conclusion: "Real Verso notebook loads and executes; its cells are unavailable through the native VS Code notebook API.",
    };
    await fs.writeFile(path.resolve(__dirname, "..", ".vscode-test", "verso-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    outline.dispose();
  }
};
