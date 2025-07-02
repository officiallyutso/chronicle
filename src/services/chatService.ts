import { AgentApiService } from './agentApiService';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  analysis?: any;
}

export interface ChatResponse {
  output: string;
  analysis?: any;
}

export class ChatService extends AgentApiService {
  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to send chat message:', error);
      return { output: 'Sorry, I encountered an error processing your message.' };
    }
  }

  async getChatHistory(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/chat/history`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  async clearChatHistory(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/chat/history`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      return false;
    }
  }
}
