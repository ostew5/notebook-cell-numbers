const assert = require("node:assert/strict");
const vscode = require("vscode");
const { CellNumberProvider } = require("../out/CellNumberProvider");
const { NotebookOutlineProvider } = require("../out/CellTocProvider");

async function eventually(predicate, message) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(message);
}

exports.run = async function () {
  let passed = 0;
  async function test(name, run) {
    console.log(`RUN ${name}`);
    await run();
    passed++;
    console.log(`PASS ${name}`);
  }
  const extension = vscode.extensions.getExtension("ostew5.notebook-cell-numbers");
  assert.ok(extension);
  const workspace = vscode.workspace.workspaceFolders[0].uri;
  const numbers = new CellNumberProvider();
  const outline = new NotebookOutlineProvider();
  const cancellation = new vscode.CancellationTokenSource();
  const config = vscode.workspace.getConfiguration("notebookCellNumbers");
  const settings = ["startFrom", "format", "alignment", "enabled"];
  const previous = Object.fromEntries(settings.map((key) => [key, config.inspect(key)?.workspaceValue]));
  const items = (cell) => numbers.provideCellStatusBarItems(cell, cancellation.token);

  try {
    for (const key of settings) await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);

    await test("automatically activates with only a non-Jupyter notebook open", async () => {
      const document = await vscode.workspace.openNotebookDocument(vscode.Uri.joinPath(workspace, "sample.testnb"));
      await vscode.window.showNotebookDocument(document);
      // Deliberately do not call extension.activate() or an extension command.
      await eventually(() => extension.isActive, "Extension did not activate for a non-Jupyter notebook");
    });

    await test("outline visibility depends on the notebook editor, not the file suffix", () => {
      const view = extension.packageJSON.contributes.views.explorer.find((entry) => entry.id === "notebookOutline");
      assert.equal(view.when, "activeEditor == workbench.editors.notebookEditor");
    });

    for (const [filename, codeLabel] of [
      ["sample.testnb", "Cell 2: Example"],
      ["sample.ipynb", "Cell 2"],
    ]) {
      await test(`numbers and outlines code and markdown cells in ${filename}`, async () => {
        const document = await vscode.workspace.openNotebookDocument(vscode.Uri.joinPath(workspace, filename));
        await vscode.window.showNotebookDocument(document);
        await eventually(() => vscode.window.activeNotebookEditor?.notebook === document, "Notebook did not become active");
        assert.equal(document.cellCount, 2);
        assert.deepEqual(outline.getChildren(), document.getCells());
        assert.equal(items(document.cellAt(0))[0].text, "Cell 1");
        assert.equal(items(document.cellAt(1))[0].text, codeLabel);
        assert.equal(outline.getTreeItem(document.cellAt(0)).label, "Cell 1: Introduction");
        assert.equal(outline.getTreeItem(document.cellAt(1)).label, codeLabel);
        await vscode.commands.executeCommand("notebookCellNumbers.peekCell", 1);
        assert.equal(vscode.window.activeNotebookEditor.selection.start, 1);
      });
    }

    await test("configuration applies to cells of a non-Jupyter notebook", async () => {
      const document = await vscode.workspace.openNotebookDocument(vscode.Uri.joinPath(workspace, "sample.testnb"));
      await vscode.window.showNotebookDocument(document);
      await config.update("startFrom", 0, vscode.ConfigurationTarget.Workspace);
      await config.update("format", "[{n}]", vscode.ConfigurationTarget.Workspace);
      await config.update("alignment", "right", vscode.ConfigurationTarget.Workspace);
      assert.equal(items(document.cellAt(0))[0].text, "[0]");
      assert.equal(items(document.cellAt(0))[0].alignment, vscode.NotebookCellStatusBarAlignment.Right);
      assert.equal(outline.getTreeItem(document.cellAt(1)).label, "Cell 1: Example");
      await config.update("enabled", false, vscode.ConfigurationTarget.Workspace);
      assert.deepEqual(items(document.cellAt(0)), []);
      for (const key of settings) await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
    });

    await test("cell numbers follow insertions and title metadata updates", async () => {
      const document = vscode.window.activeNotebookEditor.notebook;
      const edit = new vscode.WorkspaceEdit();
      edit.set(document.uri, [vscode.NotebookEdit.insertCells(0, [
        new vscode.NotebookCellData(vscode.NotebookCellKind.Code, "0", "javascript"),
      ])]);
      assert.ok(await vscode.workspace.applyEdit(edit));
      assert.equal(items(document.cellAt(2))[0].text, "Cell 3: Example");
      assert.equal(outline.getChildren().length, 3);
      const titleEdit = new vscode.WorkspaceEdit();
      titleEdit.set(document.uri, [vscode.NotebookEdit.updateCellMetadata(2, { title: "Renamed" })]);
      assert.ok(await vscode.workspace.applyEdit(titleEdit));
      assert.equal(items(document.cellAt(2))[0].text, "Cell 3: Renamed");
      assert.equal(outline.getTreeItem(document.cellAt(2)).label, "Cell 3: Renamed");
    });

    await test("custom webview editors expose no native notebook cells (Verso integration boundary)", async () => {
      if (vscode.window.activeNotebookEditor?.notebook.isDirty) {
        await vscode.commands.executeCommand("workbench.action.files.revert");
      }
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      await vscode.commands.executeCommand("vscode.openWith", vscode.Uri.joinPath(workspace, "sample.customnb"), "cell-numbers-test.custom");
      await eventually(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputCustom, "Custom editor did not become active");
      assert.equal(vscode.window.activeNotebookEditor, undefined);
      assert.deepEqual(outline.getChildren(), []);
    });

    console.log(`${passed} integration tests passed`);
  } finally {
    if (vscode.window.activeNotebookEditor?.notebook.isDirty) {
      await vscode.commands.executeCommand("workbench.action.files.revert");
    }
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    for (const key of settings) await config.update(key, previous[key], vscode.ConfigurationTarget.Workspace);
    cancellation.dispose();
    numbers.dispose();
    outline.dispose();
  }
};
