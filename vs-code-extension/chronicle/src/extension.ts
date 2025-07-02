// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let logFilePath: string;
let activeChronicleDisposables: vscode.Disposable[] = [];
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Setup log file
  console.log("Chronicle activated");
  const activateCommand = vscode.commands.registerCommand('chronicle.activateChronicle', () => {
    const logFolder = context.globalStorageUri.fsPath;
    fs.mkdirSync(logFolder, { recursive: true });
    logFilePath = path.join(logFolder, 'activity-log.json');

    console.log("📁 Chronicle logging activated at:", logFilePath);

    const log = (type: string, file: string) => {
      const entry = {
        type,
        file,
        timestamp: new Date().toISOString()
      };
      fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n');
    };
    const openLogCommand = vscode.commands.registerCommand('chronicle.openLog', () => {
      vscode.workspace.openTextDocument(logFilePath).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    });
    const deactivateCommand = vscode.commands.registerCommand('chronicle.deactivateChronicle', () => {
      if (activeChronicleDisposables.length === 0) {
        vscode.window.showWarningMessage("Chronicle is not active.");
        return;
      }

      for (const disposable of activeChronicleDisposables) {
        disposable.dispose();
      }
      activeChronicleDisposables = [];

      vscode.window.showInformationMessage("🛑 Chronicle logging has been deactivated.");
    });
    context.subscriptions.push(deactivateCommand);
    context.subscriptions.push(openLogCommand);
    context.subscriptions.push(activateCommand);

    activeChronicleDisposables.push(
      vscode.workspace.onDidOpenTextDocument(doc => {
        if (doc.uri.scheme === 'file') log('OPEN', doc.fileName);
      }),
      vscode.workspace.onDidCloseTextDocument(doc => {
        if (doc.uri.scheme === 'file') log('CLOSE', doc.fileName);
      }),
      vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.uri.scheme === 'file') log('SAVE', doc.fileName);
      })
    );
    // Watch for file create/delete
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidCreate((uri) => {
      if (uri.scheme === 'file') log('CREATE', uri.fsPath);
    });

    watcher.onDidDelete((uri) => {
      if (uri.scheme === 'file') log('DELETE', uri.fsPath);
    });
    watcher.onDidChange((uri) => {
      if (uri.scheme === 'file') log('CHANGE', uri.fsPath);
    });
    activeChronicleDisposables.push(watcher);
  });
}
// This method is called when your extension is deactivated
export function deactivate() {
  console.log("Chronicle deactivated");
  // Cleanup if needed
  // For example, you might want to close watchers or connections
  // Currently, no cleanup is necessary for this extension  
}
