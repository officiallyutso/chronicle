import { ChatOllama } from '@langchain/ollama';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Tool } from '@langchain/core/tools';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { VectorStore } from './vectorStore';
import { ActivityEvent } from './systemMonitor';

export class ConversationMemoryTool extends Tool {
  name = 'conversation_memory';
  description = 'Access conversation history and context';
  
  constructor(private memory: BufferMemory) {
    super();
  }

  async _call(input: string): Promise<string> {
    const history = await this.memory.chatHistory.getMessages();
    return JSON.stringify(history.slice(-6));
  }
}

export class ActivityAnalysisTool extends Tool {
  name = 'activity_analysis';
  description = 'Analyze and search through user activity data';

  constructor(private vectorStore: VectorStore) {
    super();
  }

  async _call(input: string): Promise<string> {
    const events = await this.vectorStore.searchSimilarActivities(input, 50);
    const analysis = this.analyzeEvents(events);
    return JSON.stringify(analysis);
  }

  private analyzeEvents(events: any[]): any {
    const grouped = {
      apps: new Map<string, { duration: number, sessions: number, lastUsed: number }>(),
      terminals: [] as any[],
      files: [] as any[],
      browsers: [] as any[],
      timeSpent: new Map<string, number>()
    };

    events.forEach(doc => {
      try {
        const metadata = doc.metadata;
        const data = JSON.parse(metadata.data);
        const timestamp = metadata.timestamp;

        switch (metadata.type) {
          case 'app_opened':
            const appName = data.appName;
            if (!grouped.apps.has(appName)) {
              grouped.apps.set(appName, { duration: 0, sessions: 0, lastUsed: timestamp });
            }
            const appData = grouped.apps.get(appName)!;
            appData.sessions++;
            appData.lastUsed = Math.max(appData.lastUsed, timestamp);
            break;

          case 'terminal_command':
            grouped.terminals.push({
              command: data.command,
              shell: data.shell,
              timestamp,
              project: data.projectName || 'unknown',
              workingDirectory: data.workingDirectory || 'unknown'
            });
            break;

          case 'file_changed':
            grouped.files.push({
              fileName: data.fileName,
              action: data.action,
              directory: data.directory,
              timestamp
            });
            break;

          case 'browser_search':
            grouped.browsers.push({
              url: data.url,
              title: data.title,
              action: data.action,
              timestamp
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    });

    return {
      totalEvents: events.length,
      applications: Object.fromEntries(grouped.apps),
      terminalCommands: grouped.terminals,
      fileChanges: grouped.files,
      browserActivity: grouped.browsers,
      summary: this.generateSummary(grouped)
    };
  }

  private generateSummary(grouped: any): string {
    const appCount = grouped.apps.size;
    const terminalCount = grouped.terminals.length;
    const fileCount = grouped.files.length;
    
    return `Found ${appCount} applications, ${terminalCount} terminal commands, and ${fileCount} file changes`;
  }
}

export class EnhancedAgentService {
  private llm: ChatOllama;
  private vectorStore: VectorStore;
  private memory: BufferMemory;
  private conversationChain!: ConversationChain;
  private activityTool: ActivityAnalysisTool;
  private memoryTool: ConversationMemoryTool;

  constructor(vectorStore: VectorStore) {
    this.llm = new ChatOllama({
      model: 'llama3', // Keep llama3
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
    });
    
    this.vectorStore = vectorStore;
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history'
    });
    
    this.activityTool = new ActivityAnalysisTool(vectorStore);
    this.memoryTool = new ConversationMemoryTool(this.memory);
    
    this.setupConversationChain();
  }

  private setupConversationChain(): void {
    // Fixed prompt - escape all curly braces that aren't template variables
    const prompt = ChatPromptTemplate.fromTemplate(`
You are Chronicle AI, an intelligent assistant specialized in analyzing user activity data from the Chronicle system.

ACTIVITY DATA STRUCTURE REFERENCE:
You have access to comprehensive activity data with the following exact structure and types:

1. APPLICATION EVENTS (type: "app_opened", "app_closed"):
   - Contains appName and platform information
   - Examples: VS Code, Chrome, Discord, Slack, Terminal, PowerShell
   - Use for: "How long was I on [app]?", "What apps did I use?", "When did I open [app]?"

2. FILE CHANGE EVENTS (type: "file_changed"):
   - Contains action, fileName, directory, extension, fullPath
   - Examples: modified App.tsx in /src directory
   - Use for: "What files did I edit?", "Show me my coding activity", "Which project files changed?"

3. TERMINAL COMMANDS (type: "terminal_command"):
   - Contains command, shell, timestamp, platform, projectName, workingDirectory
   - Examples: npm install, git commit, python script.py
   - Use for: "What commands did I run?", "Show me git commands", "What npm packages did I install?"

4. BROWSER ACTIVITY (type: "browser_search"):
   - Contains url, title, action
   - Examples: visited github.com, searched on google.com
   - Use for: "What websites did I visit?", "How long was I browsing?", "What did I search for?"

5. VS CODE ACTIONS (type: "vscode_action"):
   - Contains action, file, project
   - Use for: "What did I code in VS Code?", "Which project was I working on?"

6. SYSTEM METRICS (type: "system_active"):
   - Contains platform, uptime, memory info, CPU count
   - Use for: "How long was my system running?", "What are my system specs?"

QUERY INTERPRETATION GUIDE:
- "How long on [app]" → Find app_opened/app_closed pairs, calculate duration
- "What commands" → Filter terminal_command events, extract command field
- "What files edited" → Filter file_changed events where action="modified"
- "Browser activity" → Filter browser_search events, look at url and action
- "Coding activity" → Combine file_changed + vscode_action + terminal_command events
- "Time spent coding" → Calculate duration between first and last coding-related events
- "Project work" → Group by projectName or directory paths

Current conversation context: {history}

User question: {input}

INSTRUCTIONS FOR THIS RESPONSE:
1. Analyze what specific data the user is asking about
2. Search through the activity data for relevant information
3. Parse the data for relevant events
4. Provide specific, data-backed answers with timestamps and details
5. Calculate durations/counts when relevant
6. Reference actual file names, app names, commands, etc.
7. If no relevant data found, explicitly state what you couldn't find

Answer based on the actual activity data:
`);

    this.conversationChain = new ConversationChain({
      llm: this.llm,
      memory: this.memory,
      prompt: prompt
    });
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const models: unknown = await response.json();
      let hasLlama3 = false;
      
      if (
        typeof models === 'object' &&
        models !== null &&
        'models' in models &&
        Array.isArray((models as any).models)
      ) {
        hasLlama3 = (models as any).models.some((model: any) =>
          typeof model === 'object' &&
          model !== null &&
          'name' in model &&
          typeof model.name === 'string' &&
          model.name.includes('llama3')
        );
      }

      if (!hasLlama3) {
        console.warn('Llama3 model not found. Run: ollama pull llama3');
      }

      console.log('Enhanced agent service initialized with Llama 3');
    } catch (error) {
      console.error('Cannot connect to Ollama');
      throw error;
    }
  }

  async processConversationalQuery(query: string): Promise<{ output: string; analysis?: any }> {
    try {
      // First, get relevant activity data
      const activityAnalysis = await this.activityTool._call(query);
      const parsedAnalysis = JSON.parse(activityAnalysis);

      // Create enhanced query with activity context
      const enhancedQuery = `
Based on the following activity data: ${activityAnalysis}

User question: ${query}

Please provide a comprehensive answer using the activity data. Be specific about times, applications, commands, and patterns you observe.
`;

      const response = await this.conversationChain.call({
        input: enhancedQuery
      });

      return {
        output: response.response,
        analysis: parsedAnalysis
      };
    } catch (error) {
      console.error('Conversational query error:', error);
      return {
        output: 'I apologize, but I encountered an error processing your request. Please make sure Ollama is running with the llama3 model.'
      };
    }
  }

  async getChatHistory(): Promise<any[]> {
    const messages = await this.memory.chatHistory.getMessages();
    return messages;
  }

  async clearChatHistory(): Promise<void> {
    await this.memory.clear();
  }
}
