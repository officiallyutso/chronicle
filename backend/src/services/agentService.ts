import { ChatOllama } from '@langchain/ollama';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Tool } from '@langchain/core/tools';
import { VectorStore } from './vectorStore';
import { ActivityEvent } from './systemMonitor';

export class PatternAnalysisTool extends Tool {
  name = 'pattern_analysis';
  description = 'Analyze activity patterns and productivity trends';
  
  constructor(private vectorStore: VectorStore) {
    super();
  }

  async _call(input: string): Promise<string> {
    const events = await this.vectorStore.searchSimilarActivities(input, 20);
    
    const appUsage = new Map<string, number>();
    const timeDistribution = new Array(24).fill(0);
    
    events.forEach(doc => {
      try {
        const metadata = doc.metadata;
        const data = JSON.parse(metadata.data);
        const hour = new Date(metadata.timestamp).getHours();
        timeDistribution[hour]++;
        
        if (metadata.type === 'app_opened') {
          appUsage.set(data.appName, (appUsage.get(data.appName) || 0) + 1);
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    });

    const mostActiveHour = timeDistribution.indexOf(Math.max(...timeDistribution));
    const topApps = Array.from(appUsage.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return JSON.stringify({
      totalEvents: events.length,
      mostActiveHour,
      topApplications: topApps,
      timeDistribution
    });
  }
}

export class AgentService {
  private llm: ChatOllama;
  private vectorStore: VectorStore;
  private patternTool: PatternAnalysisTool;

  constructor(vectorStore: VectorStore) {
    this.llm = new ChatOllama({
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
    });
    
    this.vectorStore = vectorStore;
    this.patternTool = new PatternAnalysisTool(vectorStore);
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const models: unknown = await response.json();
      
      let hasLlama2 = false;
      if (
        typeof models === 'object' && 
        models !== null && 
        'models' in models &&
        Array.isArray((models as any).models)
      ) {
        hasLlama2 = (models as any).models.some((model: any) => 
          typeof model === 'object' && 
          model !== null && 
          'name' in model && 
          typeof model.name === 'string' && 
          model.name.includes('llama2')
        );
      }
      
      if (!hasLlama2) {
        console.warn('Llama2 model not found. Run: ollama pull llama2');
      }
      
      console.log('Agent service initialized');
    } catch (error) {
      console.error('Cannot connect to Ollama');
      throw error;
    }
  }

  async processQuery(query: string): Promise<{ output: string }> {
    try {
      // Check if query needs pattern analysis
      if (this.needsPatternAnalysis(query)) {
        const patternData = await this.patternTool._call(query);
        const analysisPrompt = `Based on this activity data: ${patternData}
        
User query: ${query}

Provide a helpful analysis and insights about the user's activity patterns. Be conversational and provide actionable recommendations.`;
        
        const response = await this.llm.invoke(analysisPrompt);
        return { output: response.content as string };
      } else {
        // Direct query to LLM
        const prompt = `You are Chronicle AI, a productivity assistant analyzing developer activities.
        
User query: ${query}

Provide helpful insights about productivity, development workflows, or general assistance.`;
        
        const response = await this.llm.invoke(prompt);
        return { output: response.content as string };
      }
    } catch (error) {
      console.error('Agent error:', error);
      return { output: 'I apologize, but I encountered an error processing your request. Please make sure Ollama is running with the llama2 model.' };
    }
  }

  private needsPatternAnalysis(query: string): boolean {
    const patternKeywords = [
      'activity', 'pattern', 'productivity', 'analysis', 'apps', 'applications',
      'files', 'terminal', 'commands', 'usage', 'time', 'hours', 'working',
      'coding', 'development', 'session', 'statistics', 'stats', 'summary'
    ];
    
    const queryLower = query.toLowerCase();
    return patternKeywords.some(keyword => queryLower.includes(keyword));
  }

  async generateNarrative(events: ActivityEvent[], style: any): Promise<string> {
    const eventSummary = events.slice(-20).map(e => 
      `${e.type}: ${JSON.stringify(e.data)}`
    ).join('\n');

    const prompt = `Generate a ${style.tone} ${style.format} narrative based on these recent development activities:

${eventSummary}

Create an engaging story that highlights the developer's journey, accomplishments, and work patterns. Make it ${style.tone} in tone and format it as a ${style.format}.`;
    
    try {
      const response = await this.llm.invoke(prompt);
      return response.content as string;
    } catch (error) {
      console.error('Narrative generation error:', error);
      return 'Unable to generate narrative. Please ensure Ollama is running with the llama2 model.';
    }
  }
}
