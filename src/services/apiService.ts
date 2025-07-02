import { ActivityEvent, ActivityType } from './types';

export interface ApiStats {
  total: number;
  applications: number;
  filesModified: number;
  terminalCommands: number;
  sessionDuration: number;
  isTracking: boolean;
}

export class ApiService {
  protected baseUrl: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private eventCallbacks: ((event: ActivityEvent) => void)[] = [];

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.connectWebSocket();
  }

  // WebSocket connection for real-time events
  private connectWebSocket(): void {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to Chronicle backend');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'INITIAL_EVENTS') {
            // Handle initial events if needed
            console.log('Received initial events:', message.data.length);
          } else if (message.type === 'NEW_EVENT') {
            // Broadcast new event to all listeners
            this.eventCallbacks.forEach(callback => callback(message.data));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connectWebSocket();
      }, this.reconnectInterval);
    }
  }

  // Event subscription
  public onEvent(callback: (event: ActivityEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  // API Methods
  public async getEvents(options?: {
    type?: ActivityType;
    limit?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<ActivityEvent[]> {
    try {
      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.startTime) params.append('startTime', options.startTime.toString());
      if (options?.endTime) params.append('endTime', options.endTime.toString());

      const response = await fetch(`${this.baseUrl}/api/events?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  }

  public async getStats(): Promise<ApiStats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return {
        total: 0,
        applications: 0,
        filesModified: 0,
        terminalCommands: 0,
        sessionDuration: 0,
        isTracking: false
      };
    }
  }

  public async startTracking(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tracking/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      return false;
    }
  }

  public async stopTracking(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tracking/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      return false;
    }
  }

  public async clearEvents(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/events`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to clear events:', error);
      return false;
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  // Cleanup
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}