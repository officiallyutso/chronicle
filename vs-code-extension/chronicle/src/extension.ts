// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type ActivityType = 'OPEN' | 'CLOSE' | 'SAVE' | 'CREATE' | 'DELETE' | 'CHANGE' | string;

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: ActivityType;
  data: any;
  category: string;
}

let logFilePath: string;
let activeChronicleDisposables: vscode.Disposable[] = [];

// Get the workspace folder name (project name) from a file path
const getProjectName = (filePath: string): string => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return 'UnknownProject';

  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    if (filePath.startsWith(folderPath)) {
      return path.basename(folderPath);
    }
  }
  return 'UnknownProject';
};

// Format timestamp to HH:MM:SS
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toTimeString().split(' ')[0];
};

// Function to log an activity event in readable format
const logEvent = (type: ActivityType, file: string, category = 'file'): void => {
  const timestamp = Date.now();
  const projectName = getProjectName(file);
  const relativePath = vscode.workspace.asRelativePath(file);
  const timeStr = formatTime(timestamp);

  const logLine = `${projectName} | ${relativePath} | ${type} | ${timeStr}\n`;
  fs.appendFileSync(logFilePath, logLine);
};

export function activate(context: vscode.ExtensionContext) {
  console.log("Chronicle activated");

  const activateCommand = vscode.commands.registerCommand('chronicle.activateChronicle', () => {
    const logFolder = context.globalStorageUri.fsPath;
    fs.mkdirSync(logFolder, { recursive: true });
    logFilePath = path.join(logFolder, 'activity-log.txt');

    console.log("📁 Chronicle logging activated at:", logFilePath);

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

    activeChronicleDisposables.push(
      vscode.workspace.onDidOpenTextDocument(doc => {
        if (doc.uri.scheme === 'file') logEvent('OPEN', doc.fileName);
      }),
      vscode.workspace.onDidCloseTextDocument(doc => {
        if (doc.uri.scheme === 'file') logEvent('CLOSE', doc.fileName);
      }),
      vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.uri.scheme === 'file') logEvent('SAVE', doc.fileName);
      })
    );

    // File system watcher for CREATE/DELETE/CHANGE
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidCreate(uri => {
      if (uri.scheme === 'file') logEvent('CREATE', uri.fsPath);
    });
    watcher.onDidDelete(uri => {
      if (uri.scheme === 'file') logEvent('DELETE', uri.fsPath);
    });
    watcher.onDidChange(uri => {
      if (uri.scheme === 'file') logEvent('CHANGE', uri.fsPath);
    });

    activeChronicleDisposables.push(watcher);

    context.subscriptions.push(activateCommand, deactivateCommand, openLogCommand);
  });
  context.subscriptions.push(activateCommand);
}

export function deactivate() {
  console.log("Chronicle deactivated");
}