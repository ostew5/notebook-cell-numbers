const fs = require("node:fs/promises");
const path = require("node:path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const root = path.resolve(__dirname, "..");
  const workspace = path.join(root, ".vscode-test", "verso-workspace");
  await fs.mkdir(path.join(workspace, ".vscode"), { recursive: true });
  await fs.copyFile(path.join(__dirname, "fixtures", "verso-smoke.verso"), path.join(workspace, "verso-smoke.verso"));
  await fs.writeFile(path.join(workspace, ".vscode", "settings.json"), JSON.stringify({
    ...(process.env.VERSO_DOTNET_PATH ? { "verso.dotnetPath": process.env.VERSO_DOTNET_PATH } : {}),
  }));
  await runTests({
    version: process.env.VSCODE_VERSION || "stable",
    vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH || undefined,
    extensionDevelopmentPath: root,
    extensionTestsPath: path.join(__dirname, "verso.js"),
    launchArgs: [
      workspace, "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes",
      "--user-data-dir", path.join(root, ".vscode-test", "user-data"),
      "--extensions-dir", path.join(root, ".vscode-test", "extensions"),
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
