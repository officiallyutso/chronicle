import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface TerminalLog {
    timestamp: number;
    command: string;
    cwd: string;
    output: string[];
    exitCode?: number;
    error?: string;
}

let shell: string = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
let logFilePath: string;
let inputBuffer = '';


export function initTerminalLogging(context: vscode.ExtensionContext) {
    const logFolder = path.join(context.globalStorageUri.fsPath, 'terminal');
    fs.mkdirSync(logFolder, { recursive: true });
    logFilePath = path.join(logFolder, 'terminal-history.json');

    const logs: TerminalLog[] = [];

    const pty: vscode.Pseudoterminal = {
        onDidWrite: new vscode.EventEmitter<string>().event,
        open: () => {
            ptyEmitter.fire(`${process.cwd()} > `);
        },

        close: () => { },

        handleInput: (data: string) => {
            if (data === '\r') {
                // User pressed Enter → run command
                const trimmed = inputBuffer.trim();
                if (trimmed === '') {
                    ptyEmitter.fire('\r\n');
                    inputBuffer = '';
                    return;
                }

                const log: TerminalLog = {
                    timestamp: Date.now(),
                    command: trimmed,
                    cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
                    output: []
                };

                const proc = require('child_process').spawn(trimmed, {
                    shell: true,
                    cwd: log.cwd
                });

                proc.stdout.on('data', (data: Buffer) => {
                    const out = data.toString();
                    ptyEmitter.fire(out);
                    log.output.push(out);
                });

                proc.stderr.on('data', (data: Buffer) => {
                    const err = data.toString();
                    ptyEmitter.fire(err);
                    log.output.push(err);
                    log.error = err;
                });

                proc.on('close', (code: number) => {
                    log.exitCode = code;
                    saveLog(log);
                    if (code !== 0) {
                        vscode.window.showErrorMessage(`Command failed: ${trimmed}`);
                    }
                    // Add prompt again
                    ptyEmitter.fire('\r\n> ');
                });

                inputBuffer = '';
            } else if (data === '\u0003') {
                // Ctrl+C
                ptyEmitter.fire('^C\r\n> ');
                inputBuffer = '';
            } else if (data === '\u007F') {
                // Backspace
                inputBuffer = inputBuffer.slice(0, -1);
                ptyEmitter.fire('\b \b');
            } else {
                inputBuffer += data;
                ptyEmitter.fire(data); // echo to terminal
            }
        }

    };

    const ptyEmitter = new vscode.EventEmitter<string>();
    const terminal = vscode.window.createTerminal({
        name: "Chronicle Shell",
        pty
    });

    context.subscriptions.push(terminal);

    vscode.window.showInformationMessage("Chronicle Shell ready. Open it via Terminal > Chronicle Shell");

    terminal.show();
}

function saveLog(entry: TerminalLog) {
    const content = fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf8') : '[]';
    const json = JSON.parse(content);
    json.push(entry);
    fs.writeFileSync(logFilePath, JSON.stringify(json, null, 2));
}
