// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { summarizeProject, callOllama, collectAndSummarizeFiles } from './summarizer';

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

    console.log("Chronicle logging activated at:", logFilePath);

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

      vscode.window.showInformationMessage("Chronicle logging has been deactivated.");
    });

    //#Summarization Commands
    const summarizeCommand = vscode.commands.registerCommand('chronicle.summarizeProject', () => {
      summarizeProject(context);
    });

    const summarizeCurrentFile = vscode.commands.registerCommand('chronicle.summarizeCurrentFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No file is currently open.');
        return;
      }

      const doc = editor.document;
      const filePath = doc.fileName;
      const fileName = path.basename(filePath);
      const projectName = getProjectName(filePath);

      // Limit to first 80 liness
      const content = doc.getText().split('\n').slice(0, 80).join('\n');

      const prompt = `You are a smart code assistant. Explain what this file does in simple terms in about 3-4 lines.\nProject: ${projectName}\nFile: ${fileName}\n\n${content}`;

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Summarizing ${fileName} with Ollama...`,
        cancellable: false
      }, async () => {
        try {
          const summary = await callOllama(prompt);

          const markdown = `### ${fileName}\n\n<details>\n<summary>Click to expand</summary>\n\n${summary.trim()}\n\n</details>`;
          const summaryDoc = await vscode.workspace.openTextDocument({
            content: markdown,
            language: 'markdown'
          });
          vscode.window.showTextDocument(summaryDoc);

          // Optional logging (if needed)
          fs.appendFileSync(logFilePath, `${fileName} | SUMMARY | ${formatTime(Date.now())}\n`);
        } catch (err) {
          console.error(err);
          vscode.window.showErrorMessage('Failed to get summary from Ollama.');
        }
      });
    });


    const summarizeCurrentFolder = vscode.commands.registerCommand('chronicle.summarizeCurrentFolder', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return vscode.window.showErrorMessage('No file is currently open.');

      const filePath = editor.document.uri.fsPath;
      const folderPath = path.dirname(filePath);
      const folderName = path.basename(folderPath);

      const fileSummaries: string[] = [];
      const folderSummaries: Record<string, string[]> = {};

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Summarizing all files in folder: ${folderName}`,
        cancellable: false
      }, async () => {
        await collectAndSummarizeFiles(folderPath, fileSummaries, folderSummaries);
      });

      // ---  File-by-file summary ---
      const fileSummaryMarkdown = `#File Summaries for ${folderName}\n\n${fileSummaries.join('\n\n')}`;
      const fileSummaryDoc = await vscode.workspace.openTextDocument({
        content: fileSummaryMarkdown,
        language: 'markdown'
      });
      vscode.window.showTextDocument(fileSummaryDoc, { preview: false });
      fs.appendFileSync(logFilePath, `${folderName} | SUMMARY | ${formatTime(Date.now())}\n`);

      // Flatten file-level summaries to use for generating the folder summary
      const flatFileSummaryText = Object.entries(folderSummaries)
        .flatMap(([folder, summaries]) =>
          summaries.map(summary => `${folder}/${summary}`)
        )
        .join('\n');

      // Prompt Ollama for a high-level summary of the folder
      const folderPrompt = `Below is a breakdown of what different files do in the project:\n\n${flatFileSummaryText}\n\nNow generate a high-level summary (~8-10 lines) explaining what this project (or folder) does as a whole — including its purpose, main components, and structure. Avoid repeating individual file details.`;

      let folderOverview = '';

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Giving Overview Of: ${folderName}`,
        cancellable: false
      }, async () => {
        folderOverview = await callOllama(folderPrompt);
      });
      const folderSummaryMarkdown =
        `# Project Summary\n\n${folderOverview}\n\n` +
        `---\n\n`;

      // Open the markdown as a text document
      const folderSummaryDoc = await vscode.workspace.openTextDocument({
        content: folderSummaryMarkdown,
        language: 'markdown'
      });
      vscode.window.showTextDocument(folderSummaryDoc, { preview: false });
    });


    context.subscriptions.push(summarizeCommand, summarizeCurrentFile, summarizeCurrentFolder);
    //#endregion

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