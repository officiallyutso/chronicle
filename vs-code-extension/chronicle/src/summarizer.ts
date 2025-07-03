import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const ollamaURL = 'http://localhost:11434/api/generate';
const model = 'llama3';

const ignored = ['node_modules', '.git', 'dist', 'build', '.next', 'out', '.vscode', 'coverage', 'logs', 'tmp', 'temp', '.cache', '.idea', '.DS_Store'];

export async function summarizeProject(context: vscode.ExtensionContext) {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return vscode.window.showErrorMessage('No workspace folder found');

    const root = workspace.uri.fsPath;
    const fileSummaries: string[] = [];
    const folderSummaries: Record<string, string[]> = {};
    const folderSummariesText: Record<string, string> = {};

    await collectAndSummarizeFiles(root, fileSummaries, folderSummaries);

    // Generate folder-level summaries using their file summaries
    for (const [folder, summaries] of Object.entries(folderSummaries)) {
        const folderPrompt = `Here is a list of files and what each of them does inside the folder '${folder}':\n\n${summaries.join('\n')}
    
Based on this, write a concise summary (4–6 lines) explaining the purpose and role of this folder in the overall project.`;
        const folderSummary = await callOllama(folderPrompt);
        folderSummariesText[folder] = folderSummary;
    }

    // Generate project-level summary using folder-level summaries
    const folderSummaryCombined = Object.entries(folderSummariesText)
        .map(([folder, summary]) => `📁 ${folder}:\n${summary}`)
        .join('\n\n');

    const projectPrompt = `Here are summaries of key folders in a project:\n\n${folderSummaryCombined}
  
Now write a high-level, concise summary (about 11–12 lines) that explains what this entire project does, its architecture, and its main purpose. Avoid repeating folder summaries verbatim.`;

    const overallSummary = await callOllama(projectPrompt);

    const fullSummary = ` Folder-Level Summaries:\n\n${folderSummaryCombined}\n\n Project Summary:\n\n${overallSummary}`;

    const doc = await vscode.workspace.openTextDocument({ content: fullSummary, language: 'markdown' });
    vscode.window.showTextDocument(doc);
}


export async function collectAndSummarizeFiles(
    dir: string,
    fileSummaries: string[],
    folderSummaries: Record<string, string[]>
) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (ignored.includes(entry.name)) continue;

        if (entry.isFile() && entry.name.match(/\.(js|ts|py|java|cs|go|rb|rs|cpp|c|json|yml|md)$/)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8').split('\n').slice(0, 80).join('\n');
                const prompt = `You are a smart code assistant. Explain what this file does in simple terms in about 3-4 lines. ${entry.name}\n\n${content}`;
                const summary = await callOllama(prompt);

                const relativePath = vscode.workspace.asRelativePath(fullPath);
                const fileLine = `### ${relativePath}\n\n${summary.trim()}`;

                fileSummaries.push(fileLine);

                const folder = path.dirname(relativePath);
                if (!folderSummaries[folder]) folderSummaries[folder] = [];
                folderSummaries[folder].push(`- **${entry.name}**: ${summary.trim()}`);
            } catch (err) {
                console.error(`Error summarizing ${entry.name}:`, err);
            }
        }
        // Skip recursion into subfolders
        // Do NOT recurse into entry.isDirectory()
    }
}


export async function callOllama(prompt: string): Promise<string> {
    const response = await fetch(ollamaURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama error: ${text}`);
    }

    const data = await response.json() as { response: string };
    return data.response.trim();


}
