export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: ActivityType;
  data: any;
  category: string;
}

export enum ActivityType {
  APP_OPENED = 'app_opened',
  APP_CLOSED = 'app_closed',
  TERMINAL_COMMAND = 'terminal_command',
  FILE_CHANGED = 'file_changed',
  BROWSER_SEARCH = 'browser_search',
  VSCODE_ACTION = 'vscode_action',
  SYSTEM_IDLE = 'system_idle',
  SYSTEM_ACTIVE = 'system_active'
}

export class SystemTracker {
  private isTracking = false;
  private events: ActivityEvent[] = [];
  private intervalId: number | null = null;
  private callbacks: ((event: ActivityEvent) => void)[] = [];

  constructor() {
    console.log('Browser-compatible SystemTracker initialized');
  }

  public startTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    console.log('Chronicle tracking started (Browser Mode)');
    
    // Simulate some activity events for demonstration
    this.intervalId = window.setInterval(() => {
      this.simulateActivity();
    }, 5000); // Every 5 seconds

    // Track browser-specific events
    this.trackBrowserEvents();
  }

  public stopTracking(): void {
    this.isTracking = false;
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Chronicle tracking stopped');
  }

  public onEvent(callback: (event: ActivityEvent) => void): void {
    this.callbacks.push(callback);
  }

  private emitEvent(event: ActivityEvent): void {
    this.events.push(event);
    this.callbacks.forEach(callback => callback(event));
  }

  private simulateActivity(): void {
    const activities = [
      {
        type: ActivityType.APP_OPENED,
        data: { appName: 'VS Code', previousApp: 'Browser' },
        category: 'application'
      },
      {
        type: ActivityType.FILE_CHANGED,
        data: { 
          action: 'modified', 
          fileName: 'App.tsx', 
          extension: '.tsx',
          directory: '/src'
        },
        category: 'file_system'
      },
      {
        type: ActivityType.TERMINAL_COMMAND,
        data: { command: 'npm run dev', shell: 'bash' },
        category: 'terminal'
      },
      {
        type: ActivityType.BROWSER_SEARCH,
        data: { query: 'React TypeScript tutorial' },
        category: 'browser'
      }
    ];

    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    
    this.emitEvent({
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: randomActivity.type,
      data: randomActivity.data,
      category: randomActivity.category
    });
  }

  private trackBrowserEvents(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.emitEvent({
        id: `vis_${Date.now()}`,
        timestamp: Date.now(),
        type: document.hidden ? ActivityType.SYSTEM_IDLE : ActivityType.SYSTEM_ACTIVE,
        data: { visible: !document.hidden },
        category: 'system'
      });
    });

    // Track clicks (simplified activity tracking)
    let clickCount = 0;
    document.addEventListener('click', () => {
      clickCount++;
      if (clickCount % 10 === 0) { // Every 10 clicks
        this.emitEvent({
          id: `click_${Date.now()}`,
          timestamp: Date.now(),
          type: ActivityType.BROWSER_SEARCH,
          data: { query: `User interaction #${clickCount}` },
          category: 'browser'
        });
      }
    });

    // Track keyboard activity (simplified)
    let keyCount = 0;
    document.addEventListener('keydown', () => {
      keyCount++;
      if (keyCount % 50 === 0) { // Every 50 keystrokes
        this.emitEvent({
          id: `key_${Date.now()}`,
          timestamp: Date.now(),
          type: ActivityType.FILE_CHANGED,
          data: { 
            action: 'typing', 
            fileName: 'document.tsx',
            extension: '.tsx',
            directory: '/browser'
          },
          category: 'file_system'
        });
      }
    });
  }

  public getEvents(): ActivityEvent[] {
    return [...this.events];
  }

  public getEventsByType(type: ActivityType): ActivityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  public getEventsByTimeRange(startTime: number, endTime: number): ActivityEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  public exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
}