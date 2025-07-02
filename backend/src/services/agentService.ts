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
    const events = await this.vectorStore.searchSimilarActivities(input, 30);
    
    // Group and analyze events
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
      model: 'llama2',
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
You are Chronicle AI, an intelligent assistant that helps users understand their digital activity patterns.

You have access to detailed activity data including:
- Applications used and time spent
- Terminal commands executed
- Files modified
- Browser activity and searches
- System metrics

Current conversation context: {history}

User question: {input}

Instructions:
1. First, analyze what the user is asking about
2. Search through their activity data for relevant information
3. Provide specific, data-driven answers
4. Reference actual timestamps, durations, and specific activities when possible
5. If asking about time spent, calculate and sum up relevant activities
6. For terminal commands, group by project context when relevant
7. Be conversational but precise

Answer:
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
        output: 'I apologize, but I encountered an error processing your request. Please make sure Ollama is running with the llama2 model.'
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
