const vscode = require("vscode");

exports.activate = function (context) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer("cell-numbers-test", {
      deserializeNotebook() {
        const heading = new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, "# Introduction", "markdown");
        const code = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, "1 + 1", "javascript");
        code.metadata = { title: "Example" };
        return new vscode.NotebookData([heading, code]);
      },
      serializeNotebook() { return Buffer.from("{}"); },
    }),
    vscode.window.registerCustomEditorProvider("cell-numbers-test.custom", {
      resolveCustomTextEditor(_document, panel) {
        panel.webview.html = "<!doctype html><html><body>Custom editor test fixture</body></html>";
      },
    })
  );
};
