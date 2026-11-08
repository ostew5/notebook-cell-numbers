const fs = require("node:fs/promises");
const path = require("node:path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const root = path.resolve(__dirname, "..");
  const workspace = path.join(root, ".vscode-test", "workspace");
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(path.join(workspace, "sample.testnb"), "{}");
  await fs.writeFile(path.join(workspace, "sample.customnb"), "{}");
  await fs.writeFile(path.join(workspace, "sample.ipynb"), JSON.stringify({
    cells: [
      { cell_type: "markdown", metadata: {}, source: ["# Introduction"] },
      { cell_type: "code", metadata: {}, source: ["1 + 1"], outputs: [], execution_count: null },
    ],
    metadata: {}, nbformat: 4, nbformat_minor: 5,
  }));
  await runTests({
    version: process.env.VSCODE_VERSION || "stable",
    vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH || undefined,
    extensionDevelopmentPath: [root, path.join(__dirname, "fixture-extension")],
    extensionTestsPath: path.join(__dirname, "suite.js"),
    launchArgs: [
      workspace,
      "--disable-extensions",
      "--disable-workspace-trust",
      "--skip-welcome",
      "--skip-release-notes",
      "--user-data-dir", path.join(root, ".vscode-test", "user-data"),
      "--extensions-dir", path.join(root, ".vscode-test", "extensions"),
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
