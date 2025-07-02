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
    return JSON.stringify(history.slice(-6)); // Last 3 exchanges (6 messages)
  }
}

export class ActivityAnalysisTool extends Tool {
  name = 'activity_analysis';
  description = 'Analyze and search through user activity data';

  constructor(private vectorStore: VectorStore) {
    super();
  }

  async _call(input: string): Promise<string> {
    // Search more broadly for relevant activities
    const events = await this.vectorStore.searchSimilarActivities(input, 50); // Increased from 30
    
    const analysis = this.analyzeEvents(events);
    return JSON.stringify({
        ...analysis,
        searchQuery: input,
        totalEventsSearched: events.length
    });
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
              project: this.extractProject(data.command)
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

  private extractProject(command: string): string {
    // Extract project context from command
    if (command.includes('cd ')) {
      const match = command.match(/cd\s+([^\s]+)/);
      return match ? match[1] : 'unknown';
    }
    return 'current';
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
  private conversationChain!: ConversationChain; // Add ! here
  private activityTool: ActivityAnalysisTool;
  private memoryTool: ConversationMemoryTool;

  constructor(vectorStore: VectorStore) {
    this.llm = new ChatOllama({
      model: 'llama3',
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
  const prompt = ChatPromptTemplate.fromTemplate(`
You are Chronicle AI, an intelligent assistant specialized in analyzing user activity data from the Chronicle system.

ACTIVITY DATA STRUCTURE REFERENCE:
You have access to comprehensive activity data with the following exact structure and types:

1. APPLICATION EVENTS (type: "app_opened", "app_closed"):
   - metadata.data contains: {"appName": "string", "platform": "win32|darwin|linux"}
   - Examples: VS Code, Chrome, Discord, Slack, Terminal, PowerShell
   - Use for: "How long was I on [app]?", "What apps did I use?", "When did I open [app]?"
   - Duration calculation: Find app_opened and app_closed pairs for the same appName

2. FILE CHANGE EVENTS (type: "file_changed"):
   - metadata.data contains: {"action": "modified|created|deleted", "fileName": "string", "directory": "string", "extension": "string", "fullPath": "string"}
   - Examples: {"fileName": "App.tsx", "action": "modified", "directory": "/src", "extension": ".tsx"}
   - Use for: "What files did I edit?", "Show me my coding activity", "Which project files changed?"

3. TERMINAL COMMANDS (type: "terminal_command"):
   - metadata.data contains: {"command": "string", "shell": "bash|powershell|cmd|zsh", "timestamp": number, "platform": "string", "originalCommand": "string"}
   - Examples: {"command": "npm install", "shell": "powershell"}, {"command": "git commit -m 'fix bug'", "shell": "bash"}
   - Use for: "What commands did I run?", "Show me git commands", "What npm packages did I install?"

4. BROWSER ACTIVITY (type: "browser_search"):
   - metadata.data contains: {"url": "string", "title": "string", "action": "visited|searched|focused"}
   - Examples: {"url": "github.com", "action": "visited"}, {"url": "google.com", "action": "searched"}
   - Use for: "What websites did I visit?", "How long was I browsing?", "What did I search for?"

5. VS CODE ACTIONS (type: "vscode_action"):
   - metadata.data contains: {"action": "file_opened|file_saved|project_opened", "file": "string", "project": "string"}
   - Use for: "What did I code in VS Code?", "Which project was I working on?"

6. SYSTEM METRICS (type: "system_active"):
   - metadata.data contains: {"platform": "string", "uptime": number, "totalMemory": number, "freeMemory": number, "cpuCount": number}
   - Use for: "How long was my system running?", "What are my system specs?"

DATA ACCESS PATTERNS:
- All events have: id, timestamp (Unix milliseconds), type, category, metadata
- metadata.timestamp = event timestamp in Unix milliseconds
- metadata.data = JSON string containing the actual event data
- Convert timestamp using: new Date(timestamp).toLocaleString()
- For duration calculations: (endTimestamp - startTimestamp) / 1000 / 60 = minutes

QUERY INTERPRETATION GUIDE:
- "How long on [app]" → Find app_opened/app_closed pairs, calculate duration
- "What commands" → Filter terminal_command events, extract metadata.data.command
- "What files edited" → Filter file_changed events where action="modified"
- "Browser activity" → Filter browser_search events, look at url and action
- "Coding activity" → Combine file_changed + vscode_action + terminal_command events
- "Time spent coding" → Calculate duration between first and last coding-related events
- "Project work" → Group by directory paths in file_changed events

RESPONSE REQUIREMENTS:
1. Always search the activity data first using the ActivityAnalysisTool
2. Parse the JSON data from metadata.data field for each relevant event
3. Provide specific timestamps, file names, command names, app names
4. Calculate actual durations when asked about time (in minutes/hours)
5. Group related activities (e.g., all git commands, all files in a project)
6. If no relevant data found, explicitly state "I couldn't find any [specific activity] in your data"
7. Always reference actual data points, not generic responses

CALCULATION EXAMPLES:
- App usage time: Find all app_opened events for the app, look for corresponding app_closed events
- Coding session duration: Time between first and last file_changed/terminal_command/vscode_action
- Most used app: Count app_opened events by appName
- Project identification: Group file_changed events by directory path

Current conversation context: {history}

User question: {input}

INSTRUCTIONS FOR THIS RESPONSE:
1. Analyze what specific data the user is asking about
2. Search through the activity data using the exact structure described above
3. Parse the metadata.data JSON for relevant events
4. Provide specific, data-backed answers with timestamps and details
5. Calculate durations/counts when relevant
6. Reference actual file names, app names, commands, etc.

Answer based on the actual activity data structure:
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
      if (!response.ok) {
        throw new Error('Ollama server not running');
      }
      console.log('Enhanced agent service initialized');
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

      // Create enhanced prompt with activity context
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
