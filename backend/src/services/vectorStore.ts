import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama'; // Use community version
import { Document } from '@langchain/core/documents';
import { ActivityEvent } from './systemMonitor';

export class VectorStore {
  private chroma: Chroma | null = null;
  private embeddings: OllamaEmbeddings;
  private collectionName = 'chronicle_activities';

  constructor() {
    // Use the community version which is more stable with ChromaDB
    this.embeddings = new OllamaEmbeddings({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Ollama server not running');
      }

      this.chroma = new Chroma(this.embeddings, {
        url: 'http://localhost:8000',
        collectionName: this.collectionName,
      });
      console.log('Vector store initialized');
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  async storeActivityEvent(event: ActivityEvent): Promise<void> {
    if (!this.chroma) await this.initialize();

    const document = new Document({
      pageContent: this.eventToText(event),
      metadata: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        category: event.category,
        data: JSON.stringify(event.data),
      },
    });

    try {
      await this.chroma!.addDocuments([document], { ids: [event.id] });
    } catch (error) {
      console.error('Failed to store event:', error);
    }
  }

  async searchSimilarActivities(query: string, limit: number = 5): Promise<any[]> {
    if (!this.chroma) await this.initialize();
    
    try {
      const results = await this.chroma!.similaritySearch(query, limit);
      return results;
    } catch (error) {
      console.error('Failed to search activities:', error);
      return [];
    }
  }

  private eventToText(event: ActivityEvent): string {
    const timestamp = new Date(event.timestamp).toLocaleString();
    switch (event.type) {
      case 'app_opened':
        return `At ${timestamp}, opened application ${event.data.appName}`;
      case 'app_closed':
        return `At ${timestamp}, closed application ${event.data.appName}`;
      case 'file_changed':
        return `At ${timestamp}, ${event.data.action} file ${event.data.fileName} in ${event.data.directory}`;
      case 'terminal_command':
        return `At ${timestamp}, executed command: ${event.data.command} in ${event.data.shell}`;
      case 'browser_search':
        return `At ${timestamp}, browser activity: ${event.data.action} on ${event.data.url}`;
      case 'vscode_action':
        return `At ${timestamp}, VS Code: ${event.data.action} file ${event.data.file} in project ${event.data.project}`;
      default:
        return `At ${timestamp}, ${event.type}: ${JSON.stringify(event.data)}`;
    }
  }
}
