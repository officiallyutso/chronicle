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

  async searchSimilarActivities(query: string, limit = 5): Promise<any[]> {
    if (!this.chroma) await this.initialize();

    const vector = await this.embeddings.embedQuery(query); // 1D number[]

    const collection = (this.chroma as any).collection;

    if (!collection || typeof collection.query !== 'function') {
      throw new Error('Chroma collection is not initialized properly.');
    }

    const results = await collection.query({
      queryEmbeddings: [vector], // Must be 2D
      nResults: limit,
      include: ['documents', 'metadatas', 'distances'],
    });

    return results.documents[0].map((doc: string, i: number) => ({
      pageContent: doc,
      metadata: results.metadatas?.[0]?.[i],
      score: results.distances?.[0]?.[i],
    }));
  }

  async storeProjectSummary(projectData: any): Promise<void> {
  if (!this.chroma) await this.initialize();
  
  const document = new Document({
    pageContent: this.projectToText(projectData),
    metadata: {
      id: projectData.id,
      type: 'project_summary',
      name: projectData.name,
      createdAt: projectData.createdAt,
      updatedAt: projectData.updatedAt,
      projectData: JSON.stringify(projectData)
    }
  });

  try {
    await this.chroma!.addDocuments([document], { ids: [projectData.id] });
    console.log(`Project summary stored: ${projectData.name}`);
  } catch (error) {
    console.error('Failed to store project summary:', error);
  }
}

async getProject(id: string): Promise<any | null> {
  if (!this.chroma) await this.initialize();
  
  try {
    const collection = (this.chroma as any).collection;
    
    // Fix: Use $and operator for compound where clauses
    const results = await collection.get({
      where: {
        "$and": [
          { "id": id },
          { "type": "project_summary" }
        ]
      },
      include: ['metadatas']
    });

    console.log(`Getting project ${id}:`, results);

    if (!results.metadatas || results.metadatas.length === 0) {
      console.log(`Project ${id} not found`);
      return null;
    }
    
    const projectData = JSON.parse(results.metadatas[0].projectData);
    return projectData;
  } catch (error) {
    console.error('Failed to get project:', error);
    return null;
  }
}

async getAllProjects(): Promise<any[]> {
  if (!this.chroma) await this.initialize();
  
  try {
    const collection = (this.chroma as any).collection;
    
    // Fix: Use proper where clause syntax
    const results = await collection.get({
      where: { "type": { "$eq": "project_summary" } },
      include: ['metadatas']
    });

    console.log('Raw ChromaDB results:', results);
    
    if (!results.metadatas || results.metadatas.length === 0) {
      console.log('No project summaries found in ChromaDB');
      return [];
    }

    return results.metadatas.map((metadata: any) => ({
      id: metadata.id,
      name: metadata.name,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    }));
  } catch (error) {
    console.error('Failed to get all projects:', error);
    return [];
  }
}

private projectToText(projectData: any): string {
  return `Project: ${projectData.name}\n\nSummary: ${projectData.projectSummary}\n\nFiles: ${projectData.fileSummaries.length} files summarized`;
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
        // ENHANCED: Handle all browser extension data types
        if (event.data.searchQuery && event.data.searchEngine) {
          return `At ${timestamp}, searched for "${event.data.searchQuery}" on ${event.data.searchEngine}`;
        } else if (event.data.action === 'search_result_clicked') {
          return `At ${timestamp}, clicked search result: ${event.data.title} (${event.data.url})`;
        } else if (event.data.action === 'website_opened') {
          return `At ${timestamp}, visited website ${event.data.url} - ${event.data.title}`;
        } else if (event.data.action === 'tab_focused') {
          return `At ${timestamp}, focused on tab: ${event.data.title} (${event.data.domain})`;
        } else if (event.data.action === 'website_closed') {
          return `At ${timestamp}, closed website ${event.data.url} after ${Math.round((event.data.sessionDuration || 0) / 1000)}s`;
        } else {
          return `At ${timestamp}, browser activity: ${event.data.action} on ${event.data.url || event.data.domain}`;
        }
      case 'vscode_action':
        return `At ${timestamp}, VS Code: ${event.data.action} file ${event.data.file} in project ${event.data.project}`;
      default:
        return `At ${timestamp}, ${event.type}: ${JSON.stringify(event.data)}`;
    }
  }
}
