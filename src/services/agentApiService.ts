import { ApiService } from './apiService';

export interface AgentResponse {
  output: string;
}

export class AgentApiService extends ApiService {
  public async queryAgent(query: string): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to query agent:', error);
      return { output: 'Sorry, I encountered an error.' };
    }
  }

  public async generateIntelligentNarrative(style: any): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return result.narrative;
    } catch (error) {
      console.error('Failed to generate narrative:', error);
      return 'Unable to generate narrative at this time.';
    }
  }

  public async searchActivities(query: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/ai/search?query=${encodeURIComponent(query)}&limit=${limit}`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to search activities:', error);
      return [];
    }
  }
}
