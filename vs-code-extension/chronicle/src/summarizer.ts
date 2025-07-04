import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const ollamaURL = 'http://localhost:11434/api/generate';
const model = 'llama3';

const ignored = ['node_modules', '.git', 'dist', 'build', '.next', 'out', '.vscode', 'coverage', 'logs', 'tmp', 'temp', '.cache', '.idea', '.DS_Store'];

const SYSTEM_PREFIX = `You are a helpful code summarizer. 
Avoid guessing, generalizations, or hallucinations. 
Base every summary strictly on the real source code given.`;

export async function summarizeProject(context: vscode.ExtensionContext) {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return vscode.window.showErrorMessage('No workspace folder found');

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating project summary...',
        cancellable: false
    }, async () => {
        const root = workspace.uri.fsPath;
        const projectName = path.basename(root);
        const fileSummaries: string[] = [];
        const folderSummaries: Record<string, string[]> = {};
        const folderSummariesText: Record<string, string> = {};

        await collectAndSummarizeFiles(root, fileSummaries, folderSummaries, 0, 1);

        // Generate folder summaries
        for (const [folder, summaries] of Object.entries(folderSummaries)) {
        const prompt = `${SYSTEM_PREFIX}\n\nHere is a list of files and what each does inside the folder '${folder}':\n\n${summaries.join('\n')}
        Now give a specific and concise 6–8 line summary of this folder's role in the project.`;
        const folderSummary = await callOllama(prompt);
        folderSummariesText[folder] = folderSummary.trim();
        }

        // Generate project summary
        const folderSummaryCombined = Object.entries(folderSummariesText)
        .map(([folder, summary]) => `## ${folder}\n${summary}`)
        .join('\n\n');

        const projectPrompt = `${SYSTEM_PREFIX}\n\nBelow are summaries of folders from a real software project:\n\n${folderSummaryCombined}
        Write a clear, structured 15–20 line summary that explains the actual purpose of the entire project.`;

        const projectSummary = await callOllama(projectPrompt);

        // Prepare data for backend
        const projectData = {
        projectId: `${projectName}_${Date.now()}`,
        name: projectName,
        projectSummary: projectSummary.trim(),
        fileSummaries,
        folderSummaries: folderSummariesText,
        workspacePath: root
        };

        // Send to backend
        await sendProjectToBackend(projectData);

        // Create and show the markdown file as before
        const fullMarkdown = `# Project Summary\n\n${projectSummary.trim()}\n\n---\n\n# Folder Summaries\n\n` +
        Object.entries(folderSummariesText)
            .map(([folder, summary]) => `\n${folder}\n\n${summary}\n\n`)
            .join('\n\n');

        const doc = await vscode.workspace.openTextDocument({
        content: fullMarkdown,
        language: 'markdown'
        });

        vscode.window.showTextDocument(doc, { preview: false });
    });
}

export async function collectAndSummarizeFiles(
    dir: string,
    fileSummaries: string[],
    folderSummaries: Record<string, string[]>,
    currentDepth: number = 0,
    maxDepth: number = 1
) {
    if (currentDepth > maxDepth) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        console.log(`Processing: ${fullPath}`);
        if (ignored.includes(entry.name)) continue;

        if (entry.isFile() && entry.name.match(/\.(js|cjs|ejs|ts|py|java|cs|go|rb|rs|cpp|c|json|yml|yaml|md|dart|html|css|scss|jsx|tsx|sql|sh|xml|toml|ini|env|ipynb|swift|kt|mjs|cjs|sol|vy|zok|circom|ron|move|aleo)$/)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8').split('\n').slice(0, 80).join('\n');
                const prompt = `You are a smart code assistant. Explain what this file does in simple terms in about 3–4 lines. ${entry.name}\n\n${content}`;
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

        if (entry.isDirectory()) {
            await collectAndSummarizeFiles(fullPath, fileSummaries, folderSummaries, currentDepth + 1, maxDepth);
        }
    }
}

export async function callOllama(prompt: string): Promise<string> {
    const response = await fetch(ollamaURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama failed: ${errorText}`);
    }

    const data = await response.json() as { response: string };
    return data.response.trim();
}

async function sendProjectToBackend(projectData: any): Promise<void> {
  try {
    // Debug: Log what we're sending
    console.log('Sending project data:', JSON.stringify(projectData, null, 2));
    
    const response = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Backend response:', result);
      vscode.window.showInformationMessage('Project summary sent to Chronicle app!');
    } else {
      const errorText = await response.text();
      console.error('Failed to send project to backend:', response.status, errorText);
    }
  } catch (error) {
    console.error('Error sending project to backend:', error);
  }
}

